"""Search service — queries Meilisearch if available, falls back to Postgres ilike."""

from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.college import College
from models.course_catalogue import CourseCatalogue
from models.exam import Exam
from models.location import Location
from schemas.search import SearchCollegeResult, SearchCourseResult, SearchExamResult, SearchLocationResult, SearchResultsSchema


async def _pg_search(db: AsyncSession, q: str, limit: int) -> SearchResultsSchema:
    """Simple PostgreSQL ILIKE fallback."""
    term = f"%{q}%"

    college_rows = (
        await db.execute(
            select(College.slug, College.name, College.city, College.stream)
            .where(or_(College.name.ilike(term), College.city.ilike(term)), College.status == "published")
            .limit(limit)
        )
    ).fetchall()

    exam_rows = (
        await db.execute(
            select(Exam.slug, Exam.name).where(Exam.name.ilike(term)).limit(limit)
        )
    ).fetchall()

    loc_rows = (
        await db.execute(
            select(Location.slug, Location.name).where(Location.name.ilike(term)).limit(limit)
        )
    ).fetchall()

    return SearchResultsSchema(
        colleges=[SearchCollegeResult(slug=r.slug, name=r.name, city=r.city, stream=r.stream) for r in college_rows],
        exams=[SearchExamResult(slug=r.slug, name=r.name) for r in exam_rows],
        locations=[SearchLocationResult(slug=r.slug, name=r.name) for r in loc_rows],
    )


async def _courses(db: AsyncSession, q: str, limit: int, stream: Optional[str]) -> list[SearchCourseResult]:
    """Courses from the catalogue whose name (or full name) matches."""
    term = f"%{q}%"
    stmt = (
        select(CourseCatalogue.slug, CourseCatalogue.name, CourseCatalogue.full_name, CourseCatalogue.stream)
        .where(CourseCatalogue.is_published.is_(True), or_(CourseCatalogue.name.ilike(term), CourseCatalogue.full_name.ilike(term)))
        .order_by(CourseCatalogue.name)
        .limit(limit)
    )
    if stream:
        stmt = stmt.where(CourseCatalogue.stream.ilike(stream))
    rows = (await db.execute(stmt)).fetchall()
    return [SearchCourseResult(slug=r.slug, name=r.name, fullName=r.full_name or "", stream=r.stream or "") for r in rows]


async def search(db: AsyncSession, q: str, limit: int = 10, stream: Optional[str] = None) -> SearchResultsSchema:
    """Colleges, exams, cities and courses that match. With `stream`, only that category's colleges and courses."""
    # A little more is read when a stream narrows the colleges afterwards, so the narrowed list is still full.
    results = await _search_colleges_exams_locations(db, q, limit * 3 if stream else limit)
    if stream:
        wanted = stream.strip().lower()
        results.colleges = [c for c in results.colleges if (c.stream or "").lower() == wanted][:limit]
    results.courses = await _courses(db, q, limit, stream)
    return results


async def _search_colleges_exams_locations(db: AsyncSession, q: str, limit: int = 10) -> SearchResultsSchema:
    """Try Meilisearch first; fall back to Postgres on any error."""
    try:
        import meilisearch  # type: ignore

        client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_API_KEY)

        college_hits = client.index("colleges").search(q, {"limit": limit}).get("hits", [])
        exam_hits = client.index("exams").search(q, {"limit": limit}).get("hits", [])
        loc_hits = client.index("locations").search(q, {"limit": limit}).get("hits", [])

        return SearchResultsSchema(
            colleges=[
                SearchCollegeResult(
                    slug=h.get("slug", ""),
                    name=h.get("name", ""),
                    city=h.get("city", ""),
                    stream=h.get("stream", ""),
                )
                for h in college_hits
            ],
            exams=[
                SearchExamResult(slug=h.get("slug", ""), name=h.get("name", ""))
                for h in exam_hits
            ],
            locations=[
                SearchLocationResult(slug=h.get("slug", ""), name=h.get("name", ""))
                for h in loc_hits
            ],
        )
    except Exception:
        # Meilisearch not available / not seeded — fall back to DB
        return await _pg_search(db, q, limit)
