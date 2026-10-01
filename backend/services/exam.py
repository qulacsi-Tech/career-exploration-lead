import math
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.exam import Exam
from repositories.exam import ExamRepository
from schemas.common import Meta
from schemas.exam import ExamSchema


def _to_schema(exam: Exam) -> ExamSchema:
    return ExamSchema(
        slug=exam.slug,
        name=exam.name,
        conductingBody=exam.conducting_body,
        level=exam.level.value if hasattr(exam.level, "value") else str(exam.level),
        description=exam.description,
        registrationCloses=exam.registration_closes,
        examDate=exam.exam_date,
        mode=exam.mode,
        frequency=exam.frequency,
        applicationFee=exam.application_fee,
        officialSite=exam.official_site,
        durationMinutes=exam.duration_minutes,
        sections=exam.sections,
    )


class ExamService:
    def __init__(self, db: AsyncSession):
        self.repo = ExamRepository(db)

    async def list_exams(
        self,
        page: int = 1,
        limit: int = 20,
        stream: Optional[str] = None,
        level: Optional[str] = None,
        featured: Optional[bool] = None,
        q: Optional[str] = None,
    ) -> Tuple[List[ExamSchema], Meta]:
        exams, total = await self.repo.list(page=page, limit=limit, stream=stream, level=level, featured=featured, q=q)
        pages = math.ceil(total / limit) if limit else 1
        return [_to_schema(e) for e in exams], Meta(total=total, page=page, limit=limit, pages=pages)

    async def get_exam(self, slug: str) -> ExamSchema:
        exam = await self.repo.get_by_slug(slug)
        if not exam:
            raise NotFoundError("Exam")
        return _to_schema(exam)

    async def get_featured(self, limit: int = 6) -> List[ExamSchema]:
        exams = await self.repo.get_featured(limit=limit)
        return [_to_schema(e) for e in exams]
