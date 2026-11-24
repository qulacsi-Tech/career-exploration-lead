#!/usr/bin/env bash
# Daily database and uploads backup for one environment. Keeps the last 14 of each in ./backups.
#   backup.sh          backs up prod (the default)
#   backup.sh dev      backs up dev
# Cron entry for prod (see docs/cicd-and-environments.md):
#   30 2 * * * /opt/career-platform/deploy/backup.sh >> /opt/career-platform/deploy/backups/backup.log 2>&1
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env.sh
. "$HERE/env.sh"
select_env "${1:-prod}"

cd "$REPO/deploy"
mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="backups/leadgendb-${STAMP}.sql.gz"
COMPOSE="docker compose -p $PROJECT -f docker-compose.app.yml --env-file .env"

$COMPOSE exec -T db pg_dump -U postgres -d leadgendb --no-owner | gzip > "${FILE}"

# Uploaded images live in a volume, not the database.
UPLOADS="backups/uploads-${STAMP}.tar.gz"
$COMPOSE exec -T backend tar -czf - -C /app uploads > "${UPLOADS}"

# Keep the 14 newest of each.
ls -1t backups/leadgendb-*.sql.gz | tail -n +15 | xargs -r rm --
ls -1t backups/uploads-*.tar.gz | tail -n +15 | xargs -r rm --

echo "backup written: ${FILE}"
