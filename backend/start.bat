@echo off
REM Start the College Discovery Platform backend (FastAPI)
py -m uvicorn main:app --reload %*
