"""Admin college record: read and save everything a college page shows, in one request.
ADMIN role required.

The college editor has one tab for each part of the public college page (College Info, Courses,
Reviews, Admissions, Placements, Cut-Offs, Rankings, Gallery, Infrastructure, Faculty, Compare,
Q&A, Scholarships, News, SEO). One Save sends all of it here and it is stored together: the
college's own columns, its courses, placements, cut-offs and reviews, and the editor-written
document (see schemas/college_detail.py). Nothing is saved if anything fails a check.

The page address (slug) never changes here, so links to a college keep working.
"""

import re
import uuid
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from core import college_rules as rules
from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from data.india_districts import INDIA_DISTRICTS
from models.college import College, OwnershipType
from models.course import Course
from models.cutoff import Cutoff
from models.exam import Exam
from models.placement import Placement
from models.recruiter import Recruiter
from routers.admin_recruiters import recruiter_key
from models.review import Review
from schemas.college_detail import CollegeDetail, photo_path
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/colleges", tags=["admin"])

_ONLINE_DURATION = re.compile(r"^\d{1,3}(?:\.\d)? (?:Days?|Months?|Years?)$", re.IGNORECASE)
MODES = ("Full Time", "Part Time", "Weekend", "Online", "Distance")
CATEGORIES = ("General", "OBC", "SC", "ST", "EWS", "PwD", "Other")
YEAR = date.today().year


