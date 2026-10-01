from fastapi import APIRouter, Query

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
