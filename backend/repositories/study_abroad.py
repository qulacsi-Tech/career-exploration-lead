from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.study_abroad import StudyAbroadItem


class StudyAbroadRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_kind(self, kind: str) -> List[StudyAbroadItem]:
        result = await self.db.execute(
            select(StudyAbroadItem)
            .where(StudyAbroadItem.kind == kind)
            .order_by(StudyAbroadItem.position, StudyAbroadItem.key)
        )
        return list(result.scalars())

    async def get_meta(self, key: str) -> StudyAbroadItem | None:
        result = await self.db.execute(
            select(StudyAbroadItem).where(StudyAbroadItem.kind == "meta", StudyAbroadItem.key == key)
        )
        return result.scalar_one_or_none()
