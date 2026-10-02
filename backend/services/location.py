from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.location import Location
from repositories.location import LocationRepository
from schemas.location import LocationSchema


def _to_schema(loc: Location) -> LocationSchema:
    return LocationSchema(
        slug=loc.slug,
        name=loc.name,
        state=loc.state,
        collegeCount=loc.college_count,
    )


class LocationService:
    def __init__(self, db: AsyncSession):
        self.repo = LocationRepository(db)

    async def list_locations(self) -> List[LocationSchema]:
        locs = await self.repo.list_all()
        return [_to_schema(l) for l in locs]

    async def get_location(self, slug: str) -> LocationSchema:
        loc = await self.repo.get_by_slug(slug)
        if not loc:
            raise NotFoundError("Location")
        return _to_schema(loc)