class CourseRow(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    specialisation: str = Field(default="", max_length=200)
    duration: str = Field(min_length=1, max_length=100)
    mode: Literal["Full Time", "Part Time", "Weekend", "Online", "Distance"] = "Full Time"
    fees: str = Field(min_length=1, max_length=200)
    exams: list[str] = Field(default_factory=list, max_length=20)
    eligibility: str = Field(default="", max_length=300)
    seats: Optional[int] = Field(default=None, ge=1, le=100000)
    # Also taught online: its own length (days, months or years) and fees. Both are required when offered.
    onlineOffered: bool = False
    # Switched on or off from Sections > Online Programmes; kept as it is when the college is saved.
    onlineEnabled: bool = True
    onlineDuration: str = Field(default="", max_length=100)
    onlineFees: str = Field(default="", max_length=200)
    model_config = ConfigDict(extra="forbid")

    @field_validator("duration")
    @classmethod
    def _duration(cls, value: str) -> str:
        return rules.check_duration(value)

    @field_validator("fees")
    @classmethod
    def _fees(cls, value: str) -> str:
        return rules.check_amount(value, "The fees")

    @model_validator(mode="after")
    def _online(self):
        if not self.onlineOffered:
            self.onlineDuration, self.onlineFees = "", ""
            return self
        self.onlineDuration = " ".join(self.onlineDuration.split())
        if not _ONLINE_DURATION.match(self.onlineDuration):
            raise ValueError("The online duration must be a number of days, months or years, such as 45 Days, 18 Months or 2 Years.")
        self.onlineFees = rules.check_amount(self.onlineFees, "The online fees")
        if not self.onlineFees:
            raise ValueError("The online fees are required when the course is offered online.")
        return self


class BreakdownRow(BaseModel):
    category: str = Field(default="", max_length=100)
    course: str = Field(min_length=1, max_length=200)
    specialisation: str = Field(default="", max_length=200)
    average: str = Field(default="", max_length=50)
    highest: str = Field(default="", max_length=50)
    placed: Optional[int] = Field(default=None, ge=0, le=100000)
    students: Optional[int] = Field(default=None, ge=1, le=100000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("average", "highest")
    @classmethod
    def _package(cls, value: str) -> str:
        return rules.check_amount(value, "The package")

    @model_validator(mode="after")
    def _consistent(self):
        rules.check_packages(self.average, "", self.highest)
        if self.placed is not None and self.students is not None and self.placed > self.students:
            raise ValueError("The number placed is more than the number of students.")
        return self


class PlacementRow(BaseModel):
    # The batch, as a range: it began in `yearStart` (empty: a single year) and ended in `year`.
    yearStart: Optional[int] = Field(default=None, ge=1990, le=YEAR + 1)
    year: int = Field(ge=1990, le=YEAR + 1)
    average: str = Field(default="", max_length=50)
    median: str = Field(default="", max_length=50)
    highest: str = Field(default="", max_length=50)
    placedPercent: Optional[int] = Field(default=None, ge=0, le=100)
    topRecruiters: list[str] = Field(default_factory=list, max_length=30)
    breakdown: list[BreakdownRow] = Field(default_factory=list, max_length=100)
    model_config = ConfigDict(extra="forbid")

    @field_validator("average", "median", "highest")
    @classmethod
    def _package(cls, value: str) -> str:
        return rules.check_amount(value, "The package")

    @model_validator(mode="after")
    def _highest_not_below(self):
        rules.check_packages(self.average, self.median, self.highest)
        return self


class CutoffRow(BaseModel):
    exam: str = Field(min_length=1, max_length=100)
    # The caste category.
    category: str = Field(min_length=1, max_length=100)
    # Empty: every programme. A course the college offers, or one specialisation of it.
    course: str = Field(default="", max_length=200)
    specialisation: str = Field(default="", max_length=200)
    score: str = Field(min_length=1, max_length=100)
    model_config = ConfigDict(extra="forbid")

    @field_validator("score")
    @classmethod
    def _score(cls, value: str) -> str:
        return rules.check_score(value)


class ReviewRow(BaseModel):
    # Present on a review that already exists, so editing it keeps who wrote it.
    id: Optional[str] = None
    author: str = Field(min_length=2, max_length=200)
    course: str = Field(min_length=1, max_length=200)
    batch: str = Field(min_length=1, max_length=50)
    verified: bool = False
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    rating: float = Field(ge=1, le=5)
    body: str = Field(min_length=3, max_length=2000)
    ratingPlacements: Optional[float] = Field(default=None, ge=1, le=5)
    ratingFaculty: Optional[float] = Field(default=None, ge=1, le=5)
    ratingInfrastructure: Optional[float] = Field(default=None, ge=1, le=5)
    ratingCampusLife: Optional[float] = Field(default=None, ge=1, le=5)
    # A new review waits for a moderator unless the editor approves it on purpose.
    approved: bool = False
    model_config = ConfigDict(extra="forbid")

    @field_validator("batch")
    @classmethod
    def _batch(cls, value: str) -> str:
        return rules.check_batch(value)

    @field_validator("date")
    @classmethod
    def _date(cls, value: str) -> str:
        return rules.check_not_future(value, "The review date")

    @model_validator(mode="after")
    def _long_enough(self):
        # A review that is already on the site keeps its text; a new one has to say something.
        if self.id is None and len(self.body.strip()) < rules.REVIEW_MIN_CHARS:
            raise ValueError(f"Review must be at least {rules.REVIEW_MIN_CHARS} characters.")
        return self


class RecordBody(BaseModel):
    name: str = Field(min_length=2, max_length=500)
    city: str = Field(min_length=1, max_length=200)
    state: str = Field(min_length=1, max_length=200)
    ownership: Literal["Private", "Government", "Deemed"]
    # The categories the college is listed under. `stream` is the first of them, kept for the pages that show one.
    streams: list[str] = Field(default_factory=list, max_length=20)
    stream: str = Field(default="", max_length=100)
    institutionType: Literal["College", "University"] = "College"
    feesRange: str = Field(default="", max_length=100)
    about: str = Field(default="", max_length=20000)
    established: Optional[int] = None
    rankingAuthority: str = Field(default="", max_length=100)
    rankingRank: Optional[int] = Field(default=None, ge=1, le=10000)
    examsAccepted: list[str] = Field(default_factory=list, max_length=40)
    tags: list[str] = Field(default_factory=list, max_length=12)
    approvals: list[str] = Field(default_factory=list, max_length=20)
    image: str = Field(default="", max_length=200)
    courses: list[CourseRow] = Field(default_factory=list, max_length=60)
    placements: list[PlacementRow] = Field(default_factory=list, max_length=15)
    cutoffs: list[CutoffRow] = Field(default_factory=list, max_length=200)
    reviews: list[ReviewRow] = Field(default_factory=list, max_length=100)
    detail: CollegeDetail = Field(default_factory=CollegeDetail)
    model_config = ConfigDict(extra="forbid")

    _image = field_validator("image")(photo_path)

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return rules.check_name(value, "The college name")

    @field_validator("city")
    @classmethod
    def _city(cls, value: str) -> str:
        return rules.check_name(value, "The city")

    @field_validator("state")
    @classmethod
    def _state(cls, value: str) -> str:
        value = value.strip()
        if value not in INDIA_DISTRICTS:
            raise ValueError("Choose a state from the list.")
        return value

    @field_validator("established")
    @classmethod
    def _established(cls, value):
        return rules.check_year_established(value)

    @field_validator("feesRange")
    @classmethod
    def _fees_range(cls, value: str) -> str:
        return rules.check_fee_range(value, "The total fee range")

    @field_validator("tags", "approvals")
    @classmethod
    def _short_items(cls, values: list[str]) -> list[str]:
        return [rules.check_short_text(v, "A tag or approval") for v in values]


def _iso(d) -> str:
    return d.isoformat() if d else ""


async def _load(db, slug: str) -> College:
    row = (
        await db.execute(
            select(College)
            .where(College.slug == slug)
            .options(selectinload(College.courses), selectinload(College.placements), selectinload(College.cutoffs), selectinload(College.reviews))
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError("College")
    return row


def _breakdown_row(b: dict) -> dict:
    return {
        "category": b.get("category") or "", "course": b.get("course") or "", "specialisation": b.get("specialisation") or "",
        "average": b.get("average") or "", "highest": b.get("highest") or "",
        "placed": b.get("placed"), "students": b.get("students"),
    }


def _record(c: College) -> dict:
    """The college as the editor holds it."""
    return {
        "slug": c.slug,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else "",
        "name": c.name,
        "city": c.city,
        "state": c.state,
        "ownership": c.ownership.value if hasattr(c.ownership, "value") else str(c.ownership),
        "stream": c.stream,
        "streams": c.streams or ([c.stream] if c.stream else []),
        "institutionType": c.institution_type or "College",
        "feesRange": c.fees_range or "",
        "about": c.about or "",
        "established": c.established,
        "rankingAuthority": c.ranking_authority or "",
        "rankingRank": c.ranking_rank,
        "examsAccepted": c.exams_accepted or [],
        "tags": c.tags or [],
        "approvals": c.approvals or [],
        "image": c.image or "",
        "courses": [
            {"name": x.name, "specialisation": x.specialisation or "", "duration": x.duration, "mode": x.mode, "fees": x.fees, "exams": x.exams or [], "eligibility": x.eligibility or "", "seats": x.seats,
             "onlineOffered": bool(x.online_offered), "onlineEnabled": bool(x.online_enabled), "onlineDuration": x.online_duration or "", "onlineFees": x.online_fees or ""}
            for x in sorted(c.courses or [], key=lambda x: x.created_at or 0)
        ],
        "placements": [
            {
                "year": p.year,
                "yearStart": p.year_start,
                "average": p.average_package or "",
                "median": p.median_package or "",
                "highest": p.highest_package or "",
                "placedPercent": p.placed_percent,
                "topRecruiters": p.top_recruiters or [],
                "breakdown": [_breakdown_row(b) for b in (p.breakdown or []) if isinstance(b, dict)],
            }
            for p in sorted(c.placements or [], key=lambda p: p.year, reverse=True)
        ],
        "cutoffs": [{"exam": x.exam, "category": x.category, "course": x.course or "", "specialisation": x.specialisation or "", "score": x.score} for x in (c.cutoffs or [])],
        "reviews": [
            {
                "id": str(r.id),
                "author": r.author_name,
                "course": r.course,
                "batch": r.batch,
                "verified": bool(r.verified),
                "date": _iso(r.review_date),
                "rating": r.rating,
                "body": r.body,
                "ratingPlacements": r.rating_placements,
                "ratingFaculty": r.rating_faculty,
                "ratingInfrastructure": r.rating_infrastructure,
                "ratingCampusLife": r.rating_campus_life,
                "approved": bool(r.is_approved),
            }
            for r in sorted(c.reviews or [], key=lambda r: r.review_date, reverse=True)
        ],
        "detail": _detail(c),
    }


def _detail(c: College) -> dict:
    """The stored document, filled out with the defaults for anything not written yet."""
    try:
        return CollegeDetail.model_validate(c.detail or {}).model_dump()
    except PydanticValidationError:
        return CollegeDetail().model_dump()


@router.get("/pools", response_model=SuccessResponse[dict])
async def pools(_admin: AdminPayload, db: DbSession):
    """What the college editor offers to choose from, taken from the directory itself: the
    categories, entrance exams, courses, colleges, and the approvals and tags already in use."""
    from models.course_catalogue import CourseCatalogue
    from models.exam import Exam
    from models.home_field import HomeField
    from models.specialisation import Specialisation

    fields = (await db.execute(select(HomeField.name).order_by(HomeField.name))).scalars().all()
    streams = sorted({*fields, *(await db.execute(select(College.stream).distinct())).scalars().all()} - {""})
    exams = (await db.execute(select(Exam.name).order_by(Exam.name))).scalars().all()
    course_rows = (await db.execute(select(CourseCatalogue.name, CourseCatalogue.slug, CourseCatalogue.stream, CourseCatalogue.streams, CourseCatalogue.delivery).where(CourseCatalogue.is_published.is_(True)).order_by(CourseCatalogue.name))).all()
    courses = [r.name for r in course_rows]
    # Which categories each course sits under, so the form offers only the courses of the chosen category.
    course_streams = {r.name: list(r.streams or [r.stream]) for r in course_rows}
    slug_to_name = {r.slug: r.name for r in course_rows}
    spec_rows = (await db.execute(select(Specialisation.name, Specialisation.course_slug, Specialisation.course_slugs, Specialisation.delivery).order_by(Specialisation.name))).all()
    specialisations = [r.name for r in spec_rows]
    specialisation_courses = {r.name: [slug_to_name[c] for c in (r.course_slugs or [r.course_slug]) if c in slug_to_name] for r in spec_rows}
    # Only colleges the site shows can be pinned as similar.
    colleges = (await db.execute(select(College.slug, College.name).where(College.status == "published").order_by(College.name))).all()
    in_use = (await db.execute(select(College.approvals, College.tags))).all()
    approvals = sorted({a for row in in_use for a in (row[0] or [])})
    tags = sorted({t for row in in_use for t in (row[1] or [])})
    return SuccessResponse[dict](
        data={
            "streams": streams,
            "exams": sorted(set(exams)),
            "courses": sorted(set(courses)),
            "specialisations": sorted(set(specialisations)),
            "courseStreams": course_streams,
            "specialisationCourses": specialisation_courses,
            # The courses and specialisations that can be taught online, so the college editor can offer them.
            "onlineCourses": sorted({r.name for r in course_rows if r.delivery in ("online", "both")}),
            "onlineSpecialisations": sorted({r.name for r in spec_rows if r.delivery in ("online", "both")}),
            "colleges": [{"slug": s, "name": n} for s, n in colleges],
            "approvals": approvals,
            "tags": tags,
            "states": sorted(INDIA_DISTRICTS),
            "districts": {state: sorted(places) for state, places in INDIA_DISTRICTS.items()},
        }
    )


@router.get("/{slug}/record", response_model=SuccessResponse[dict])
async def get_record(slug: str, _admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=_record(await _load(db, slug)))


_FIELD_LABELS = {
    "name": "College name", "city": "City", "state": "State", "ownership": "Ownership", "stream": "Category",
    "feesRange": "Total fee range", "about": "About", "established": "Year established", "tags": "Tags",
    "approvals": "Approvals", "examsAccepted": "Exams accepted", "image": "Photo",
    "duration": "Duration", "fees": "Fees", "seats": "Seats", "mode": "Mode", "eligibility": "Eligibility",
    "year": "Batch year", "average": "Average package", "median": "Median package", "highest": "Highest package",
    "placedPercent": "Batch placed", "exam": "Exam", "category": "Category", "score": "Score",
    "author": "Reviewer", "course": "Programme", "batch": "Batch", "date": "Date", "rating": "Rating",
    "body": "Text", "studentRatio": "Student to faculty ratio", "phdPercent": "PhD share", "count": "Faculty count",
    "question": "Question", "answer": "Answer", "title": "Title",
}
_ROW_LABELS = {
    "courses": "Programme", "placements": "Placement", "cutoffs": "Cut-off", "reviews": "Review",
    "members": "Faculty member", "faqs": "Question", "alerts": "Alert", "articles": "Article", "media": "Press item",
    "gallery": "Photo", "videos": "Video",
}


def _friendly(error: dict) -> str:
    """One validation failure as a sentence an editor can act on, not a field path."""
    loc = [p for p in error["loc"] if p != "detail"]
    kind, ctx = error["type"], error.get("ctx") or {}
    field = _FIELD_LABELS.get(str(loc[-1]) if loc else "", "") if loc else ""
    field = field or (str(loc[-1]).capitalize() if loc else "This")

    if kind == "value_error":
        text = str(error["msg"]).removeprefix("Value error, ")
    elif kind in ("greater_than_equal", "less_than_equal", "greater_than", "less_than"):
        bound = ctx.get("ge", ctx.get("le", ctx.get("gt", ctx.get("lt"))))
        low = kind.startswith("greater")
        text = f"{field} must be {'at least' if low else 'at most'} {bound}."
    elif kind == "string_too_short":
        text = f"{field} is required." if ctx.get("min_length", 1) <= 1 else f"{field} must be at least {ctx['min_length']} characters."
    elif kind == "string_too_long":
        text = f"{field} can be at most {ctx.get('max_length')} characters."
    elif kind == "too_long":
        text = f"{field}: at most {ctx.get('max_length')} items."
    elif kind == "missing":
        text = f"{field} is required."
    elif kind == "string_pattern_mismatch":
        text = f"{field} is not in the expected format."
    elif kind in ("literal_error", "enum"):
        text = f"Choose a valid {field.lower()}."
    else:
        text = f"{field}: {error['msg']}"

    # "Programme 2: ..." for a row of a list.
    for i, part in enumerate(loc):
        if isinstance(part, int) and i > 0 and str(loc[i - 1]) in _ROW_LABELS:
            return f"{_ROW_LABELS[str(loc[i - 1])]} {part + 1}: {text}"
    return text


def _parse(raw: dict) -> RecordBody:
    try:
        return RecordBody.model_validate(raw)
    except PydanticValidationError as exc:
        raise ValidationError(_friendly(exc.errors()[0])) from exc


def _check(data: RecordBody) -> None:
    """Rules that span rows."""
    if not [x for x in [*data.streams, data.stream] if x.strip()]:
        raise ValidationError("streams: choose at least one category.")
    for p in data.placements:
        if p.yearStart is not None and p.yearStart > p.year:
            raise ValidationError(f"placements: a batch cannot start ({p.yearStart}) after it ends ({p.year}).")
    years = [p.year for p in data.placements]
    if len(set(years)) != len(years):
        raise ValidationError("placements: a year appears more than once.")
    for p in data.placements:
        keys = [(b.category.strip().lower(), b.course.strip().lower(), b.specialisation.strip().lower()) for b in p.breakdown]
        if len(set(keys)) != len(keys):
            raise ValidationError(f"placements: {p.year} lists the same programme more than once in its breakdown.")
    names = [(c.name.strip().lower(), c.specialisation.strip().lower()) for c in data.courses]
    if len(set(names)) != len(names):
        raise ValidationError("courses: a programme is listed more than once with the same specialisation.")
    seen = set()
    for cut in data.cutoffs:
        key = (cut.exam.strip().lower(), cut.category.strip().lower(), cut.course.strip().lower(), cut.specialisation.strip().lower())
        if key in seen:
            where = " ".join(x for x in (cut.course.strip(), cut.specialisation.strip()) if x) or "every programme"
            raise ValidationError(f"cutoffs: {cut.exam} / {cut.category} for {where} appears more than once.")
        seen.add(key)


async def _resolve_exams(db, data: RecordBody, row: College) -> None:
    """Exams have to be ones in the directory, written as the directory writes them ("CAT" becomes
    "Common Admission Test (CAT)"). One the college already had is kept, so an older record can still
    be saved; anything added now must exist."""
    pairs = (await db.execute(select(Exam.slug, Exam.name))).all()
    table = rules.exam_lookup([(s, n) for s, n in pairs])
    had = {e.lower() for e in (row.exams_accepted or [])}
    had |= {e.lower() for c in (row.courses or []) for e in (c.exams or [])}
    had |= {c.exam.lower() for c in (row.cutoffs or [])}
    try:
        data.examsAccepted = rules.resolve_exams(data.examsAccepted, table, had, "Exams accepted")
        for i, course in enumerate(data.courses):
            course.exams = rules.resolve_exams(course.exams, table, had, f"Programme {i + 1}")
        for i, cut in enumerate(data.cutoffs):
            cut.exam = rules.resolve_exams([cut.exam], table, had, f"Cut-off {i + 1}")[0]
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


@router.put("/{slug}/record", response_model=SuccessResponse[dict])
async def save_record(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(body)
    _check(data)
    row = await _load(db, slug)

    # Pinned similar colleges have to exist, and cannot be the college itself.
    if data.detail.similarSlugs:
        if slug in data.detail.similarSlugs:
            raise ValidationError("detail.similarSlugs: a college cannot be similar to itself.")
        known = set((await db.execute(select(College.slug).where(College.slug.in_(data.detail.similarSlugs)))).scalars().all())
        missing = [s for s in data.detail.similarSlugs if s not in known]
        if missing:
            raise ValidationError(f"detail.similarSlugs: unknown college '{missing[0]}'.")

    await _resolve_exams(db, data, row)

    row.name = data.name.strip()
    row.city = data.city.strip()
    row.state = data.state.strip()
    row.ownership = OwnershipType(data.ownership)
    row.streams = [s.strip() for s in dict.fromkeys([*data.streams, data.stream]) if s and s.strip()]
    row.stream = row.streams[0]
    row.institution_type = data.institutionType
    row.fees_range = data.feesRange.strip() or None
    row.about = data.about.strip() or None
    row.established = data.established
    # The ranking shown on the college's cards comes from the ranking lists (see
    # routers/admin_rankings.py), so it is not written from the editor.
    row.exams_accepted = [e.strip() for e in data.examsAccepted if e.strip()]
    row.tags = [t.strip() for t in data.tags if t.strip()]
    row.approvals = [a.strip() for a in data.approvals if a.strip()]
    row.image = data.image
    row.detail = data.detail.model_dump()
    row.updated_at = func.now()

    # Courses, placements and cut-offs are rewritten as a set.
    await db.execute(delete(Course).where(Course.college_id == row.id))
    await db.execute(delete(Placement).where(Placement.college_id == row.id))
    await db.execute(delete(Cutoff).where(Cutoff.college_id == row.id))
    for c in data.courses:
        db.add(Course(id=uuid.uuid4(), college_id=row.id, name=c.name.strip(), specialisation=c.specialisation.strip(), duration=c.duration.strip(), mode=c.mode, fees=c.fees.strip(),
                      exams=[e.strip() for e in c.exams if e.strip()], eligibility=c.eligibility.strip(), seats=c.seats,
                      online_offered=c.onlineOffered, online_enabled=c.onlineEnabled, online_duration=c.onlineDuration, online_fees=c.onlineFees))
    # Every recruiter named goes into the shared pool (once, however it is spelled) and is written the pool's way.
    pool = {r.name_key: r for r in (await db.execute(select(Recruiter))).scalars().all()}
    for p in data.placements:
        names: list[str] = []
        for raw in p.topRecruiters:
            name = " ".join(raw.split())
            if not name:
                continue
            key = recruiter_key(name)
            if key not in pool:
                pool[key] = Recruiter(name=name, name_key=key)
                db.add(pool[key])
            if pool[key].name not in names:
                names.append(pool[key].name)
        p.topRecruiters = names
    for p in data.placements:
        db.add(Placement(id=uuid.uuid4(), college_id=row.id, year=p.year, year_start=p.yearStart, average_package=p.average.strip() or None, median_package=p.median.strip() or None,
                         highest_package=p.highest.strip() or None, placed_percent=p.placedPercent, top_recruiters=[r.strip() for r in p.topRecruiters if r.strip()],
                         breakdown=[{"category": b.category.strip(), "course": b.course.strip(), "specialisation": b.specialisation.strip(), "average": b.average.strip(), "highest": b.highest.strip(), "placed": b.placed, "students": b.students} for b in p.breakdown]))
    for k in data.cutoffs:
        db.add(Cutoff(id=uuid.uuid4(), college_id=row.id, exam=k.exam.strip(), category=k.category.strip(), course=k.course.strip(), specialisation=k.specialisation.strip(), score=k.score.strip()))

    # Reviews are matched by id, so one a visitor wrote keeps its author link when it is edited.
    existing = {str(r.id): r for r in row.reviews}
    kept: set[str] = set()
    for r in data.reviews:
        fields = dict(
            author_name=r.author.strip(), course=r.course.strip(), batch=r.batch.strip(), verified=r.verified,
            review_date=date.fromisoformat(r.date), rating=r.rating, body=r.body.strip(),
            rating_placements=r.ratingPlacements, rating_faculty=r.ratingFaculty,
            rating_infrastructure=r.ratingInfrastructure, rating_campus_life=r.ratingCampusLife, is_approved=r.approved,
        )
        match = existing.get(r.id or "")
        if match is not None:
            for key, value in fields.items():
                setattr(match, key, value)
            kept.add(str(match.id))
        else:
            db.add(Review(id=uuid.uuid4(), college_id=row.id, **fields))
    for rid, review in existing.items():
        if rid not in kept:
            await db.delete(review)

    # The rating and counts on the college row follow its approved reviews and its programmes.
    approved = [r for r in data.reviews if r.approved]
    if approved:
        row.rating = round(sum(r.rating for r in approved) / len(approved), 1)
        row.review_count = len(approved)
    # Always follows the list, so removing the last programme brings the count to 0.
    row.courses_offered = len(data.courses)

    await db.commit()
    return SuccessResponse[dict](data={"message": f"{row.name} saved."})
