from fastapi import APIRouter, Query

from core.exceptions import NotFoundError

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from schemas.program import ProgramSchema
from services.program import ProgramService

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("/recommended", response_model=SuccessResponse[list])
async def get_recommended_programs(
    db: DbSession,
    limit: int = Query(3, ge=1, le=20),
):
    svc = ProgramService(db)
    programs = await svc.get_recommended(limit=limit)
    return SuccessResponse[list](data=programs)


@router.get("/{slug}", response_model=SuccessResponse[ProgramSchema])
async def get_program(slug: str, db: DbSession):
    program = await ProgramService(db).get_by_slug(slug)
    if program is None:
        raise NotFoundError("Programme")
    return SuccessResponse[ProgramSchema](data=program)
