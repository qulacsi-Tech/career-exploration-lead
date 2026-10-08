from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.location import Location
from repositories.location import LocationRepository
from schemas.location import (
    CourseFeeSchema,
    FeaturedCollegeSchema,
    FeaturedStreamSchema,
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


def _to_home_schema(loc: Location, labels: List[str], colleges: dict) -> HomeLocationSchema:
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
        return [_to_home_schema(l, labels.get(l.id, []), colleges) for l in locs]

    async def get_location(self, slug: str) -> LocationSchema:
        loc = await self.repo.get_by_slug(slug)
        if not loc:
            raise NotFoundError("Location")
        return _to_schema(loc)
