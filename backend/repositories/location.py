from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.location import Location, LocationLabel, LocationLabelLink


class LocationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(self) -> List[Location]:
        result = await self.db.execute(select(Location).order_by(Location.college_count.desc()))
        return list(result.scalars())

    async def list_for_home(self) -> List[Location]:
        """Locations ticked for the homepage, in the admin's order."""
        result = await self.db.execute(
            select(Location)
            .where(Location.show_on_home.is_(True))
            .order_by(Location.home_order, Location.college_count.desc(), Location.name)
        )
        return list(result.scalars())

    async def labels_for(self, location_ids: List) -> dict:
        """Label texts per location id, in label order."""
        if not location_ids:
            return {}
        result = await self.db.execute(
            select(LocationLabelLink.location_id, LocationLabel.text)
            .join(LocationLabel, LocationLabel.id == LocationLabelLink.label_id)
            .where(LocationLabelLink.location_id.in_(location_ids))
            .order_by(LocationLabel.position, LocationLabel.text)
        )
        labels: dict = {}
        for location_id, text in result.all():
            labels.setdefault(location_id, []).append(text)
        return labels

    async def college_names(self, slugs: List[str]) -> dict:
        """{college slug: (name, stream)} for the colleges that exist."""
        if not slugs:
            return {}
        from models.college import College

        result = await self.db.execute(select(College.slug, College.name, College.stream).where(College.slug.in_(slugs)))
        return {slug: (name, stream) for slug, name, stream in result.all()}

    async def get_by_slug(self, slug: str) -> Optional[Location]:
        result = await self.db.execute(select(Location).where(Location.slug == slug))
        return result.scalar_one_or_none()
