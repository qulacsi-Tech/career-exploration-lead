#!/usr/bin/env bash
# The only thing the GitHub Actions deploy key is allowed to run. Put the key in
# /root/.ssh/authorized_keys on the server like this (one line):
#
#   restrict,command="/opt/career-platform/deploy/ci-entry.sh" ssh-ed25519 AAAA... github-actions-deploy
#
# "restrict" turns off terminals and forwarding and "command" ignores whatever the client asked
# for, so a leaked key can only deploy a commit of this repository, never open a shell.
# The client sends:  deploy <prod|dev> <full 40-character commit sha>
set -euo pipefail

cmd="${SSH_ORIGINAL_COMMAND:-}"
if ! [[ "$cmd" =~ ^deploy\ (prod|dev)\ ([0-9a-f]{40})$ ]]; then
  echo "refused: expected 'deploy <prod|dev> <40-character sha>'" >&2
  exit 2
fi
env_name="${BASH_REMATCH[1]}"
sha="${BASH_REMATCH[2]}"

# shellcheck source=env.sh
. "$(dirname "$0")/env.sh"
select_env "$env_name"
[ -f "$REPO/deploy/deploy.sh" ] || { echo "no deploy script in $REPO (clone the repo there first)" >&2; exit 1; }
exec bash "$REPO/deploy/deploy.sh" "$env_name" "$sha"
