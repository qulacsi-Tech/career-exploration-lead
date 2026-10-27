"""Admin catalogue: courses and specialisations. ADMIN role required on every route.

The editor takes a name and the parents: a course names the categories it sits under, a
specialisation the courses it sits under (one or several each), and the slug is made from the
name. Everything else about a programme (fees, duration, eligibility) is entered per college.
The first parent is also kept in the single-parent columns (`stream`, `course_slug`) that the
public course pages read; a course rename or category change is copied to the specialisations
linked that way in the same transaction.
"""

import re
import uuid
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select, update

from core.dependencies import AdminPayload, DbSession
from core.validation import check_duration, check_fees, validate_body
from core.exceptions import ConflictError, NotFoundError, ValidationError
from core import college_rules as rules
from models.course import Course
from models.college import College
from models.exam import Exam
from models.course_catalogue import CourseCatalogue
from models.specialisation import Specialisation
from repositories.course_catalogue import CourseCatalogueRepository
from schemas.common import SuccessResponse
from services.course_catalogue import CollegeCounts

router = APIRouter(prefix="/admin", tags=["admin"])

SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


async def _free_slug(db, model, name: str) -> str:
    """A slug from the name that no row of `model` uses yet: mba, then mba-2, mba-3."""
    base = _slugify(name) or "item"
    slug, n = base, 1
    while (await db.execute(select(model.id).where(model.slug == slug))).scalar_one_or_none() is not None:
        n += 1
        slug = f"{base}-{n}"
    return slug
Level = Literal["UG", "PG", "Diploma", "Doctorate"]


class _FormatChecks(BaseModel):
    """Duration and fee format rules, shared by the create and update bodies."""

    @field_validator("duration", check_fields=False)
    @classmethod
    def _duration(cls, value):
        return check_duration(value)

    @field_validator("averageFees", check_fields=False)
    @classmethod
    def _fees(cls, value):
        return check_fees(value)


class CourseCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    streams: list[str] = Field(min_length=1, max_length=20)
    model_config = ConfigDict(extra="forbid")


class CourseUpdateBody(_FormatChecks):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    streams: Optional[list[str]] = Field(default=None, min_length=1, max_length=20)
    fullName: Optional[str] = Field(default=None, min_length=2, max_length=500)
    level: Optional[Level] = None
    duration: Optional[str] = Field(default=None, min_length=1, max_length=100)
    modes: Optional[list[str]] = Field(default=None, max_length=10)
    eligibility: Optional[str] = Field(default=None, max_length=4000)
    averageFees: Optional[str] = Field(default=None, max_length=100)
    examsAccepted: Optional[list[str]] = Field(default=None, max_length=30)
    collegeCount: Optional[int] = Field(default=None, ge=0, le=1_000_000)
    about: Optional[str] = Field(default=None, max_length=4000)
    model_config = ConfigDict(extra="forbid")


class SpecialisationCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    courseSlugs: list[str] = Field(min_length=1, max_length=50)
    model_config = ConfigDict(extra="forbid")


class SpecialisationUpdateBody(_FormatChecks):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    courseSlugs: Optional[list[str]] = Field(default=None, min_length=1, max_length=50)
    duration: Optional[str] = Field(default=None, max_length=100)
    averageFees: Optional[str] = Field(default=None, max_length=100)
    collegeCount: Optional[int] = Field(default=None, ge=0, le=1_000_000)
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
    return validate_body(model, raw)


def _course_out(c: CourseCatalogue, counts: CollegeCounts) -> dict:
    return {
        "id": str(c.id),
        "slug": c.slug,
        "name": c.name,
        "fullName": c.full_name,
        "level": c.level,
        "stream": c.stream,
        "streams": c.streams or ([c.stream] if c.stream else []),
        "duration": c.duration,
        "modes": c.modes or [],
        "eligibility": c.eligibility,
        "averageFees": c.average_fees,
        "examsAccepted": c.exams_accepted or [],
        "collegeCount": c.college_count,
        # What the site shows: the typed figure if there is one, else the live count.
        "shownCount": counts.course(c.name, c.college_count),
        "about": c.about,
        "priority": c.priority,
        "isPublished": c.is_published,
    }


