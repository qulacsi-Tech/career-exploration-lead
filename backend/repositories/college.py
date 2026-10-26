"""College repository — all DB queries for colleges and related sub-resources."""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import Numeric, String, and_, case, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.college import College
from models.course import Course
from models.course_catalogue import CourseCatalogue
from models.specialisation import Specialisation
from models.cutoff import Cutoff
from models.placement import Placement
from models.ranking import RankingEntry, RankingList
from models.review import Review
from schemas.college import CollegeFilterParams


# Course-name patterns behind the level and credential facets. Courses carry no
# level column, so it is read from the name the way a reader would: "B.Tech" is
# undergraduate, "MBA" postgraduate, "Ph.D." doctoral.
_LEVEL_PATTERNS = {
    "UG": ["B.%", "BBA%", "BCA%", "MBBS%", "BDS%", "B %"],
    "PG": ["M.%", "MBA%", "MCA%", "PGDM%", "PG %", "MD %", "MS %", "Executive MBA%"],
    "Doctorate": ["Ph.D%", "PhD%", "Doctor%"],
}
_CREDENTIAL_PATTERNS = {
    "Diploma": ["%diploma%", "PGDM%"],
    "Doctorate": ["Ph.D%", "PhD%", "Doctor%"],
}


def _min_fee_lakh():
    """The lowest fee in a college's `fees_range`, in lakh rupees.

    `fees_range` is editor-written text: "₹9.5L - 21L", "₹65K-3L", "INR 4,00,000".
    The first number is the lowest. Its unit (K, L, Cr) is read from just after
    it, falling back to the last unit in the text for "₹5-10L"; a bare figure of
    1000 or more is rupees. Anything unparseable gives NULL, which no fee bound
    matches.
    """
    text = func.replace(College.fees_range, ",", "")
    num = cast(func.substring(text, r"([0-9]+\.?[0-9]*)"), Numeric)
    unit = func.upper(
        func.coalesce(
            func.substring(text, r"^[^0-9]*[0-9]+\.?[0-9]*\s*([KkLlCc])"),
            func.substring(text, r"([KkLlCc])[A-Za-z]*\s*$"),
        )
    )
    return case(
        (unit == "K", num / 100),
        (unit == "L", num),
        (unit == "C", num * 100),
        (num >= 1000, num / 100000),
        else_=num,
    )


def _course_matches(*conditions):
    # EXISTS keeps one row per college, unlike a join.
    return College.courses.any(and_(*conditions))


def _name_like(patterns):
    return or_(*[Course.name.ilike(p) for p in patterns])


