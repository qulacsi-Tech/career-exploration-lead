#!/usr/bin/env bash
# Deploys one environment on this server. Called by ci-entry.sh when the GitHub Actions deploy job
# (after CI has passed) connects over SSH:
#
#   deploy.sh <prod|dev> <full 40-character commit sha>
#
# What it does, in order:
#   1. waits its turn (one deploy at a time, so two builds never fight over memory)
#   2. moves the environment's checkout to exactly that commit
#   3. builds the backend if backend/ changed, applies database migrations, restarts the API
#   4. (prod only) starts or reloads Caddy, the front door for both domains
#   5. builds the website if frontend/ changed, restarts it
#   6. checks that the API and the website answer
# If any step fails it puts the previous commit back and rebuilds it, so the running site stays up.
# A migration that already ran is not reversed on rollback (see docs/cicd-and-environments.md).
#
# The script updates itself with git, so it runs in two phases: phase 1 checks out the new commit
# and then starts the freshly checked-out copy of this file as phase 2. The bodies live in
# functions so that replacing the file while bash is reading it cannot corrupt the run.

phase1() {
  set -uo pipefail
  # shellcheck source=env.sh
  . "$(dirname "${BASH_SOURCE[0]}")/env.sh"
  select_env "${1:-}" || return 2
  local TARGET="${2:-}"
  if ! [[ "$TARGET" =~ ^[0-9a-f]{40}$ ]]; then
    echo "need a full 40-character commit sha, got '$TARGET'" >&2
    return 2
  fi

  # One deploy at a time across both environments. Waits instead of skipping, because every
  # push should be deployed. The lock (fd 9) stays held through the exec below.
  exec 9>/tmp/career-deploy.lock
  echo "waiting for any other deploy to finish..."
  flock -w 3600 9 || { echo "gave up waiting for the lock"; return 1; }

  cd "$REPO" || { echo "no checkout at $REPO"; return 1; }
  git fetch --quiet origin "$BRANCH" || { echo "git fetch failed"; return 1; }
  git cat-file -e "$TARGET^{commit}" 2>/dev/null || { echo "commit $TARGET is not in the repository"; return 1; }
  if ! git merge-base --is-ancestor "$TARGET" "origin/$BRANCH"; then
    echo "$TARGET is not on origin/$BRANCH; refusing to deploy it"
    return 1
  fi

  local OLD=""
  [ -f deploy/.deployed-sha ] && OLD=$(tr -d '[:space:]' < deploy/.deployed-sha)

  git checkout -q --force -B "$BRANCH" "$TARGET" || return 1
  echo "$APP_ENV: ${OLD:0:7} -> ${TARGET:0:7}"

  DEPLOY_PHASE2=1 DEPLOY_OLD="$OLD" exec bash "$REPO/deploy/deploy.sh" "$APP_ENV" "$TARGET"
}