def _spec_out(s: Specialisation, counts: CollegeCounts) -> dict:
    return {
        "id": str(s.id),
        "slug": s.slug,
        "name": s.name,
        "courseSlug": s.course_slug,
        "courseName": s.course_name,
        "courseSlugs": s.course_slugs or ([s.course_slug] if s.course_slug else []),
        "stream": s.stream,
        "duration": s.duration,
        "averageFees": s.average_fees,
        "collegeCount": s.college_count,
        "shownCount": counts.specialisation(s.name, s.college_count),
        "about": s.about,
    }


async def _course_by_slug(db, slug: str) -> CourseCatalogue:
    course = (await db.execute(select(CourseCatalogue).where(CourseCatalogue.slug == slug))).scalar_one_or_none()
    if course is None:
        raise NotFoundError("Course")
    return course


async def _reject_duplicate(db, name: str, level: str, except_id=None) -> None:
    """Two courses with the same short name and level are the same course under another address."""
    stmt = select(CourseCatalogue.slug).where(
        func.lower(func.trim(CourseCatalogue.name)) == name.strip().lower(),
        CourseCatalogue.level == level,
    )
    if except_id is not None:
        stmt = stmt.where(CourseCatalogue.id != except_id)
    existing = (await db.execute(stmt)).scalars().first()
    if existing is not None:
        raise ConflictError("COURSE_DUPLICATE", f"A {level} course named '{name.strip()}' already exists ('{existing}').")


async def _spec_by_slug(db, slug: str) -> Specialisation:
    spec = (await db.execute(select(Specialisation).where(Specialisation.slug == slug))).scalar_one_or_none()
    if spec is None:
        raise NotFoundError("Specialisation")
    return spec


@router.get("/catalogue", response_model=SuccessResponse[dict])
async def admin_catalogue(_admin: AdminPayload, db: DbSession):
    """Both lists, every row published or not: the courses, and the specialisations on their own."""
    courses = (await db.execute(select(CourseCatalogue).order_by(CourseCatalogue.name))).scalars().all()
    specs = (await db.execute(select(Specialisation).order_by(Specialisation.name))).scalars().all()
    counts = CollegeCounts(await CourseCatalogueRepository(db).college_course_names())
    return SuccessResponse[dict](data={
        "courses": [_course_out(c, counts) for c in courses],
        "specialisations": [_spec_out(s, counts) for s in specs],
    })


def _clean_names(values: list[str]) -> list[str]:
    seen: list[str] = []
    for v in values:
        v = v.strip()
        if v and v not in seen:
            seen.append(v)
    return seen


@router.post("/courses", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_course(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(CourseCreateBody, body)
    streams = _clean_names(data.streams)
    if not streams:
        raise ValidationError("streams: choose a category.")
    same = (await db.execute(select(CourseCatalogue.slug).where(func.lower(func.trim(CourseCatalogue.name)) == data.name.strip().lower()))).scalars().first()
    if same is not None:
        raise ConflictError("COURSE_DUPLICATE", f"A course named '{data.name.strip()}' already exists.")
    slug = await _free_slug(db, CourseCatalogue, data.name)

    db.add(CourseCatalogue(
        id=uuid.uuid4(),
        slug=slug,
        name=data.name.strip(),
        full_name=data.name.strip(),
        level="",
        stream=streams[0],
        streams=streams,
        duration="",
        modes=[],
        exams_accepted=[],
        college_count=0,
        is_published=True,
    ))
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Course '{slug}' created."})


class DeleteBody(BaseModel):
    slugs: list[str] = Field(min_length=1, max_length=200)
    model_config = ConfigDict(extra="forbid")


@router.post("/courses/delete", response_model=SuccessResponse[dict])
async def admin_delete_courses(_admin: AdminPayload, db: DbSession, body: dict):
    """Deletes the chosen courses, and their specialisations with them (cascade)."""
    data = _validate(DeleteBody, body)
    courses = (await db.execute(select(CourseCatalogue).where(CourseCatalogue.slug.in_(data.slugs)))).scalars().all()
    for course in courses:
        await db.delete(course)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"{len(courses)} course(s) deleted.", "deleted": len(courses)})


