"""College service — business logic layer between routers and repositories."""

import math
from typing import List, Optional, Tuple

from sqlalchemy import inspect as sa_inspect, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.college import College
from models.placement import Placement
from models.recruiter import Recruiter
from models.ranking import RankingEntry, RankingList
from models.review import Review
from repositories.college import CollegeRepository
from schemas.college import (
    CollegeDetailSchema,
    CollegeFilterParams,
    CollegeListSchema,
    CourseSchema,
    CutoffSchema,
    PlacementBreakdownSchema,
    PlacementSchema,
    RecruiterBrief,
    RankingRow,
    RankingSchema,
    RatingBreakdownSchema,
    ReviewSchema,
)
from schemas.college_detail import CollegeDetail
from schemas.common import Meta


def _latest_placement(college: College):
    """The newest placement year, when the college's placements were loaded with it (they are only on the listing)."""
    if "placements" in sa_inspect(college).unloaded:
        return None
    return max(college.placements or [], key=lambda p: p.year, default=None)


def _to_list_schema(college: College) -> CollegeListSchema:
    """Map ORM College → CollegeListSchema (camelCase, frontend-compatible)."""
    page_record = college.detail if isinstance(college.detail, dict) else {}
    placement = _latest_placement(college)
    return CollegeListSchema(
        nirfRank=(college.ranking_rank or None) if "nirf" in (college.ranking_authority or "").lower() and (college.ranking_rank or 0) > 0 else None,
        placementAverage=(placement.average_package or "") if placement else "",
        placementHighest=(placement.highest_package or "") if placement else "",
        status=college.status or "published",
        isFeatured=bool(college.is_featured),
        priority=college.priority,
        viewCount=college.view_count or 0,
        logo=page_record.get("logo") or "",
        brochureUrl=page_record.get("brochureUrl") or "",
        slug=college.slug,
        name=college.name,
        city=college.city,
        state=college.state,
        ownership=college.ownership.value if hasattr(college.ownership, "value") else str(college.ownership),
        stream=college.stream,
        ranking=RankingSchema(
            authority=college.ranking_authority or "NIRF",
            rank=college.ranking_rank or 0,
        ),
        rating=round(college.rating, 1),
        reviewCount=college.review_count,
        coursesOffered=college.courses_offered,
        feesRange=college.fees_range,
        examsAccepted=college.exams_accepted or [],
        tags=college.tags or [],
        approvals=college.approvals or [],
        image=college.image or "",
        courses=[
            CourseSchema(
                name=c.name,
                specialisation=c.specialisation or "",
                duration=c.duration,
                mode=c.mode,
                fees=c.fees,
                exams=c.exams or [],
                eligibility=c.eligibility or "",
                seats=c.seats,
                onlineOffered=bool(c.online_offered and c.online_enabled),
                onlineDuration=c.online_duration or "",
                onlineFees=c.online_fees or "",
            )
            for c in (college.courses or [])
        ],
    )


