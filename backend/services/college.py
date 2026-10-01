"""College service — business logic layer between routers and repositories."""

import math
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.college import College
from models.placement import Placement
from models.review import Review
from repositories.college import CollegeRepository
from schemas.college import (
    CollegeDetailSchema,
    CollegeFilterParams,
    CollegeListSchema,
    CourseSchema,
    CutoffSchema,
    PlacementSchema,
    RankingSchema,
    RatingBreakdownSchema,
    ReviewSchema,
)
from schemas.common import Meta


def _to_list_schema(college: College) -> CollegeListSchema:
    """Map ORM College → CollegeListSchema (camelCase, frontend-compatible)."""
    return CollegeListSchema(
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
        courses=[
            CourseSchema(
                name=c.name,
                duration=c.duration,
                mode=c.mode,
                fees=c.fees,
                exams=c.exams or [],
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


def _to_detail_schema(college: College) -> CollegeDetailSchema:
    base = _to_list_schema(college)

    # Latest placement record
    placement = None
    if college.placements:
        latest = sorted(college.placements, key=lambda p: p.year, reverse=True)[0]
        placement = PlacementSchema(
            year=latest.year,
            average=latest.average_package or "N/A",
            median=latest.median_package or "N/A",
            highest=latest.highest_package or "N/A",
            topRecruiters=latest.top_recruiters or [],
        )

    approved_reviews = [r for r in (college.reviews or []) if r.is_approved]

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
        cutoffs=[
            CutoffSchema(exam=c.exam, category=c.category, score=c.score)
            for c in (college.cutoffs or [])
        ],
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
        return (
            [_to_list_schema(c) for c in colleges],
            Meta(total=total, page=params.page, limit=params.limit, pages=pages),
        )

    async def get_college(self, slug: str) -> CollegeDetailSchema:
        college = await self.repo.get_by_slug(slug)
        if not college:
            raise NotFoundError("College")
        return _to_detail_schema(college)

    async def get_related(self, slug: str, limit: int = 3) -> List[CollegeListSchema]:
        college = await self.repo.get_by_slug(slug)
        if not college:
            raise NotFoundError("College")
        related = await self.repo.get_related(college, limit=limit)
        return [_to_list_schema(c) for c in related]

    async def get_all_slugs(self) -> List[str]:
        return await self.repo.get_all_slugs()

    async def get_featured(self, limit: int = 6) -> List[CollegeListSchema]:
        colleges = await self.repo.get_featured(limit=limit)
        return [_to_list_schema(c) for c in colleges]

    async def get_stream_counts(self) -> List[dict]:
        return await self.repo.stream_counts()

    async def get_recommended_universities(self, limit: int = 3):
        colleges = await self.repo.get_recommended_universities(limit=limit)
        return [
            {"slug": c.slug, "name": c.name, "city": c.city, "state": c.state}
            for c in colleges
        ]

    async def increment_views(self, slug: str) -> None:
        await self.repo.increment_views(slug)