def _apply_filters(stmt, params: CollegeFilterParams):
    """Apply all optional filter/sort criteria to an existing SELECT statement."""
    # The public site shows published colleges; the admin list asks for "all" or one status.
    if params.status != "all":
        stmt = stmt.where(College.status == (params.status or "published"))
    if params.stream:
        # The first category, or any of the several a college can be listed under.
        stmt = stmt.where(or_(College.stream.ilike(f"%{params.stream}%"), cast(College.streams, String).ilike(f"%{params.stream}%")))
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
    if params.course:
        # Matches the course name itself or a variant ("MBA" vs "MBA (Online)").
        # EXISTS keeps one row per college, unlike a join.
        stmt = stmt.where(
            College.courses.any(
                or_(
                    Course.name.ilike(params.course),
                    Course.name.ilike(f"{params.course} %"),
                )
            )
        )
    if params.mode:
        stmt = stmt.where(_course_matches(Course.mode.ilike(f"%{params.mode}%")))
    if params.specialisation:
        stmt = stmt.where(
            _course_matches(or_(Course.name.ilike(f"%{params.specialisation}%"), Course.specialisation.ilike(f"%{params.specialisation}%")))
        )
    if params.level in _LEVEL_PATTERNS:
        stmt = stmt.where(_course_matches(_name_like(_LEVEL_PATTERNS[params.level])))
    if params.credential == "Degree":
        # Everything that is neither a diploma nor a doctorate.
        stmt = stmt.where(
            _course_matches(
                ~_name_like(_CREDENTIAL_PATTERNS["Diploma"] + _CREDENTIAL_PATTERNS["Doctorate"])
            )
        )
    elif params.credential in _CREDENTIAL_PATTERNS:
        stmt = stmt.where(_course_matches(_name_like(_CREDENTIAL_PATTERNS[params.credential])))
    if params.fees_min is not None:
        stmt = stmt.where(_min_fee_lakh() >= params.fees_min)
    if params.fees_max is not None:
        stmt = stmt.where(_min_fee_lakh() < params.fees_max)
    if params.min_rating:
        stmt = stmt.where(College.rating >= params.min_rating)
    if params.ranking_max:
        stmt = stmt.where(College.ranking_rank <= params.ranking_max)
    list_rank = None
    if params.ranking_list:
        # The college's rank in that list; a college not in it is left out.
        list_rank = (
            select(RankingEntry.rank)
            .join(RankingList, RankingEntry.ranking_list_id == RankingList.id)
            .where(RankingList.slug == params.ranking_list, RankingEntry.college_slug == College.slug)
            .scalar_subquery()
        )
        stmt = stmt.where(list_rank.is_not(None))
    if params.q:
        term = f"%{params.q}%"
        stmt = stmt.where(
            or_(College.name.ilike(term), College.city.ilike(term), College.about.ilike(term))
        )
    if params.slugs is not None:
        stmt = stmt.where(College.slug.in_(params.slugs))
    if params.exclude_slugs:
        stmt = stmt.where(College.slug.not_in(params.exclude_slugs))

    # Sort
    # Every order ends on the name and id, so ties (most colleges have no reviews yet) fall the same way
    # on every request and on every page, instead of in whatever order the database happens to return.
    if params.sort == "newest":
        stmt = stmt.order_by(College.created_at.desc(), College.id)
    elif params.sort == "rating":
        stmt = stmt.order_by(College.rating.desc(), College.name, College.id)
    elif params.sort == "views":
        stmt = stmt.order_by(College.view_count.desc(), College.name, College.id)
    elif params.sort == "name":
        # A tie-break on id keeps the order stable from one page to the next.
        stmt = stmt.order_by(College.name, College.id)
    elif params.sort == "ranking":
        stmt = stmt.order_by(
            case(
                (or_(College.ranking_rank.is_(None), College.ranking_rank <= 0), 1),
                else_=0,
            ),
            College.ranking_rank.asc(),
            College.review_count.desc(),
            College.name,
            College.id,
        )
    elif params.slugs is not None:  # a hand-picked collection keeps the editor's order, ranked first when a list is named
        position = case(*[(College.slug == slug, i) for i, slug in enumerate(params.slugs)], else_=len(params.slugs))
        if params.order_list:
            picked_rank = (
                select(func.min(RankingEntry.rank))
                .join(RankingList, RankingEntry.ranking_list_id == RankingList.id)
                .where(RankingList.slug == params.order_list, RankingEntry.college_slug == College.slug)
                .scalar_subquery()
            )
            stmt = stmt.order_by(func.coalesce(picked_rank, 1000000), position, College.id)
        else:
            stmt = stmt.order_by(position, College.id)
    elif list_rank is not None:  # popularity inside a ranking list is the list's own order
        stmt = stmt.order_by(list_rank, College.id)
    else:  # popularity (default)
        stmt = stmt.order_by(College.review_count.desc(), College.name, College.id)

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

    async def get_by_slug(self, slug: str, published_only: bool = True) -> Optional[College]:
        """Return full college with all relations loaded. A draft or archived college is not public."""
        stmt = (
            select(College)
            .where(College.slug == slug, *([College.status == "published"] if published_only else []))
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
            .where(College.stream == college.stream, College.id != college.id, College.status == "published")
            .order_by(College.rating.desc(), College.name)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().unique())

    async def facets(self) -> dict:
        """The values the listing's filter menus offer, read from the directory.

        Cities, exams, approvals and modes are whatever colleges actually carry;
        courses and specialisations come from the published catalogue.
        """
        live = College.status == "published"

        async def column(stmt) -> List[str]:
            rows = (await self.db.execute(stmt)).scalars()
            return sorted({str(v).strip() for v in rows if v and str(v).strip()}, key=str.lower)

        return {
            "streams": await column(select(func.jsonb_array_elements_text(College.streams)).where(live).distinct()),
            "cities": await column(select(College.city).where(live).distinct()),
            "exams": await column(select(func.jsonb_array_elements_text(College.exams_accepted)).where(live).distinct()),
            "approvals": await column(select(func.jsonb_array_elements_text(College.approvals)).where(live).distinct()),
            "modes": await column(select(Course.mode).where(Course.college_id.in_(select(College.id).where(live))).distinct()),
            "courses": await column(select(CourseCatalogue.name).where(CourseCatalogue.is_published == True)),  # noqa: E712
            "specialisations": await column(select(Specialisation.name).distinct()),
        }

    async def get_all_slugs(self) -> List[str]:
        """Return every slug — used by Next.js generateStaticParams."""
        result = await self.db.execute(select(College.slug).where(College.status == "published"))
        return list(result.scalars())

    async def get_featured(self, limit: int = 6) -> List[College]:
        """Return featured colleges ordered by rating."""
        stmt = (
            select(College)
            .options(selectinload(College.courses))
            .where(College.is_featured == True, College.status == "published")  # noqa: E712
            .order_by(College.rating.desc(), College.name)
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
            .where(College.status == "published")
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
        try:
            conditions = [College.id != college.id, College.status == "published"]
            if college.stream:
                conditions.append(College.stream == college.stream)

            stmt = (
                select(College)
                .options(selectinload(College.courses))
                .where(*conditions)
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
                    .where(College.id.notin_(existing_ids), College.status == "published")
                    .order_by(College.rating.desc(), College.name)
                    .limit(needed)
                )
                result2 = await self.db.execute(stmt2)
                same_stream.extend(result2.scalars().unique())

            return same_stream[:limit]
        except Exception:
            return []
