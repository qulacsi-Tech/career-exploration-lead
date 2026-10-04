# Backend API image (FastAPI + SQLAlchemy + Alembic).
# Build context is the backend/ folder. See docs/deployment-guide.md.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Runs as an unprivileged user.
# /app/uploads is created here so a fresh volume mounted on it is writable by "app".
RUN useradd --create-home --uid 10001 app && mkdir -p /app/uploads && chown -R app /app
USER app

EXPOSE 8000

# Caddy is the only client, on the internal Docker network. --forwarded-allow-ips
# trusts the proxy's X-Forwarded-* headers, so the client IP is the real one.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
