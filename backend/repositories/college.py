"""College repository — all DB queries for colleges and related sub-resources."""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.college import College
from models.course import Course
from models.cutoff import Cutoff
from models.placement import Placement
from models.review import Review
from schemas.college import CollegeFilterParams


def _apply_filters(stmt, params: CollegeFilterParams):
    """Apply all optional filter/sort criteria to an existing SELECT statement."""
    if params.stream:
        stmt = stmt.where(College.stream.ilike(f"%{params.stream}%"))
    if params.city:
        stmt = stmt.where(College.city.ilike(f"%{params.city}%"))
    if params.state:
        stmt = stmt.where(College.state.ilike(f"%{params.state}%"))
    if params.ownership:
        stmt = stmt.where(College.ownership == params.ownership)
    if params.featured is not None:
        stmt = stmt.where(College.is_featured == params.featured)
    if params.approval:
        # JSONB array contains
        stmt = stmt.where(College.approvals.contains([params.approval]))
    if params.exam:
        stmt = stmt.where(College.exams_accepted.contains([params.exam]))
    if params.ranking_max:
        stmt = stmt.where(College.ranking_rank <= params.ranking_max)
    if params.q:
        term = f"%{params.q}%"
        stmt = stmt.where(
            or_(College.name.ilike(term), College.city.ilike(term), College.about.ilike(term))
        )

    # Sort
    if params.sort == "rating":
        stmt = stmt.order_by(College.rating.desc())
    elif params.sort == "views":
        stmt = stmt.order_by(College.view_count.desc())
    else:  # popularity (default)
        stmt = stmt.order_by(College.review_count.desc())

    return stmt


class CollegeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, params: CollegeFilterParams) -> Tuple[List[College], int]:
        """Return (colleges_page, total_count)."""
        base = select(College).options(selectinload(College.courses))
        base = _apply_filters(base, params)

        # Count
        count_stmt = select(func.count()).select_from(base.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar_one()

        # Page
        offset = (params.page - 1) * params.limit
        page_stmt = base.offset(offset).limit(params.limit)
        result = await self.db.execute(page_stmt)
        colleges = list(result.scalars().unique())
        return colleges, total

    async def get_by_slug(self, slug: str) -> Optional[College]:
        """Return full college with all relations loaded."""
        stmt = (
            select(College)
            .where(College.slug == slug)
            .options(
                selectinload(College.courses),
                selectinload(College.placements),
                selectinload(College.cutoffs),
                selectinload(College.reviews),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_related(self, college: College, limit: int = 3) -> List[College]:
        """Return colleges in the same stream, excluding the given college."""
        stmt = (
            select(College)
            .options(selectinload(College.courses))
            .where(College.stream == college.stream, College.id != college.id)
            .order_by(College.rating.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().unique())

    async def get_all_slugs(self) -> List[str]:
        """Return every slug — used by Next.js generateStaticParams."""
        result = await self.db.execute(select(College.slug))
        return list(result.scalars())

    async def get_featured(self, limit: int = 6) -> List[College]:
        """Return featured colleges ordered by rating."""
        stmt = (
            select(College)
            .options(selectinload(College.courses))
            .where(College.is_featured == True)  # noqa: E712
            .order_by(College.rating.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().unique())

    async def increment_views(self, slug: str) -> None:
        """Bump view_count by 1 (fire-and-forget, non-critical)."""
        from sqlalchemy import update
        stmt = (
            update(College)
            .where(College.slug == slug)
            .values(view_count=College.view_count + 1)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def stream_counts(self) -> List[dict]:
        """Return [{name, count}] for every distinct stream."""
        stmt = (
            select(College.stream, func.count(College.id).label("count"))
            .group_by(College.stream)
            .order_by(func.count(College.id).desc())
        )
        result = await self.db.execute(stmt)
        return [{"name": row.stream, "count": row.count} for row in result]

    async def get_recommended_universities(self, limit: int = 3) -> List[College]:
        """Return featured colleges to show in the Recommended University section."""
        stmt = (
            select(College)
            .where(College.is_featured == True)  # noqa: E712
            .order_by(College.rating.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars())

    async def get_similar(self, college: College, limit: int = 8) -> List[College]:
        """Return colleges similar to the given one — same stream first,
        sorted by rating proximity, excluding the college itself."""
        stmt = (
            select(College)
            .options(selectinload(College.courses))
            .where(College.stream == college.stream, College.id != college.id)
            .order_by(College.rating.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        same_stream = list(result.scalars().unique())

        # If we still need more, top up from other streams
        if len(same_stream) < limit:
            needed = limit - len(same_stream)
            existing_ids = [c.id for c in same_stream] + [college.id]
            stmt2 = (
                select(College)
                .options(selectinload(College.courses))
                .where(College.id.notin_(existing_ids))
                .order_by(College.rating.desc())
                .limit(needed)
            )
            result2 = await self.db.execute(stmt2)
            same_stream.extend(result2.scalars().unique())

        return same_stream[:limit]
