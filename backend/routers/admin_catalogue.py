"""Admin catalogue: courses and their specialisations. ADMIN role required on every route.

Only the fields the admin editor edits are accepted. College counts are derived
from the directory and are not writable here. A specialisation carries its
parent course's name and stream, so a course rename or stream change is copied
to its specialisations in the same transaction.
"""

import uuid
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select, update

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.course_catalogue import CourseCatalogue
from models.specialisation import Specialisation
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin", tags=["admin"])

SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"
Level = Literal["UG", "PG", "Diploma", "Doctorate"]


class CourseCreateBody(BaseModel):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)
    name: str = Field(min_length=1, max_length=200)
    fullName: str = Field(min_length=2, max_length=500)
    level: Level
    stream: str = Field(min_length=1, max_length=100)
    duration: str = Field(min_length=1, max_length=100)
    modes: list[str] = Field(default_factory=list, max_length=10)
    eligibility: Optional[str] = Field(default=None, max_length=4000)
    averageFees: Optional[str] = Field(default=None, max_length=100)
    examsAccepted: list[str] = Field(default_factory=list, max_length=30)
    about: Optional[str] = Field(default=None, max_length=4000)
    model_config = ConfigDict(extra="forbid")


class CourseUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    fullName: Optional[str] = Field(default=None, min_length=2, max_length=500)
    level: Optional[Level] = None
    stream: Optional[str] = Field(default=None, min_length=1, max_length=100)
    duration: Optional[str] = Field(default=None, min_length=1, max_length=100)
    modes: Optional[list[str]] = Field(default=None, max_length=10)
    eligibility: Optional[str] = Field(default=None, max_length=4000)
    averageFees: Optional[str] = Field(default=None, max_length=100)
    examsAccepted: Optional[list[str]] = Field(default=None, max_length=30)
    about: Optional[str] = Field(default=None, max_length=4000)
    model_config = ConfigDict(extra="forbid")


class SpecialisationCreateBody(BaseModel):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)
    name: str = Field(min_length=1, max_length=200)
    courseSlug: str = Field(min_length=2, max_length=200)
    duration: Optional[str] = Field(default=None, max_length=100)
    averageFees: Optional[str] = Field(default=None, max_length=100)
    about: Optional[str] = Field(default=None, max_length=4000)
    model_config = ConfigDict(extra="forbid")


class SpecialisationUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    courseSlug: Optional[str] = Field(default=None, min_length=2, max_length=200)
    duration: Optional[str] = Field(default=None, max_length=100)
    averageFees: Optional[str] = Field(default=None, max_length=100)
    about: Optional[str] = Field(default=None, max_length=4000)
    model_config = ConfigDict(extra="forbid")


NULLABLE_COURSE_FIELDS = {"eligibility", "averageFees", "about"}
NULLABLE_SPEC_FIELDS = {"duration", "averageFees", "about"}


def _reject_nulls(changes: dict, nullable: set[str]) -> None:
    """A field that cannot be empty may not be cleared; nullable ones may."""
    for key, value in changes.items():
        if value is None and key not in nullable:
            raise ValidationError(f"{key}: cannot be empty.")


def _validate(model: type[BaseModel], raw: dict) -> BaseModel:
    try:
        return model.model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


def _course_out(c: CourseCatalogue, specs: list[Specialisation]) -> dict:
    return {
        "id": str(c.id),
        "slug": c.slug,
        "name": c.name,
        "fullName": c.full_name,
        "level": c.level,
        "stream": c.stream,
        "duration": c.duration,
        "modes": c.modes or [],
        "eligibility": c.eligibility,
        "averageFees": c.average_fees,
        "examsAccepted": c.exams_accepted or [],
        "collegeCount": c.college_count,
        "about": c.about,
        "isPublished": c.is_published,
        "specialisations": [_spec_out(s) for s in specs],
    }


def _spec_out(s: Specialisation) -> dict:
    return {
        "id": str(s.id),
        "slug": s.slug,
        "name": s.name,
        "courseSlug": s.course_slug,
        "courseName": s.course_name,
        "stream": s.stream,
        "duration": s.duration,
        "averageFees": s.average_fees,
        "collegeCount": s.college_count,
        "about": s.about,
    }


async def _course_by_slug(db, slug: str) -> CourseCatalogue:
    course = (await db.execute(select(CourseCatalogue).where(CourseCatalogue.slug == slug))).scalar_one_or_none()
    if course is None:
        raise NotFoundError("Course")
    return course


