#!/bin/sh
# Applies any new database migrations, then starts the API.
#
# Without this, a container started from a new image against an older database fails with a 500 on
# the first page that reads a new column. Running it here means the image can never meet a database
# it is ahead of, however it was started. Safe to run every time: with nothing new it does nothing,
# and the deploy script's own migration step simply finds it already done.
set -e

alembic upgrade head

exec "$@"
