from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.ranking import RankingList, RankingEntry


class RankingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(self) -> List[RankingList]:
        result = await self.db.execute(
            select(RankingList)
            .options(selectinload(RankingList.entries))
            .order_by(RankingList.year.desc())
        )
        return list(result.scalars().unique())

    async def get_by_slug(self, slug: str) -> Optional[RankingList]:
        result = await self.db.execute(
            select(RankingList)
            .where(RankingList.slug == slug)
            .options(selectinload(RankingList.entries))
        )
        return result.scalar_one_or_none()

    async def get_entries_for_college(self, college_slug: str) -> List[RankingEntry]:
        result = await self.db.execute(
            select(RankingEntry).where(RankingEntry.college_slug == college_slug)
        )
        return list(result.scalars())
