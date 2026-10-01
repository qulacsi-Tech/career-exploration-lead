from fastapi import APIRouter

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from schemas.home import HomeDataSchema
from services.home import get_home_data

router = APIRouter(prefix="/home", tags=["home"])


@router.get("", response_model=SuccessResponse[HomeDataSchema])
async def home(db: DbSession):
    """Single aggregated endpoint that populates the entire home page."""
    data = await get_home_data(db)
    return SuccessResponse[HomeDataSchema](data=data)
