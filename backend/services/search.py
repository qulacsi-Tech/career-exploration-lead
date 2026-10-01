"""Search service — queries Meilisearch if available, falls back to Postgres ilike."""

from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.college import College
from models.exam import Exam
from models.location import Location
from schemas.search import SearchCollegeResult, SearchExamResult, SearchLocationResult, SearchResultsSchema


async def _pg_search(db: AsyncSession, q: str, limit: int) -> SearchResultsSchema:
    """Simple PostgreSQL ILIKE fallback."""
    term = f"%{q}%"

    college_rows = (
        await db.execute(
            select(College.slug, College.name, College.city, College.stream)
            .where(or_(College.name.ilike(term), College.city.ilike(term)))
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


async def search(db: AsyncSession, q: str, limit: int = 10) -> SearchResultsSchema:
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
