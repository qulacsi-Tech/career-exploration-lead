# Deployed by CI/CD: a push to dev goes to dev.topcollegepath.com, a push to main to topcollegepath.com (docs/cicd-and-environments.md).
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import engine
from core.exceptions import AppException
from core.migrate import run_migrations
from services.realtime import listen_forever
from routers import health, reviews, questions, community, public_ids, admin_activity, admin_college_analytics, admin_lead_sharing, admin_subscribers, college_programmes, saved_colleges, practice_attempts, admin_exam_leads, practice_stats, team_messages
from routers import colleges, exams, locations, articles, programs, leads, search, home, auth, me, geo, track, notifications
from routers import courses, rankings, admin as admin_router, sitemap as sitemap_router, study_abroad, admin_study_abroad, collections, admin_dashboard, admin_analytics, admin_users, admin_college_admins, college_portal, college_requests, admin_requests, admin_catalogue, admin_rankings, admin_collections, admin_homepage, admin_content, admin_home_copy, listing_header, listing_slots, admin_programs, practice, admin_uploads, admin_locations, admin_fields, admin_band_colleges, admin_hero, admin_practice, admin_college_record, nav_menu, admin_priority, home_priority, auth_page, site_chrome, admin_recruiters

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up %s", settings.PROJECT_NAME)
    # Apply any migration that is not in the database yet, so a change to the models never meets an older database.
    await run_migrations()
    # One LISTEN connection per worker, so notifications created by either worker reach this one's sockets.
    listener = asyncio.create_task(listen_forever())
    yield
    listener.cancel()
    try:
        await listener
    except asyncio.CancelledError:
        pass
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


