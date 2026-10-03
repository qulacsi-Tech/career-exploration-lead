from typing import Optional

from fastapi import APIRouter, Query

from core.dependencies import DbSession
from schemas.common import ListResponse, SuccessResponse
from schemas.course_catalogue import CourseCatalogueDetailSchema, CourseCatalogueListSchema
from services.course_catalogue import CourseCatalogueService

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=ListResponse[CourseCatalogueListSchema])
async def list_courses(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    stream: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
):
    svc = CourseCatalogueService(db)
    courses, meta = await svc.list_courses(page=page, limit=limit, stream=stream, level=level)
    return ListResponse[CourseCatalogueListSchema](data=courses, meta=meta)


@router.get("/slugs", response_model=SuccessResponse[list])
async def get_course_slugs(db: DbSession):
    svc = CourseCatalogueService(db)
    slugs = await svc.get_all_slugs()
    return SuccessResponse[list](data=slugs)


@router.get("/{slug}", response_model=SuccessResponse[CourseCatalogueDetailSchema])
async def get_course(slug: str, db: DbSession):
    svc = CourseCatalogueService(db)
    course = await svc.get_course(slug)
    return SuccessResponse[CourseCatalogueDetailSchema](data=course)
