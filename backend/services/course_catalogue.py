import math
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.course_catalogue import CourseCatalogue
from models.specialisation import Specialisation
from repositories.course_catalogue import CourseCatalogueRepository
from schemas.common import Meta
from schemas.course_catalogue import (
    CourseCatalogueDetailSchema,
    CourseCatalogueListSchema,
    SpecialisationSchema,
)


class CollegeCounts:
    """How many directory colleges offer a course or a specialisation, counted live.

    A catalogue course "MBA" is offered by a college with a course named "MBA" or
    "MBA ..." ("MBA Finance", "MBA (Online)"); a specialisation "Finance" by a
    college with any course whose name contains it. An editor can still type a
    figure on the record: anything above 0 is shown instead of the count.
    """

    def __init__(self, pairs):
        self.pairs = [(cid, name.lower()) for cid, name in pairs]

    def course(self, name: str, stored: int) -> int:
        if stored > 0:
            return stored
        base = name.lower()
        return len({cid for cid, n in self.pairs if n == base or n.startswith(base + " ")})

    def specialisation(self, name: str, stored: int) -> int:
        if stored > 0:
            return stored
        needle = name.lower()
        return len({cid for cid, n in self.pairs if needle in n})


def _spec_schema(s: Specialisation, counts: "CollegeCounts") -> SpecialisationSchema:
    return SpecialisationSchema(
        slug=s.slug,
        name=s.name,
        courseSlug=s.course_slug,
        courseName=s.course_name,
        stream=s.stream,
        duration=s.duration,
        averageFees=s.average_fees,
        collegeCount=counts.specialisation(s.name, s.college_count),
        about=s.about,
    )


def _to_list_schema(c: CourseCatalogue, counts: "CollegeCounts") -> CourseCatalogueListSchema:
    return CourseCatalogueListSchema(
        slug=c.slug,
        name=c.name,
        fullName=c.full_name,
        level=c.level,
        stream=c.stream,
        duration=c.duration,
        modes=c.modes or [],
        eligibility=c.eligibility,
        averageFees=c.average_fees,
        examsAccepted=c.exams_accepted or [],
        collegeCount=counts.course(c.name, c.college_count),
        about=c.about,
    )


def _to_detail_schema(c: CourseCatalogue, counts: "CollegeCounts") -> CourseCatalogueDetailSchema:
    base = _to_list_schema(c, counts)
    return CourseCatalogueDetailSchema(
        **base.model_dump(),
        specialisations=[_spec_schema(s, counts) for s in (c.specialisations or [])],
    )


class CourseCatalogueService:
    def __init__(self, db: AsyncSession):
        self.repo = CourseCatalogueRepository(db)

    async def list_courses(
        self,
        page: int = 1,
        limit: int = 50,
        stream: Optional[str] = None,
        level: Optional[str] = None,
    ) -> Tuple[List[CourseCatalogueListSchema], Meta]:
        courses, total = await self.repo.list(page=page, limit=limit, stream=stream, level=level)
        pages = math.ceil(total / limit) if limit else 1
        counts = CollegeCounts(await self.repo.college_course_names())
        return [_to_list_schema(c, counts) for c in courses], Meta(total=total, page=page, limit=limit, pages=pages)

    async def get_course(self, slug: str) -> CourseCatalogueDetailSchema:
        course = await self.repo.get_by_slug(slug)
        if not course:
            raise NotFoundError("Course")
        return _to_detail_schema(course, CollegeCounts(await self.repo.college_course_names()))

    async def get_all_slugs(self) -> List[str]:
        return await self.repo.get_all_slugs()
