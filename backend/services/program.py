from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models.program import Program
from repositories.program import ProgramRepository
from schemas.program import OnCampusInfoSchema, OnlineInfoSchema, ProgramInstitutionSchema, ProgramSchema


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

    async def get_by_slug(self, slug: str) -> Optional[ProgramSchema]:
        """An active programme, or None. A switched-off programme is hidden like an unknown one."""
        from sqlalchemy import func, select
        from models.college import College

        db = self.repo.db
        prog = (await db.execute(select(Program).where(Program.slug == slug, Program.is_active.is_(True)))).scalar_one_or_none()
        if prog is None:
            return None

        # The same programme at other institutions: active records with the same name. This one comes first.
        same = (await db.execute(
            select(Program).where(func.lower(Program.name) == prog.name.strip().lower(), Program.is_active.is_(True)).order_by(Program.university_name)
        )).scalars().all()
        ordered = [prog] + [p for p in same if p.id != prog.id]
        colleges = {
            c.slug: c
            for c in (await db.execute(
                select(College).where(College.slug.in_([p.university_slug for p in ordered]), College.status == "published")
            )).scalars().all()
        }

        out = _to_schema(prog)
        out.institutions = []
        for p in ordered:
            c = colleges.get(p.university_slug)
            out.institutions.append(ProgramInstitutionSchema(
                slug=p.slug,
                university=p.university_name,
                universitySlug=p.university_slug,
                inDirectory=c is not None,
                city=c.city if c else None,
                state=c.state if c else None,
                ownership=(c.ownership.value if hasattr(c.ownership, "value") else str(c.ownership)) if c else None,
                rankingAuthority=c.ranking_authority if c else None,
                rankingRank=c.ranking_rank if c else None,
                rating=c.rating if c and c.review_count else None,
                reviewCount=c.review_count if c else None,
                online=OnlineInfoSchema(duration=p.online_duration, fees=p.online_fees, feesNote=p.online_fees_note),
                onCampus=OnCampusInfoSchema(duration=p.on_campus_duration, fees=p.on_campus_fees),
            ))
        return out