def _where(loc) -> str:
    """"Section 2, question 4" for a location inside a practice test; empty elsewhere."""
    parts = [str(p) for p in loc]
    out = []
    if "sections" in parts:
        i = parts.index("sections")
        if i + 1 < len(parts) and parts[i + 1].isdigit():
            out.append(f"Section {int(parts[i + 1]) + 1}")
    if "questions" in parts:
        i = parts.index("questions")
        if i + 1 < len(parts) and parts[i + 1].isdigit():
            out.append(f"question {int(parts[i + 1]) + 1}")
    return ", ".join(out)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """One plain sentence for the first problem. Field names, patterns and paths stay out of it."""
    from core.validation import SLUG_HINT, label

    errors = exc.errors()
    first = errors[0] if errors else {}
    loc = first.get("loc", [])
    kind, ctx = first.get("type", ""), first.get("ctx") or {}
    raw_msg = first.get("msg", "Validation error")
    last = str(loc[-1]) if loc else "This"
    name = label(last)
    where = _where(loc)
    prefix = f"{where}: " if where else ""

    if kind == "value_error":
        # A rule written for editors (core/college_rules.py, core/exam_rules.py) is already a whole sentence.
        message = raw_msg.removeprefix("Value error, ")
        message = message[:1].upper() + message[1:]
    elif kind in ("greater_than_equal", "less_than_equal", "greater_than", "less_than"):
        bound = {"greater_than_equal": ("at least", "ge"), "less_than_equal": ("at most", "le"),
                 "greater_than": ("more than", "gt"), "less_than": ("less than", "lt")}[kind]
        message = f"{prefix}{name} must be {bound[0]} {ctx.get(bound[1])}."
    elif kind == "missing":
        message = f"{prefix}{name} is required."
    elif kind == "string_too_short":
        n = ctx.get("min_length", 1)
        message = f"{prefix}{name} is required." if n <= 1 else f"{prefix}{name} must be at least {n} characters."
    elif kind == "string_too_long":
        message = f"{prefix}{name} must be at most {ctx.get('max_length')} characters."
    elif kind == "string_pattern_mismatch":
        message = f"{name}: {SLUG_HINT}." if last.lower().endswith("slug") else f"{prefix}{name} is not in the expected format."
    elif kind in ("int_parsing", "int_type", "float_parsing", "float_type"):
        message = f"{prefix}{name} must be a number."
    elif kind in ("literal_error", "enum"):
        message = f"{prefix}{name}: choose one of the listed options."
    else:
        message = f"{prefix}{name} is not valid."
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                # A validator's own exception sits in the error context; it is not JSON, so send its text.
                "details": jsonable_encoder(errors, custom_encoder={Exception: str}),
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
app.include_router(college_programmes.router, prefix=V1)
app.include_router(exams.router, prefix=V1)
app.include_router(locations.router, prefix=V1)
app.include_router(articles.router, prefix=V1)
app.include_router(programs.router, prefix=V1)
app.include_router(leads.router, prefix=V1)
app.include_router(reviews.router, prefix=V1)
app.include_router(questions.router, prefix=V1)
app.include_router(community.router, prefix=V1)
app.include_router(public_ids.router, prefix=V1)
app.include_router(admin_college_analytics.router, prefix=V1)
app.include_router(admin_activity.router, prefix=V1)
app.include_router(admin_lead_sharing.router, prefix=V1)
app.include_router(admin_lead_sharing.list_router, prefix=V1)
app.include_router(admin_subscribers.router, prefix=V1)
app.include_router(saved_colleges.me_router, prefix=V1)
app.include_router(saved_colleges.admin_router, prefix=V1)
app.include_router(saved_colleges.college_router, prefix=V1)
app.include_router(practice_attempts.router, prefix=V1)
app.include_router(admin_exam_leads.router, prefix=V1)
app.include_router(practice_stats.router, prefix=V1)
app.include_router(team_messages.admin_router, prefix=V1)
app.include_router(team_messages.me_router, prefix=V1)
app.include_router(me.router, prefix=V1)
app.include_router(geo.router, prefix=V1)
app.include_router(track.router, prefix=V1)
app.include_router(notifications.router, prefix=V1)
app.include_router(search.router, prefix=V1)
app.include_router(home.router, prefix=V1)
app.include_router(auth.router, prefix=V1)
app.include_router(courses.router, prefix=V1)
app.include_router(rankings.router, prefix=V1)
app.include_router(study_abroad.router, prefix=V1)
app.include_router(admin_study_abroad.router, prefix=V1)
app.include_router(collections.router, prefix=V1)
app.include_router(admin_dashboard.router, prefix=V1)
app.include_router(admin_analytics.router, prefix=V1)
app.include_router(admin_users.router, prefix=V1)
app.include_router(admin_college_admins.router, prefix=V1)
app.include_router(college_portal.router, prefix=V1)
app.include_router(college_requests.router, prefix=V1)
app.include_router(admin_requests.router, prefix=V1)
app.include_router(admin_catalogue.router, prefix=V1)
app.include_router(admin_rankings.router, prefix=V1)
app.include_router(admin_collections.router, prefix=V1)
app.include_router(admin_homepage.router, prefix=V1)
app.include_router(admin_content.router, prefix=V1)
app.include_router(admin_home_copy.router, prefix=V1)
app.include_router(listing_header.router, prefix=V1)
app.include_router(listing_header.public_router, prefix=V1)
app.include_router(auth_page.router, prefix=V1)
app.include_router(auth_page.public_router, prefix=V1)
app.include_router(site_chrome.router, prefix=V1)
app.include_router(admin_recruiters.router, prefix=V1)
app.include_router(site_chrome.public_router, prefix=V1)
app.include_router(nav_menu.router, prefix=V1)
app.include_router(admin_priority.router, prefix=V1)
app.include_router(home_priority.router, prefix=V1)
app.include_router(home_priority.public_router, prefix=V1)
app.include_router(nav_menu.public_router, prefix=V1)
app.include_router(listing_slots.router, prefix=V1)
app.include_router(listing_slots.public_router, prefix=V1)
app.include_router(admin_programs.router, prefix=V1)
app.include_router(admin_uploads.router, prefix=V1)
app.include_router(admin_locations.router, prefix=V1)
app.include_router(admin_fields.router, prefix=V1)
app.include_router(admin_band_colleges.router, prefix=V1)
app.include_router(admin_hero.router, prefix=V1)
app.include_router(admin_practice.router, prefix=V1)
app.include_router(admin_college_record.router, prefix=V1)
app.include_router(practice.router, prefix=V1)
app.include_router(admin_router.router, prefix=V1)
app.include_router(sitemap_router.router, prefix=V1)

# Admin-uploaded images, served read-only. The folder is created up front because
# StaticFiles refuses to mount a missing directory.
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "ok"}
