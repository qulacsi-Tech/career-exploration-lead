# Backend Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (async) |
| Language | Python 3.11+ |
| Database | PostgreSQL 16 (via asyncpg) |
| ORM | SQLAlchemy 2.0 async |
| Migrations | Alembic |
| Search | Meilisearch v1.9 |
| Auth | JWT (PyJWT) + bcrypt |
| Validation | Pydantic v2 |
| Config | pydantic-settings (.env) |
| Container | Docker Compose (postgres + meilisearch) |

## Directory Structure

```
backend/
├── main.py                    # FastAPI app, middleware, router registration
├── core/
│   ├── config.py              # Settings via pydantic-settings
│   ├── database.py            # Async engine, session factory, Base
│   ├── security.py            # JWT encode/decode, password hashing
│   ├── exceptions.py          # Custom exception classes
│   └── dependencies.py        # FastAPI dependencies (get_db, current_user)
├── models/
│   ├── __init__.py            # Re-exports all models (for Alembic)
│   ├── college.py
│   ├── exam.py
│   ├── location.py
│   ├── article.py
│   ├── program.py
│   ├── lead.py
│   ├── user.py
│   └── review.py
├── schemas/
│   ├── college.py             # Pydantic request/response schemas
│   ├── exam.py
│   ├── location.py
│   ├── article.py
│   ├── program.py
│   ├── lead.py
│   ├── auth.py
│   ├── search.py
│   └── common.py             # Envelope, Pagination, Error schemas
├── repositories/
│   ├── college.py             # DB queries for colleges
│   ├── exam.py
│   ├── location.py
│   ├── article.py
│   ├── program.py
│   ├── lead.py
│   └── user.py
├── services/
│   ├── college.py             # Business logic
│   ├── exam.py
│   ├── location.py
│   ├── article.py
│   ├── program.py
│   ├── lead.py
│   ├── auth.py
│   └── search.py             # Meilisearch integration
├── routers/
│   ├── health.py
│   ├── colleges.py
│   ├── exams.py
│   ├── locations.py
│   ├── articles.py
│   ├── programs.py
│   ├── leads.py
│   ├── newsletter.py
│   ├── search.py
│   ├── home.py
│   └── auth.py
├── seed.py                    # Seed DB from mock-data equivalents
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── alembic.ini
└── requirements.txt
```

## Request Lifecycle

```
HTTP Request
    ↓
FastAPI Router         (parse path/query/body params)
    ↓
Pydantic Schema        (validate + coerce input)
    ↓
Dependency Injection   (get_db session, optional current_user)
    ↓
Service Layer          (business logic, business rules)
    ↓
Repository Layer       (SQLAlchemy async queries)
    ↓
PostgreSQL Database
    ↓
Repository returns ORM model
    ↓
Service returns domain object / raises exception
    ↓
Router serializes via Pydantic response_model
    ↓
Envelope wrapper       (success/error JSON)
    ↓
HTTP Response
```

## Authentication Strategy

- **JWT-based** (stateless, no server-side sessions)
- Access token: 24h expiry (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Passwords hashed with bcrypt (cost factor 12)
- Token sent in `Authorization: Bearer <token>` header
- All public endpoints work without any token
- Protected endpoints use `Depends(get_current_user)` dependency

## Authorization

| Role | Permissions |
|---|---|
| VISITOR (anon) | Read colleges, exams, locations, articles, search, submit leads |
| USER | + write reviews, shortlist colleges |
| ADMIN | + full CRUD on all entities, manage leads, moderate reviews |

Role stored in `users.role` enum column. Checked via FastAPI dependencies.

## Error Handling

Global exception handler on `main.py` catches:
- `HTTPException` → standard FastAPI error
- `AppException` (custom) → `{ success: false, error: { code, message } }`
- `RequestValidationError` → `422` with field-level errors
- Unhandled `Exception` → `500` with generic message (never leaks stack trace)

## API Versioning

All routes prefixed `/api/v1/`. Version encoded in URL path, not headers.

## CORS

Origins controlled by `CORS_ORIGINS` env var. Development adds `localhost:3000` and `127.0.0.1:3000` automatically.

## Meilisearch Integration

- Sync happens in `seed.py` and on every create/update/delete via service layer
- Index: `colleges` (searchable: name, city, state, stream, about)
- Index: `exams` (searchable: name, conductingBody, description)
- Search endpoint calls Meilisearch directly and returns unified results

## Logging

- Python `logging` module, structured output
- Log level from env (default INFO)
- Logs request ID, method, path, duration, status
- Never logs passwords, tokens, or PII

## Security Checklist

- Passwords hashed (bcrypt, never stored plain)
- JWT secrets from env, never hardcoded
- CORS restricted to known origins
- SQL injection prevented by SQLAlchemy parameterized queries
- Input validated via Pydantic before any DB operation
- No stack traces in production responses
- Rate limiting: not implemented in Phase 1 (add nginx/cloudflare layer)
