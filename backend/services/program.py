from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from models.program import Program
from repositories.program import ProgramRepository
from schemas.program import OnCampusInfoSchema, OnlineInfoSchema, ProgramSchema


def _to_schema(prog: Program) -> ProgramSchema:
    return ProgramSchema(
        slug=prog.slug,
        name=prog.name,
        university=prog.university_name,
        universitySlug=prog.university_slug,
        online=OnlineInfoSchema(
            duration=prog.online_duration,
            fees=prog.online_fees,
            feesNote=prog.online_fees_note,
        ),
        onCampus=OnCampusInfoSchema(
            duration=prog.on_campus_duration,
            fees=prog.on_campus_fees,
        ),
    )


class ProgramService:
    def __init__(self, db: AsyncSession):
        self.repo = ProgramRepository(db)

    async def get_recommended(self, limit: int = 3) -> List[ProgramSchema]:
        progs = await self.repo.get_recommended(limit=limit)
        return [_to_schema(p) for p in progs]
