from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.location import Location


class LocationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(self) -> List[Location]:
        result = await self.db.execute(select(Location).order_by(Location.college_count.desc()))
        return list(result.scalars())

    async def get_by_slug(self, slug: str) -> Optional[Location]:
        result = await self.db.execute(select(Location).where(Location.slug == slug))
        return result.scalar_one_or_none()