async def _spec_by_slug(db, slug: str) -> Specialisation:
    spec = (await db.execute(select(Specialisation).where(Specialisation.slug == slug))).scalar_one_or_none()
    if spec is None:
        raise NotFoundError("Specialisation")
    return spec


@router.get("/catalogue", response_model=SuccessResponse[list])
async def admin_catalogue(_admin: AdminPayload, db: DbSession):
    """Every course, published or not, with its specialisations nested."""
    courses = (await db.execute(select(CourseCatalogue).order_by(CourseCatalogue.name))).scalars().all()
    specs = (await db.execute(select(Specialisation).order_by(Specialisation.name))).scalars().all()
    by_course: dict[uuid.UUID, list[Specialisation]] = {}
    for s in specs:
        by_course.setdefault(s.course_id, []).append(s)
    return SuccessResponse[list](data=[_course_out(c, by_course.get(c.id, [])) for c in courses])


@router.post("/courses", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_course(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(CourseCreateBody, body)
    taken = (await db.execute(select(CourseCatalogue.id).where(CourseCatalogue.slug == data.slug))).scalar_one_or_none()
    if taken is not None:
        raise ConflictError("COURSE_SLUG_TAKEN", f"A course with slug '{data.slug}' already exists.")

    course = CourseCatalogue(
        id=uuid.uuid4(),
        slug=data.slug,
        name=data.name,
        full_name=data.fullName,
        level=data.level,
        stream=data.stream,
        duration=data.duration,
        modes=data.modes,
        eligibility=data.eligibility,
        average_fees=data.averageFees,
        exams_accepted=data.examsAccepted,
        college_count=0,
        about=data.about,
        is_published=True,
    )
    db.add(course)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Course '{data.slug}' created."})


@router.patch("/courses/{slug}", response_model=SuccessResponse[dict])
async def admin_update_course(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(CourseUpdateBody, body)
    course = await _course_by_slug(db, slug)
    changes = data.model_dump(exclude_unset=True)
    _reject_nulls(changes, NULLABLE_COURSE_FIELDS)

    mapping = {
        "name": "name", "fullName": "full_name", "level": "level", "stream": "stream",
        "duration": "duration", "modes": "modes", "eligibility": "eligibility",
        "averageFees": "average_fees", "examsAccepted": "exams_accepted", "about": "about",
    }
    values = {mapping[k]: v for k, v in changes.items()}
    if not values:
        return SuccessResponse[dict](data={"message": "Nothing to update."})

    for column, value in values.items():
        setattr(course, column, value)

    # Keep the specialisations' copies of the course name and stream in step.
    if "name" in values or "stream" in values:
        await db.execute(
            update(Specialisation)
            .where(Specialisation.course_id == course.id)
            .values(course_name=course.name, stream=course.stream)
        )
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Course '{slug}' updated."})


@router.post("/specialisations", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_specialisation(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(SpecialisationCreateBody, body)
    taken = (await db.execute(select(Specialisation.id).where(Specialisation.slug == data.slug))).scalar_one_or_none()
    if taken is not None:
        raise ConflictError("SPECIALISATION_SLUG_TAKEN", f"A specialisation with slug '{data.slug}' already exists.")
    course = await _course_by_slug(db, data.courseSlug)

    spec = Specialisation(
        id=uuid.uuid4(),
        slug=data.slug,
        name=data.name,
        course_id=course.id,
        course_slug=course.slug,
        course_name=course.name,
        stream=course.stream,
        duration=data.duration,
        average_fees=data.averageFees,
        college_count=0,
        about=data.about,
    )
    db.add(spec)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Specialisation '{data.slug}' created."})


@router.patch("/specialisations/{slug}", response_model=SuccessResponse[dict])
async def admin_update_specialisation(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(SpecialisationUpdateBody, body)
    spec = await _spec_by_slug(db, slug)
    changes = data.model_dump(exclude_unset=True)
    _reject_nulls(changes, NULLABLE_SPEC_FIELDS)

    if "courseSlug" in changes and changes["courseSlug"] is not None:
        course = await _course_by_slug(db, changes.pop("courseSlug"))
        spec.course_id = course.id
        spec.course_slug = course.slug
        spec.course_name = course.name
        spec.stream = course.stream
    else:
        changes.pop("courseSlug", None)

    for key, column in {"name": "name", "duration": "duration", "averageFees": "average_fees", "about": "about"}.items():
        if key in changes:
            setattr(spec, column, changes[key])
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Specialisation '{slug}' updated."})
