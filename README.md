# College Discovery Platform — lead-gen

See [frontend/assets/prototype/College-Discovery-Platform-Proposal.md](frontend/assets/prototype/College-Discovery-Platform-Proposal.md) for the approach and phased roadmap.

## Structure

```
lead-gen/
  frontend/                      Next.js app (TypeScript, Tailwind, App Router) — public site + /admin panel
    assets/prototype/            Reference design screenshots + the client proposal doc
  backend/                       FastAPI app — API, auth, content model
  docker-compose.yml             Local Postgres + Meilisearch
```

## Running locally

**Infrastructure** (Postgres + Meilisearch):
```
docker compose up -d
```

**Backend**:
```
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # then fill in real values
uvicorn main:app --reload
```
API available at `http://localhost:8000`, health check at `/health`.

**Frontend**:
```
cd frontend
npm install
npm run dev
```
Site available at `http://localhost:3000`.
