from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.article import Article


class ArticleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, page: int = 1, limit: int = 10, college: Optional[str] = None) -> Tuple[List[Article], int]:
        stmt = (
            select(Article)
            .where(Article.is_published == True)  # noqa: E712
            .order_by(Article.published_at.desc())
        )
        if college:
            # Related colleges are kept as a comma-separated list; match the whole slug, not a part of another.
            stmt = stmt.where(func.concat(",", func.replace(Article.related_college_slugs, " ", ""), ",").like(f"%,{college},%"))
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar_one()

        offset = (page - 1) * limit
        result = await self.db.execute(stmt.offset(offset).limit(limit))
        return list(result.scalars()), total

    async def get_by_slug(self, slug: str) -> Optional[Article]:
        result = await self.db.execute(
            select(Article).where(Article.slug == slug, Article.is_published == True)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def get_recent(self, limit: int = 3) -> List[Article]:
        stmt = (
            select(Article)
            .where(Article.is_published == True)  # noqa: E712
            .order_by(Article.published_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars())
