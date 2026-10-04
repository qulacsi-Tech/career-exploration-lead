#!/usr/bin/env bash
# Daily database backup. Keeps the last 14 dumps in ./backups.
# Run from the deploy/ folder. Add to cron (see docs/deployment-guide.md, step 11).
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="backups/leadgendb-${STAMP}.sql.gz"

docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
  pg_dump -U postgres -d leadgendb --no-owner | gzip > "${FILE}"

# Keep the 14 newest.
ls -1t backups/leadgendb-*.sql.gz | tail -n +15 | xargs -r rm --

echo "backup written: ${FILE}"