phase2() {
  set -uo pipefail
  . "$(dirname "${BASH_SOURCE[0]}")/env.sh"
  select_env "${1:-}" || return 2
  local TARGET="$2" OLD="${DEPLOY_OLD:-}"
  local PROD_DEPLOY=/opt/career-platform/deploy

  cd "$REPO/deploy" || return 1
  local STATUS="$REPO/deploy/last-deploy.txt"
  local COMPOSE="docker compose -p $PROJECT -f docker-compose.app.yml --env-file .env"
  local EDGE="docker compose -p career-edge -f $PROD_DEPLOY/docker-compose.edge.yml --env-file $PROD_DEPLOY/.env"

  for f in .env backend.env; do
    [ -f "$f" ] || { echo "missing $REPO/deploy/$f (see docs/cicd-and-environments.md)"; return 1; }
  done

  # The shared network Caddy uses to reach both environments.
  docker network inspect career-edge >/dev/null 2>&1 || docker network create career-edge >/dev/null

  # Build only what changed. With no known previous commit, or no container yet, build both.
  local BUILD_BACKEND=0 BUILD_FRONTEND=0 CHANGED=""
  if [ -n "$OLD" ] && git cat-file -e "$OLD^{commit}" 2>/dev/null; then
    CHANGED=$(git diff --name-only "$OLD" "$TARGET")
    grep -qE '^(backend/|deploy/docker-compose\.app\.yml)' <<<"$CHANGED" && BUILD_BACKEND=1
    grep -qE '^(frontend/|deploy/docker-compose\.app\.yml)' <<<"$CHANGED" && BUILD_FRONTEND=1
  else
    BUILD_BACKEND=1; BUILD_FRONTEND=1
  fi
  [ -z "$($COMPOSE ps -q -a backend 2>/dev/null)" ] && BUILD_BACKEND=1
  [ -z "$($COMPOSE ps -q -a frontend 2>/dev/null)" ] && BUILD_FRONTEND=1
  echo "build backend=$BUILD_BACKEND frontend=$BUILD_FRONTEND"

  rollback() {
    echo "ROLLBACK to ${OLD:0:7}: $1"
    printf '%s  %s  %s  FAILED (%s)\n' "$(date -u +%FT%TZ)" "$APP_ENV" "${TARGET:0:7}" "$1" > "$STATUS"
    if [ -n "$OLD" ] && git cat-file -e "$OLD^{commit}" 2>/dev/null; then
      git checkout -q --force -B "$BRANCH" "$OLD" || true
      [ "$BUILD_BACKEND" = 1 ] && { $COMPOSE build backend || true; }
      [ "$BUILD_FRONTEND" = 1 ] && { $COMPOSE build frontend || true; }
      $COMPOSE up -d --remove-orphans || true
      printf '%s  %s  %s  FAILED (%s), rolled back to %s\n' "$(date -u +%FT%TZ)" "$APP_ENV" "${TARGET:0:7}" "$1" "${OLD:0:7}" > "$STATUS"
    else
      echo "no previous version recorded; nothing to roll back to"
    fi
    return 1
  }

  wait_for() {  # wait_for <description> <command...>
    local what="$1" i; shift
    for i in $(seq 1 45); do
      if "$@" >/dev/null 2>&1; then echo "$what is up (check $i)"; return 0; fi
      sleep 2
    done
    return 1
  }

  # ── API ────────────────────────────────────────────────────────────────────
  if [ "$BUILD_BACKEND" = 1 ]; then
    echo "== building backend"
    $COMPOSE build backend || { rollback "backend build failed"; return 1; }
  fi

  echo "== database"
  $COMPOSE up -d db || { rollback "database failed to start"; return 1; }
  echo "== migrations"
  $COMPOSE run --rm backend alembic upgrade head || { rollback "migration failed"; return 1; }

  echo "== restarting API"
  $COMPOSE up -d --remove-orphans db backend || { rollback "API failed to start"; return 1; }
  wait_for "API" $COMPOSE exec -T backend python -c \
    "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/ping',timeout=3).status==200 else 1)" \
    || { rollback "API health check failed"; return 1; }

  # Create the admin from ADMIN_EMAIL / ADMIN_PASSWORD in backend.env. Idempotent: skipped if
  # unset, left unchanged if the account exists. Never fails a deploy.
  $COMPOSE exec -T backend python seed.py --admin-only || echo "admin seed failed (non-fatal)"

  # ── Front door (prod owns it) ──────────────────────────────────────────────
  if [ "$APP_ENV" = prod ]; then
    echo "== Caddy"
    $EDGE up -d || { rollback "Caddy failed to start"; return 1; }
    # Picks up a changed Caddyfile without dropping connections. Retried because Caddy's admin
    # endpoint needs a moment after a fresh start; an invalid file never gets applied.
    wait_for "Caddy config" $EDGE exec -T caddy caddy reload --config /etc/caddy/Caddyfile \
      || { rollback "Caddy rejected its configuration"; return 1; }
  elif [ -z "$(docker ps -q --filter name=career-edge-caddy)" ]; then
    echo "WARNING: Caddy is not running, so dev.<domain> is unreachable until the prod environment has been deployed once."
  fi

  # ── Website ────────────────────────────────────────────────────────────────
  # Built after the API is up: pages are prerendered from the API (through Caddy) during the build.
  if [ "$BUILD_FRONTEND" = 1 ]; then
    echo "== building website"
    $COMPOSE build frontend || { rollback "website build failed"; return 1; }
  fi
  echo "== restarting website"
  $COMPOSE up -d --remove-orphans frontend || { rollback "website failed to start"; return 1; }
  wait_for "website" $COMPOSE exec -T frontend wget -q -O /dev/null http://127.0.0.1:3000/ \
    || { rollback "website health check failed"; return 1; }

  echo "$TARGET" > .deployed-sha
  printf '%s  %s  %s  deployed\n' "$(date -u +%FT%TZ)" "$APP_ENV" "${TARGET:0:7}" > "$STATUS"
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --filter "until=72h" >/dev/null 2>&1 || true
  echo "DONE: $APP_ENV is running ${TARGET:0:7}"
  return 0
}

if [ "${DEPLOY_PHASE2:-}" = 1 ]; then
  phase2 "$@"
else
  phase1 "$@"
fi
exit $?
