#!/bin/sh
# Start the backend (FastAPI) on macOS or Linux, the same way start.bat does on Windows:
# apply any new database migrations first, so code you just pulled never meets an older
# database, then run the server. Extra arguments go to uvicorn.
set -e
cd "$(dirname "$0")"

python3 -m alembic upgrade head || {
  echo
  echo "Database migration failed. The backend was not started. Fix the error above and run again."
  exit 1
}
exec python3 -m uvicorn main:app --reload "$@"
