#!/usr/bin/env bash
# Pull-based auto deploy for the EC2 host. Run every minute by career-deploy.timer.
#
# When origin/main has new commits it fast-forwards the checkout, and if anything
# under backend/ or deploy/ changed it: builds the new image, runs migrations,
# restarts the containers and checks /api/ping. If a step fails it puts the code
# back and rebuilds the previous version, so the running site stays up.
#
# Frontend-only changes are only pulled: the frontend is deployed by Vercel.
# A migration that already ran is not reversed on rollback (see docs).
#
# The body lives in a function so that updating this very file with git cannot
# change the script while bash is still reading it.

main() {
  set -uo pipefail

  local REPO="${REPO:-/opt/career-platform}"
  local COMPOSE="docker compose -f $REPO/deploy/docker-compose.prod.yml --env-file $REPO/deploy/.env"
  local STATUS="$REPO/deploy/last-deploy.txt"

  # One run at a time.
  exec 9>/tmp/career-deploy.lock
  flock -n 9 || return 0

  cd "$REPO" || return 1

  if ! git fetch --quiet origin main; then
    echo "git fetch failed; will retry"
    return 0
  fi

  local OLD NEW
  OLD=$(git rev-parse HEAD)
  NEW=$(git rev-parse origin/main)
  [ "$OLD" = "$NEW" ] && return 0

  if ! git merge-base --is-ancestor "$OLD" "$NEW"; then
    echo "server checkout has diverged from origin/main; not deploying"
    return 1
  fi

  local CHANGED
  CHANGED=$(git diff --name-only "$OLD" "$NEW")
  git merge --ff-only --quiet "$NEW" || return 1
  echo "pulled ${OLD:0:7} -> ${NEW:0:7}"

  if ! echo "$CHANGED" | grep -qE '^(backend/|deploy/)'; then
    echo "no backend or deploy changes; nothing to restart"
    printf '%s  %s  pulled only (frontend/docs)\n' "$(date -u +%FT%TZ)" "${NEW:0:7}" > "$STATUS"
    return 0
  fi

  rollback() {
    echo "ROLLBACK to ${OLD:0:7}: $1"
    git reset --hard --quiet "$OLD"
    $COMPOSE build backend || true
    $COMPOSE up -d db backend caddy || true
    printf '%s  %s  FAILED (%s), rolled back to %s\n' "$(date -u +%FT%TZ)" "${NEW:0:7}" "$1" "${OLD:0:7}" > "$STATUS"
  }

  echo "building backend"
  $COMPOSE build backend || { rollback "build failed"; return 1; }

  echo "running migrations"
  $COMPOSE run --rm backend alembic upgrade head || { rollback "migration failed"; return 1; }

  echo "restarting containers"
  $COMPOSE up -d db backend caddy || { rollback "restart failed"; return 1; }

  local i
  for i in $(seq 1 30); do
    if $COMPOSE exec -T backend python -c \
      "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/ping',timeout=3).status==200 else 1)" \
      >/dev/null 2>&1; then
      echo "healthy after ${i} check(s)"
      # Create the admin from ADMIN_EMAIL / ADMIN_PASSWORD in backend.env. Idempotent:
      # skipped if unset, left unchanged if the account exists. Never fails a deploy.
      $COMPOSE exec -T backend python seed.py --admin-only || echo "admin seed failed (non-fatal)"
      printf '%s  %s  deployed\n' "$(date -u +%FT%TZ)" "${NEW:0:7}" > "$STATUS"
      docker image prune -f >/dev/null 2>&1 || true
      return 0
    fi
    sleep 2
  done

  rollback "health check failed"
  return 1
}

main "$@"
exit $?
