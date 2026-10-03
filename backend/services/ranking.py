from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from repositories.ranking import RankingRepository
from schemas.ranking import RankingEntrySchema, RankingListSchema


class RankingService:
    def __init__(self, db: AsyncSession):
        self.repo = RankingRepository(db)

    async def list_rankings(self) -> List[RankingListSchema]:
        lists = await self.repo.list_all()
        return [
            RankingListSchema(
                slug=rl.slug,
                name=rl.name,
                authority=rl.authority,
                year=rl.year,
                stream=rl.stream,
                entries=[
                    RankingEntrySchema(collegeSlug=e.college_slug, rank=e.rank, score=e.score)
                    for e in (rl.entries or [])
                ],
            )
            for rl in lists
        ]

    async def get_ranking(self, slug: str) -> RankingListSchema:
        rl = await self.repo.get_by_slug(slug)
        if not rl:
            raise NotFoundError("RankingList")
        return RankingListSchema(
            slug=rl.slug,
            name=rl.name,
            authority=rl.authority,
            year=rl.year,
            stream=rl.stream,
            entries=[
                RankingEntrySchema(collegeSlug=e.college_slug, rank=e.rank, score=e.score)
                for e in (rl.entries or [])
            ],
        )
