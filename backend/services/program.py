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
        image=prog.image or "",
    )


class ProgramService:
    def __init__(self, db: AsyncSession):
        self.repo = ProgramRepository(db)

    async def get_recommended(self, limit: int = 3) -> List[ProgramSchema]:
        """The homepage row, in the order the admin set. Unknown slugs are skipped."""
        from sqlalchemy import select
        from models.site_content import SiteContent

        row = (await self.repo.db.execute(
            select(SiteContent).where(SiteContent.key == "home.recommendedPrograms")
        )).scalar_one_or_none()
        slugs = list(row.data)[:limit] if row and isinstance(row.data, list) else []
        if not slugs:
            return []
        rows = (await self.repo.db.execute(select(Program).where(Program.slug.in_(slugs), Program.is_active.is_(True)))).scalars().all()
        by_slug = {p.slug: p for p in rows}
        return [_to_schema(by_slug[s]) for s in slugs if s in by_slug]
