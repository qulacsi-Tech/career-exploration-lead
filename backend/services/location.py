import re
from html import unescape
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.location import Location
from repositories.location import LocationRepository
from schemas.location import (
    CourseFeeSchema,
    FeaturedCollegeSchema,
    FeaturedStreamSchema,
    HighlightCollegeSchema,
    HomeLocationSchema,
    LocationSchema,
)


def stream_slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def _to_schema(loc: Location) -> LocationSchema:
    return LocationSchema(
        slug=loc.slug,
        name=loc.name,
        state=loc.state,
        collegeCount=loc.college_count,
    )


def _featured(loc: Location, colleges: dict) -> List[FeaturedStreamSchema]:
    out = []
    for row in loc.featured or []:
        name = row.get("stream", "")
        if not name:
            continue
        # A college deleted since it was picked simply drops off the card.
        picked = [
            FeaturedCollegeSchema(slug=s, name=colleges[s][0]) for s in row.get("colleges", []) if s in colleges
        ]
        out.append(FeaturedStreamSchema(stream=stream_slug(name), name=name, colleges=picked))
    return out


def _excerpt(html: str | None, limit: int = 170) -> str:
    """The start of a college's About text as plain text, cut at a word."""
    text = unescape(re.sub(r"<[^>]*>", " ", html or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",.;:") + "…"


def _highlight(loc: Location, highlights: dict) -> HighlightCollegeSchema | None:
    college = highlights.get(loc.highlight_college or "")
    if college is None:
        return None
    latest = max(college.placements or [], key=lambda p: p.year, default=None)
    return HighlightCollegeSchema(
        slug=college.slug,
        name=college.name,
        image=college.image or "",
        rankingAuthority=college.ranking_authority,
        rank=college.ranking_rank,
        rating=college.rating or None,
        avgPackage=(latest.average_package or "") if latest else "",
        coursesOffered=college.courses_offered or 0,
        city=college.city,
        state=college.state,
        stream=college.stream,
        established=college.established,
        ownership=getattr(college.ownership, "value", college.ownership) or "",
        about=_excerpt(college.about),
    )


def _to_home_schema(loc: Location, labels: List[str], colleges: dict, highlights: dict) -> HomeLocationSchema:
    return HomeLocationSchema(
        slug=loc.slug,
        name=loc.name,
        state=loc.state,
        collegeCount=loc.college_count,
        labels=labels,
        courseFees=[CourseFeeSchema(**row) for row in (loc.course_fees or []) if row.get("category")],
        description=loc.description,
        avgPackage=loc.avg_package,
        image=loc.image,
        featured=_featured(loc, colleges),
        imageCaption=loc.image_caption or "",
        highlightCollege=_highlight(loc, highlights),
        nirfRank=loc.nirf_rank,
        otherRankLabel=loc.other_rank_label or "",
        otherRank=loc.other_rank,
        topRating=loc.top_rating,
    )


class LocationService:
    def __init__(self, db: AsyncSession):
        self.repo = LocationRepository(db)

    async def list_locations(self) -> List[LocationSchema]:
        locs = await self.repo.list_all()
        return [_to_schema(l) for l in locs]

    async def list_home_locations(self) -> List[HomeLocationSchema]:
        locs = await self.repo.list_for_home()
        labels = await self.repo.labels_for([l.id for l in locs])
        picked = sorted({s for l in locs for row in (l.featured or []) for s in row.get("colleges", [])})
        colleges = await self.repo.college_names(picked)
        highlights = await self.repo.highlight_colleges(sorted({l.highlight_college for l in locs if l.highlight_college}))
        return [_to_home_schema(l, labels.get(l.id, []), colleges, highlights) for l in locs]

    async def get_location(self, slug: str) -> LocationSchema:
        loc = await self.repo.get_by_slug(slug)
        if not loc:
            raise NotFoundError("Location")
        return _to_schema(loc)
