from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.college import College
from repositories.ranking import RankingRepository
from schemas.ranking import RankingEntrySchema, RankingListSchema


class RankingService:
    def __init__(self, db: AsyncSession):
        self.repo = RankingRepository(db)

    async def _public_slugs(self) -> set:
        """A ranking only lists colleges the site shows."""
        rows = await self.repo.db.execute(select(College.slug).where(College.status == "published"))
        return set(rows.scalars())

    async def list_rankings(self) -> List[RankingListSchema]:
        lists = await self.repo.list_all()
        public = await self._public_slugs()
        return [
            RankingListSchema(
                slug=rl.slug,
                name=rl.name,
                shortName=rl.short_name or "",
                authority=rl.authority,
                year=rl.year,
                stream=rl.stream,
                entries=[
                    RankingEntrySchema(collegeSlug=e.college_slug, rank=e.rank, score=e.score)
                    for e in (rl.entries or [])
                    if e.college_slug in public
                ],
            )
            for rl in lists
        ]

    async def get_ranking(self, slug: str) -> RankingListSchema:
        rl = await self.repo.get_by_slug(slug)
        if not rl:
            raise NotFoundError("RankingList")
        public = await self._public_slugs()
        return RankingListSchema(
            slug=rl.slug,
            name=rl.name,
            shortName=rl.short_name or "",
            authority=rl.authority,
            year=rl.year,
            stream=rl.stream,
            entries=[
                RankingEntrySchema(collegeSlug=e.college_slug, rank=e.rank, score=e.score)
                for e in (rl.entries or [])
                if e.college_slug in public
            ],
        )
