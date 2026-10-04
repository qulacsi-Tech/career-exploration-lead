from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.course_catalogue import CourseCatalogue
from models.specialisation import Specialisation


class CourseCatalogueRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        page: int = 1,
        limit: int = 50,
        stream: Optional[str] = None,
        level: Optional[str] = None,
    ) -> Tuple[List[CourseCatalogue], int]:
        stmt = (
            select(CourseCatalogue)
            .where(CourseCatalogue.is_published == True)  # noqa: E712
            .options(selectinload(CourseCatalogue.specialisations))
        )
        if stream:
            stmt = stmt.where(CourseCatalogue.stream.ilike(f"%{stream}%"))
        if level:
            stmt = stmt.where(CourseCatalogue.level == level)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar_one()

        offset = (page - 1) * limit
        result = await self.db.execute(stmt.offset(offset).limit(limit))
        return list(result.scalars().unique()), total

    async def get_by_slug(self, slug: str) -> Optional[CourseCatalogue]:
        stmt = (
            select(CourseCatalogue)
            .where(CourseCatalogue.slug == slug, CourseCatalogue.is_published == True)  # noqa: E712
            .options(selectinload(CourseCatalogue.specialisations))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_slugs(self) -> List[str]:
        result = await self.db.execute(
            select(CourseCatalogue.slug).where(CourseCatalogue.is_published == True)  # noqa: E712
        )
        return list(result.scalars())

    async def get_specialisations_for_course(self, course_slug: str) -> List[Specialisation]:
        result = await self.db.execute(
            select(Specialisation).where(Specialisation.course_slug == course_slug)
        )
        return list(result.scalars())
