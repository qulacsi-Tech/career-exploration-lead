from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.exam import Exam


class ExamRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        page: int = 1,
        limit: int = 20,
        stream: Optional[str] = None,
        level: Optional[str] = None,
        featured: Optional[bool] = None,
        q: Optional[str] = None,
    ) -> Tuple[List[Exam], int]:
        stmt = select(Exam).where(Exam.archived == False)  # noqa: E712
        if stream:
            stmt = stmt.where(Exam.stream.ilike(f"%{stream}%"))
        if level:
            stmt = stmt.where(Exam.level == level)
        if featured is not None:
            stmt = stmt.where(Exam.is_featured == featured)
        if q:
            term = f"%{q}%"
            stmt = stmt.where(Exam.name.ilike(term))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar_one()

        offset = (page - 1) * limit
        result = await self.db.execute(stmt.offset(offset).limit(limit))
        return list(result.scalars()), total

    async def get_by_slug(self, slug: str) -> Optional[Exam]:
        result = await self.db.execute(select(Exam).where(Exam.slug == slug, Exam.archived == False))  # noqa: E712
        return result.scalar_one_or_none()

    async def list_all(self) -> List[Exam]:
        # Newest first, so an exam just added is at the top of the admin table. The public id breaks ties (seeded rows share a time).
        result = await self.db.execute(select(Exam).order_by(Exam.created_at.desc(), Exam.public_id.desc()))
        return list(result.scalars())

    async def get_featured(self, limit: int = 6) -> List[Exam]:
        stmt = (
            select(Exam)
            .where(Exam.is_featured == True, Exam.archived == False)  # noqa: E712
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars())
