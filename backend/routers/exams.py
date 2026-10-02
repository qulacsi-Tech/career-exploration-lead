from typing import Optional

from fastapi import APIRouter, Query

from core.dependencies import DbSession
from schemas.common import ListResponse, SuccessResponse
from schemas.exam import ExamSchema
from services.exam import ExamService

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=ListResponse[ExamSchema])
async def list_exams(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    stream: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    q: Optional[str] = Query(None),
):
    svc = ExamService(db)
    exams, meta = await svc.list_exams(
        page=page, limit=limit, stream=stream, level=level, featured=featured, q=q
    )
    return ListResponse[ExamSchema](data=exams, meta=meta)


@router.get("/{slug}", response_model=SuccessResponse[ExamSchema])
async def get_exam(slug: str, db: DbSession):
    svc = ExamService(db)
    exam = await svc.get_exam(slug)
    return SuccessResponse[ExamSchema](data=exam)
