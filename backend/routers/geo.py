from fastapi import APIRouter

from data.india_districts import INDIA_DISTRICTS
from schemas.common import SuccessResponse

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/india", response_model=SuccessResponse[dict])
async def india_geo():
    """Every state or union territory with its districts. The same list the admin's dropdowns use."""
    return SuccessResponse[dict](data={"states": INDIA_DISTRICTS})
