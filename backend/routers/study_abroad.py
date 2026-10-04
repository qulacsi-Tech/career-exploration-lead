from fastapi import APIRouter

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from services.study_abroad import StudyAbroadService

router = APIRouter(prefix="/study-abroad", tags=["study-abroad"])


@router.get("", response_model=SuccessResponse[dict])
async def get_study_abroad(db: DbSession):
    svc = StudyAbroadService(db)
    content = await svc.get_content()
    return SuccessResponse[dict](data=content)