@router.patch("/courses/{slug}", response_model=SuccessResponse[dict])
async def admin_update_course(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(CourseUpdateBody, body)
    course = await _course_by_slug(db, slug)
    changes = data.model_dump(exclude_unset=True)
    _reject_nulls(changes, NULLABLE_COURSE_FIELDS)

    if "streams" in changes:
        streams = _clean_names(changes.pop("streams"))
        if not streams:
            raise ValidationError("streams: choose a category.")
        changes["streams"], changes["stream"] = streams, streams[0]

    mapping = {
        "name": "name", "streams": "streams", "stream": "stream", "fullName": "full_name", "level": "level",
        "duration": "duration", "modes": "modes", "eligibility": "eligibility",
        "averageFees": "average_fees", "examsAccepted": "exams_accepted", "collegeCount": "college_count",
        "about": "about",
    }
    values = {mapping[k]: v for k, v in changes.items()}
    if not values:
        return SuccessResponse[dict](data={"message": "Nothing to update."})
    if "name" in values or "level" in values:
        await _reject_duplicate(db, values.get("name", course.name), values.get("level", course.level), course.id)

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


async def _reject_duplicate_spec(db, name: str, except_id=None) -> None:
    """Finance is one entry in the list, whichever course it is used with."""
    stmt = select(Specialisation.slug).where(func.lower(func.trim(Specialisation.name)) == name.strip().lower())
    if except_id is not None:
        stmt = stmt.where(Specialisation.id != except_id)
    existing = (await db.execute(stmt)).scalars().first()
    if existing is not None:
        raise ConflictError("SPECIALISATION_EXISTS", f"A specialisation named '{name.strip()}' already exists ('{existing}').")


async def _courses_by_slugs(db, slugs: list[str]) -> list[CourseCatalogue]:
    """The courses a specialisation sits under, in the order chosen. Unknown slugs are refused."""
    wanted = _clean_names(slugs)
    if not wanted:
        raise ValidationError("courseSlugs: choose a course.")
    found = {c.slug: c for c in (await db.execute(select(CourseCatalogue).where(CourseCatalogue.slug.in_(wanted)))).scalars().all()}
    missing = [slug for slug in wanted if slug not in found]
    if missing:
        raise NotFoundError(f"Course '{missing[0]}'")
    return [found[slug] for slug in wanted]


def _set_parents(spec: Specialisation, courses: list[CourseCatalogue]) -> None:
    first = courses[0]
    spec.course_slugs = [c.slug for c in courses]
    spec.course_id, spec.course_slug, spec.course_name, spec.stream = first.id, first.slug, first.name, first.stream


@router.post("/specialisations", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_specialisation(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(SpecialisationCreateBody, body)
    courses = await _courses_by_slugs(db, data.courseSlugs)
    await _reject_duplicate_spec(db, data.name)

    spec = Specialisation(id=uuid.uuid4(), slug=await _free_slug(db, Specialisation, data.name), name=data.name.strip(), college_count=0)
    _set_parents(spec, courses)
    db.add(spec)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Specialisation '{spec.slug}' created."})


@router.patch("/specialisations/{slug}", response_model=SuccessResponse[dict])
async def admin_update_specialisation(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(SpecialisationUpdateBody, body)
    spec = await _spec_by_slug(db, slug)
    changes = data.model_dump(exclude_unset=True)
    _reject_nulls(changes, NULLABLE_SPEC_FIELDS)

    if changes.get("courseSlugs") is not None:
        _set_parents(spec, await _courses_by_slugs(db, changes.pop("courseSlugs")))
    else:
        changes.pop("courseSlugs", None)

    if "name" in changes and changes["name"].strip().lower() != spec.name.strip().lower():
        await _reject_duplicate_spec(db, changes["name"], spec.id)

    for key, column in {
        "name": "name", "duration": "duration", "averageFees": "average_fees",
        "collegeCount": "college_count", "about": "about",
    }.items():
        if key in changes:
            setattr(spec, column, changes[key])
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Specialisation '{slug}' updated."})


@router.post("/specialisations/delete", response_model=SuccessResponse[dict])
async def admin_delete_specialisations(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(DeleteBody, body)
    specs = (await db.execute(select(Specialisation).where(Specialisation.slug.in_(data.slugs)))).scalars().all()
    for spec in specs:
        await db.delete(spec)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"{len(specs)} specialisation(s) deleted.", "deleted": len(specs)})


# ── The info shown on a course's card ──────────────────────────────────────────────────────────────

STUDY_MODES = ("Full Time", "Part Time", "Weekend", "Online", "Distance")


class CourseInfoBody(BaseModel):
    """What the course's card and page say about it. Empty means "not shown": nothing is worked out for a blank."""

    duration: str = Field(default="", max_length=100)
    averageFees: str = Field(default="", max_length=100)
    examsAccepted: list[str] = Field(default_factory=list, max_length=30)
    modes: list[Literal["Full Time", "Part Time", "Weekend", "Online", "Distance"]] = Field(default_factory=list, max_length=5)
    eligibility: str = Field(default="", max_length=4000)
    # 1 is shown first; each number belongs to one course. Empty: after the courses that have one.
    priority: Optional[int] = Field(default=None, ge=1, le=100000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("duration")
    @classmethod
    def _duration(cls, value: str) -> str:
        return check_duration(value) or ""

    @field_validator("averageFees")
    @classmethod
    def _fees(cls, value: str) -> str:
        return check_fees(value) or ""


@router.put("/courses/{slug}/info", response_model=SuccessResponse[dict])
async def admin_set_course_info(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Replaces the five figures of a course's card. Anything left empty is cleared and not shown."""
    data = _validate(CourseInfoBody, body)
    course = await _course_by_slug(db, slug)

    table = rules.exam_lookup([(s, n) for s, n in (await db.execute(select(Exam.slug, Exam.name))).all()])
    # An exam the course already carried is kept as written, so an older record can still be saved.
    try:
        exams = rules.resolve_exams(data.examsAccepted, table, {e.lower() for e in (course.exams_accepted or [])}, "Exams accepted")
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc

    if data.priority is not None:
        holder = (await db.execute(select(CourseCatalogue.name).where(CourseCatalogue.priority == data.priority, CourseCatalogue.id != course.id))).scalars().first()
        if holder is not None:
            raise ValidationError(f"priority: {data.priority} is already given to {holder}. Each priority belongs to one course.")

    course.priority = data.priority
    course.duration = data.duration
    course.average_fees = data.averageFees or None
    course.exams_accepted = exams
    course.modes = list(dict.fromkeys(data.modes))
    course.eligibility = data.eligibility.strip() or None
    await db.commit()
    return SuccessResponse[dict](data={"message": f"{course.name} saved."})


# ── Which colleges teach a course, and what each says about it ──────────────────────────────────────

class CollegeCourseRow(BaseModel):
    """One programme of one college under this course: the course as a whole, or one specialisation of it."""

    specialisation: str = Field(default="", max_length=200)
    duration: str = Field(min_length=1, max_length=100)
    mode: Literal["Full Time", "Part Time", "Weekend", "Online", "Distance"] = "Full Time"
    fees: str = Field(min_length=1, max_length=200)
    exams: list[str] = Field(default_factory=list, max_length=20)
    eligibility: str = Field(default="", max_length=300)
    seats: Optional[int] = Field(default=None, ge=1, le=100000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("duration")
    @classmethod
    def _duration(cls, value: str) -> str:
        return rules.check_duration(value)

    @field_validator("fees")
    @classmethod
    def _fees(cls, value: str) -> str:
        return rules.check_amount(value, "The fees")


class CollegeOffer(BaseModel):
    slug: str = Field(min_length=1, max_length=200)
    rows: list[CollegeCourseRow] = Field(min_length=1, max_length=30)
    model_config = ConfigDict(extra="forbid")


class CourseCollegesBody(BaseModel):
    colleges: list[CollegeOffer] = Field(default_factory=list, max_length=1000)
    model_config = ConfigDict(extra="forbid")


def _same_course(name: str):
    return func.lower(func.trim(Course.name)) == name.strip().lower()


@router.get("/courses/{slug}/colleges", response_model=SuccessResponse[dict])
async def admin_course_colleges(slug: str, _admin: AdminPayload, db: DbSession):
    """Every college (not archived) with what it says about this course, if it teaches it, and the lists to choose from."""
    course = await _course_by_slug(db, slug)
    colleges = (await db.execute(
        select(College.slug, College.name, College.city, College.stream, College.status)
        .where(College.status != "archived").order_by(College.name)
    )).all()
    rows = (await db.execute(
        select(College.slug, Course).join(Course, Course.college_id == College.id).where(_same_course(course.name)).order_by(Course.specialisation)
    )).all()
    by_college: dict[str, list[dict]] = {}
    for college_slug, c in rows:
        by_college.setdefault(college_slug, []).append({
            "specialisation": c.specialisation or "", "duration": c.duration, "mode": c.mode, "fees": c.fees,
            "exams": c.exams or [], "eligibility": c.eligibility or "", "seats": c.seats,
        })
    specs = (await db.execute(select(Specialisation))).scalars().all()
    names = sorted({s.name for s in specs if course.slug in (s.course_slugs or [s.course_slug])})
    exams = (await db.execute(select(Exam.name).order_by(Exam.name))).scalars().all()
    return SuccessResponse[dict](data={
        "course": {"slug": course.slug, "name": course.name},
        "colleges": [
            {"slug": s, "name": n, "city": c or "", "stream": st or "", "status": status, "rows": by_college.get(s, [])}
            for s, n, c, st, status in colleges
        ],
        "specialisations": names,
        "exams": sorted(set(exams)),
        "modes": ["Full Time", "Part Time", "Weekend", "Online", "Distance"],
    })


@router.put("/courses/{slug}/colleges", response_model=SuccessResponse[dict])
async def admin_set_course_colleges(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Sets which colleges teach this course, and the programme rows of each. A college left out stops teaching it.

    The college's own record is where these live (its Courses & Fees tab), so a change here shows there too.
    """
    data = validate_body(CourseCollegesBody, body)
    course = await _course_by_slug(db, slug)

    slugs = [e.slug for e in data.colleges]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("colleges: a college is listed more than once.")
    chosen = {c.slug: c for c in (await db.execute(select(College).where(College.slug.in_(slugs)))).scalars().all()} if slugs else {}
    unknown = [s for s in slugs if s not in chosen]
    if unknown:
        raise ValidationError(f"colleges: unknown college '{unknown[0]}'.")

    # Exams are the directory's own names (a college's older spelling is kept as it was).
    table = rules.exam_lookup([(s, n) for s, n in (await db.execute(select(Exam.slug, Exam.name))).all()])
    existing = (await db.execute(select(Course).where(_same_course(course.name)))).scalars().all()
    had = {e.lower() for c in existing for e in (c.exams or [])}
    for entry in data.colleges:
        seen: set[str] = set()
        for row in entry.rows:
            key = row.specialisation.strip().lower()
            if key in seen:
                raise ValidationError(f"{chosen[entry.slug].name}: {row.specialisation.strip() or 'the course as a whole'} is listed more than once.")
            seen.add(key)
            try:
                row.exams = rules.resolve_exams(row.exams, table, had, chosen[entry.slug].name)
            except ValueError as exc:
                raise ValidationError(str(exc)) from exc

    affected = {c.college_id for c in existing} | {chosen[s].id for s in chosen}
    for c in existing:
        await db.delete(c)
    await db.flush()
    for entry in data.colleges:
        for row in entry.rows:
            db.add(Course(
                id=uuid.uuid4(), college_id=chosen[entry.slug].id, name=course.name.strip(), specialisation=row.specialisation.strip(),
                duration=row.duration, mode=row.mode, fees=row.fees.strip(), exams=row.exams, eligibility=row.eligibility.strip(), seats=row.seats,
            ))
    await db.flush()
    for college_id in affected:
        count = (await db.execute(select(func.count()).select_from(Course).where(Course.college_id == college_id))).scalar_one()
        await db.execute(update(College).where(College.id == college_id).values(courses_offered=count))
    await db.commit()
    return SuccessResponse[dict](data={"message": f"{len(slugs)} colleges teach {course.name}."})
