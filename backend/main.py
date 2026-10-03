import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.database import engine
from core.exceptions import AppException
from routers import health
from routers import colleges, exams, locations, articles, programs, leads, search, home, auth
from routers import courses, rankings, admin as admin_router, sitemap as sitemap_router, study_abroad, admin_study_abroad, collections, admin_dashboard

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up %s", settings.PROJECT_NAME)
    yield
    await engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handlers ─────────────────────────────────────────────────────

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    # Build a readable message from the first error
    first = errors[0] if errors else {}
    field = " → ".join(str(loc) for loc in first.get("loc", []))
    msg = first.get("msg", "Validation error")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{field}: {msg}" if field else msg,
                "details": errors,
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
            },
        },
    )


# ── Routes ────────────────────────────────────────────────────────────────────

# Health (existing)
app.include_router(health.router, prefix="/api")

# v1 API
V1 = "/api/v1"
app.include_router(colleges.router, prefix=V1)
app.include_router(exams.router, prefix=V1)
app.include_router(locations.router, prefix=V1)
app.include_router(articles.router, prefix=V1)
app.include_router(programs.router, prefix=V1)
app.include_router(leads.router, prefix=V1)
app.include_router(search.router, prefix=V1)
app.include_router(home.router, prefix=V1)
app.include_router(auth.router, prefix=V1)
app.include_router(courses.router, prefix=V1)
app.include_router(rankings.router, prefix=V1)
app.include_router(study_abroad.router, prefix=V1)
app.include_router(admin_study_abroad.router, prefix=V1)
app.include_router(collections.router, prefix=V1)
app.include_router(admin_dashboard.router, prefix=V1)
app.include_router(admin_router.router, prefix=V1)
app.include_router(sitemap_router.router, prefix=V1)


@app.get("/health")
def health_check():
    return {"status": "ok"}
