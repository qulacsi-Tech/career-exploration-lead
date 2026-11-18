"""
Sitemap data endpoints — return slug lists so the Next.js sitemap.ts
can build an XML sitemap without hitting the DB directly.

These are public, read-only endpoints returning plain JSON arrays.
The Next.js sitemap.ts at /app/sitemap.ts calls them at build/revalidation time.
"""

from fastapi import APIRouter
from fastapi.responses import Response

from core.dependencies import DbSession
from schemas.common import SuccessResponse

router = APIRouter(prefix="/sitemap", tags=["sitemap"])


@router.get("/colleges", response_model=SuccessResponse[list])
async def sitemap_colleges(db: DbSession):
    """All published colleges as `<public id>-<slug>`, the way their pages are addressed."""
    from sqlalchemy import select
    from models.college import College
    result = await db.execute(select(College.slug, College.public_id).where(College.status == "published"))
    return SuccessResponse[list](data=[f"{i}-{s}" for s, i in result.all()])


@router.get("/exams", response_model=SuccessResponse[list])
async def sitemap_exams(db: DbSession):
    """All exam slugs for sitemap generation."""
    from sqlalchemy import select
    from models.exam import Exam
    result = await db.execute(select(Exam.slug, Exam.public_id))
    return SuccessResponse[list](data=[f"{i}-{s}" for s, i in result.all()])


@router.get("/articles", response_model=SuccessResponse[list])
async def sitemap_articles(db: DbSession):
    """All published article slugs for sitemap generation."""
    from sqlalchemy import select
    from models.article import Article
    result = await db.execute(
        select(Article.slug, Article.public_id).where(Article.is_published == True)  # noqa: E712
    )
    return SuccessResponse[list](data=[f"{i}-{s}" for s, i in result.all()])


@router.get("/courses", response_model=SuccessResponse[list])
async def sitemap_courses(db: DbSession):
    """All published course catalogue slugs."""
    from sqlalchemy import select
    from models.course_catalogue import CourseCatalogue
    result = await db.execute(
        select(CourseCatalogue.slug).where(CourseCatalogue.is_published == True)  # noqa: E712
    )
    return SuccessResponse[list](data=list(result.scalars()))
