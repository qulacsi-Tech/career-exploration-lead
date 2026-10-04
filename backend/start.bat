@echo off
REM Start the College Discovery Platform backend (FastAPI)
REM
REM Applies any new database migrations first, so code you just pulled never meets
REM an older database. Without this, admin pages fail with a 500 until you run it by hand.
py -m alembic upgrade head
if errorlevel 1 (
  echo.
  echo Database migration failed. The backend was not started. Fix the error above and run again.
  exit /b 1
)
py -m uvicorn main:app --reload %*