def _rating_breakdown(reviews: List[Review]) -> List[RatingBreakdownSchema]:
    """Compute average rating per category from approved reviews."""
    approved = [r for r in reviews if r.is_approved]
    if not approved:
        return []

    def avg(vals):
        vals = [v for v in vals if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    breakdown = [
        ("Placements", avg([r.rating_placements for r in approved])),
        ("Faculty", avg([r.rating_faculty for r in approved])),
        ("Infrastructure", avg([r.rating_infrastructure for r in approved])),
        ("Campus Life", avg([r.rating_campus_life for r in approved])),
    ]
    return [RatingBreakdownSchema(label=label, score=score) for label, score in breakdown if score is not None]


def _breakdown(placement: Placement) -> list[PlacementBreakdownSchema]:
    """A year's rows by category / course / specialisation. Stored junk is skipped rather than failing the page."""
    rows = []
    for raw in placement.breakdown or []:
        try:
            rows.append(PlacementBreakdownSchema.model_validate(raw))
        except Exception:
            continue
    return rows


def _to_detail_schema(college: College) -> CollegeDetailSchema:
    base = _to_list_schema(college)

    # Latest placement record
    placement = None
    if college.placements:
        latest = sorted(college.placements, key=lambda p: p.year, reverse=True)[0]
        placement = PlacementSchema(
            year=latest.year,
            yearStart=latest.year_start,
            average=latest.average_package or "N/A",
            median=latest.median_package or "N/A",
            highest=latest.highest_package or "N/A",
            topRecruiters=latest.top_recruiters or [],
            placedPercent=latest.placed_percent,
            breakdown=_breakdown(latest),
        )

    approved_reviews = [r for r in (college.reviews or []) if r.is_approved]

    history = [
        PlacementSchema(
            year=p.year,
            yearStart=p.year_start,
            average=p.average_package or "N/A",
            median=p.median_package or "N/A",
            highest=p.highest_package or "N/A",
            topRecruiters=p.top_recruiters or [],
            placedPercent=p.placed_percent,
            breakdown=_breakdown(p),
        )
        for p in sorted(college.placements or [], key=lambda p: p.year, reverse=True)
    ]
    try:
        extra = CollegeDetail.model_validate(college.detail or {})
    except Exception:  # stored junk never breaks the page: it shows without the extras
        extra = CollegeDetail()

    # Format review date as "D Mon YYYY"
    def fmt_date(d) -> str:
        if d is None:
            return ""
        try:
            return d.strftime("%-d %b %Y") if hasattr(d, "strftime") else str(d)
        except ValueError:
            # Windows does not support %-d
            return d.strftime("%d %b %Y").lstrip("0")

    return CollegeDetailSchema(
        **base.model_dump(),
        established=college.established,
        about=college.about,
        ratingBreakdown=_rating_breakdown(college.reviews or []),
        placement=placement,
        placements=history,
        cutoffs=[
            CutoffSchema(exam=c.exam, category=c.category, course=c.course or "", specialisation=c.specialisation or "", score=c.score)
            for c in (college.cutoffs or [])
        ],
        shortName=extra.shortName,
        tagline=extra.tagline,
        locality=extra.locality,
        updatedAt=college.updated_at.date().isoformat() if college.updated_at else "",
        faculty=extra.faculty,
        faqs=extra.faqs,
        similarSlugs=extra.similarSlugs,
        seo=extra.seo,
        gallery=extra.gallery,
        videos=extra.videos,
        media=extra.media,
        alerts=extra.alerts,
        articles=extra.articles,
        tabs=extra.tabs,
        tabHeaders={slug: header.model_dump() for slug, header in extra.tabHeaders.items()},
        reviews=[
            ReviewSchema(
                author=r.author_name,
                course=r.course,
                batch=r.batch,
                verified=r.verified,
                date=fmt_date(r.review_date),
                rating=r.rating,
                body=r.body,
            )
            for r in approved_reviews[:10]  # cap at 10 for detail page
        ],
    )


class CollegeService:
    def __init__(self, db: AsyncSession):
        self.repo = CollegeRepository(db)

    async def list_colleges(
        self, params: CollegeFilterParams
    ) -> Tuple[List[CollegeListSchema], Meta]:
        colleges, total = await self.repo.list(params)
        pages = math.ceil(total / params.limit) if params.limit else 1
        rows = [_to_list_schema(c) for c in colleges]
        if params.ranking_list and rows:
            # Filtering by a ranking list: each card shows its rank in that list, not its headline ranking.
            found = (await self.repo.db.execute(
                select(RankingList.authority, RankingEntry.college_slug, RankingEntry.rank)
                .join(RankingEntry, RankingEntry.ranking_list_id == RankingList.id)
                .where(RankingList.slug == params.ranking_list, RankingEntry.college_slug.in_([r.slug for r in rows]))
            )).all()
            by_slug = {f.college_slug: f for f in found}
            for row in rows:
                hit = by_slug.get(row.slug)
                row.ranking = RankingSchema(authority=hit.authority, rank=hit.rank) if hit else RankingSchema(authority="", rank=0)
        if rows:
            await self._attach_rankings(rows)
        return (
            rows,
            Meta(total=total, page=params.page, limit=params.limit, pages=pages),
        )

    async def _attach_rankings(self, rows: List[CollegeListSchema]) -> None:
        """Every ranking list each listed college is in, plus its headline rank when no list already says it."""
        found = (await self.repo.db.execute(
            select(RankingList.name, RankingList.year, RankingList.slug, RankingList.authority, RankingList.stream, RankingEntry.college_slug, RankingEntry.rank, RankingEntry.score)
            .join(RankingEntry, RankingEntry.ranking_list_id == RankingList.id)
            .where(RankingEntry.college_slug.in_([r.slug for r in rows]))
            .order_by(RankingEntry.rank, RankingList.year.desc())
        )).all()
        by_slug: dict[str, list[RankingRow]] = {}
        for name, year, list_slug, authority, stream, slug, rank, score in found:
            label = name if str(year) in name else f"{name} {year}"
            by_slug.setdefault(slug, []).append(
                RankingRow(name=label, rank=rank, slug=list_slug, authority=authority or "", stream=stream or "", score=score or "")
            )
        for row in rows:
            held = by_slug.get(row.slug, [])
            if row.nirfRank and not any("nirf" in h.name.lower() and h.rank == row.nirfRank for h in held):
                held = [RankingRow(name="NIRF", rank=row.nirfRank), *held]
            row.allRankings = held

    async def get_college(self, slug: str) -> CollegeDetailSchema:
        college = await self.repo.get_by_slug(slug)
        if not college:
            raise NotFoundError("College")
        detail = _to_detail_schema(college)
        # Every ranking list the college is in, for its Rankings tab.
        await self._attach_rankings([detail])
        await self._attach_recruiters(detail)
        return detail

    async def _attach_recruiters(self, detail: CollegeDetailSchema) -> None:
        """Each placement's companies with their logos, from the shared pool."""
        placements = [p for p in [detail.placement, *detail.placements] if p is not None]
        names = {n for p in placements for n in p.topRecruiters}
        if not names:
            return
        keys = {" ".join(n.split()).lower() for n in names}
        rows = (await self.repo.db.execute(select(Recruiter).where(Recruiter.name_key.in_(keys)))).scalars().all()
        by_key = {r.name_key: r for r in rows}
        for p in placements:
            p.recruiters = [
                RecruiterBrief(name=n, logo=(by_key[k].logo if (k := " ".join(n.split()).lower()) in by_key else "") or "", showName=bool(by_key[k].show_name) if k in by_key else True)
                for n in p.topRecruiters
            ]

    async def get_related(self, slug: str, limit: int = 3) -> List[CollegeListSchema]:
        college = await self.repo.get_by_slug(slug)
        if not college:
            raise NotFoundError("College")
        related = await self.repo.get_related(college, limit=limit)
        return [_to_list_schema(c) for c in related]

    async def facets(self) -> dict:
        return await self.repo.facets()

    async def get_all_slugs(self) -> List[str]:
        return await self.repo.get_all_slugs()

    async def get_featured(self, limit: int = 6) -> List[CollegeListSchema]:
        colleges = await self.repo.get_featured(limit=limit)
        return [_to_list_schema(c) for c in colleges]

    async def get_stream_counts(self) -> List[dict]:
        return await self.repo.stream_counts()

    async def get_recommended_universities(self, limit: int = 6):
        """The homepage's recommended colleges, in the order the admin set. Unknown slugs are skipped."""
        from sqlalchemy import select
        from models.site_content import SiteContent

        row = (await self.repo.db.execute(
            select(SiteContent).where(SiteContent.key == "home.recommendedUniversities")
        )).scalar_one_or_none()
        slugs = list(row.data)[:limit] if row and isinstance(row.data, list) else []
        if not slugs:
            return []
        rows = (await self.repo.db.execute(select(College).where(College.slug.in_(slugs), College.status == "published"))).scalars().all()
        by_slug = {c.slug: c for c in rows}
        return [
            {"slug": c.slug, "name": c.name, "city": c.city, "state": c.state, "image": c.image or "", "institutionType": c.institution_type or "College", "stream": c.stream or ""}
            for c in (by_slug[s] for s in slugs if s in by_slug)
        ]

    async def increment_views(self, slug: str) -> None:
        await self.repo.increment_views(slug)

    async def get_similar(self, slug: str, limit: int = 8) -> List[CollegeListSchema]:
        """Return colleges similar to the given one (same stream first, then any)."""
        college = await self.repo.get_by_slug(slug)
        if not college:
            raise NotFoundError("College")
        # The colleges the editor pinned come first, then the nearest by stream and rating.
        pinned_slugs = [s for s in ((college.detail or {}).get("similarSlugs") or []) if s != slug][:limit]
        pinned: list = []
        if pinned_slugs:
            found = (await self.repo.db.execute(select(College).where(College.slug.in_(pinned_slugs), College.status == "published").options(selectinload(College.courses)))).scalars().unique().all()
            by_slug = {c.slug: c for c in found}
            pinned = [by_slug[s] for s in pinned_slugs if s in by_slug]
        rest = await self.repo.get_similar(college, limit=limit + len(pinned))
        chosen = (pinned + [c for c in rest if c.id not in {p.id for p in pinned}])[:limit]
        return [_to_list_schema(c) for c in chosen]
