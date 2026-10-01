from fastapi import APIRouter

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from schemas.location import LocationSchema
from services.location import LocationService

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=SuccessResponse[list])
async def list_locations(db: DbSession):
    svc = LocationService(db)
    locations = await svc.list_locations()
    return SuccessResponse[list](data=locations)


@router.get("/{slug}", response_model=SuccessResponse[LocationSchema])
async def get_location(slug: str, db: DbSession):
    svc = LocationService(db)
    location = await svc.get_location(slug)
    return SuccessResponse[LocationSchema](data=location)
