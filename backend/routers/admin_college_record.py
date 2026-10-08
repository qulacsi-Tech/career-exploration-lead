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
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from data.india_districts import INDIA_DISTRICTS
from models.college import College, OwnershipType
from models.course import Course
from models.cutoff import Cutoff
from models.placement import Placement
from models.review import Review
from schemas.college_detail import CollegeDetail, photo_path
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/colleges", tags=["admin"])

MODES = ("Full Time", "Part Time", "Weekend", "Online", "Distance")
CATEGORIES = ("General", "OBC", "SC", "ST", "EWS", "PwD", "Other")
YEAR = date.today().year


class CourseRow(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    duration: str = Field(min_length=1, max_length=100)
    mode: Literal["Full Time", "Part Time", "Weekend", "Online", "Distance"] = "Full Time"
    fees: str = Field(min_length=1, max_length=200)
    exams: list[str] = Field(default_factory=list, max_length=20)
    eligibility: str = Field(default="", max_length=300)
    seats: Optional[int] = Field(default=None, ge=1, le=100000)
    model_config = ConfigDict(extra="forbid")


class PlacementRow(BaseModel):
    year: int = Field(ge=1990, le=YEAR + 1)
    average: str = Field(default="", max_length=50)
    median: str = Field(default="", max_length=50)
    highest: str = Field(default="", max_length=50)
    placedPercent: Optional[int] = Field(default=None, ge=0, le=100)
    topRecruiters: list[str] = Field(default_factory=list, max_length=30)
    model_config = ConfigDict(extra="forbid")


class CutoffRow(BaseModel):
    exam: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    score: str = Field(min_length=1, max_length=100)
    model_config = ConfigDict(extra="forbid")


class ReviewRow(BaseModel):
    # Present on a review that already exists, so editing it keeps who wrote it.
    id: Optional[str] = None
    author: str = Field(min_length=2, max_length=200)
    course: str = Field(min_length=1, max_length=200)
    batch: str = Field(min_length=1, max_length=50)
    verified: bool = False
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    rating: float = Field(ge=0, le=5)
    body: str = Field(min_length=3, max_length=2000)
    ratingPlacements: Optional[float] = Field(default=None, ge=0, le=5)
    ratingFaculty: Optional[float] = Field(default=None, ge=0, le=5)
    ratingInfrastructure: Optional[float] = Field(default=None, ge=0, le=5)
    ratingCampusLife: Optional[float] = Field(default=None, ge=0, le=5)
    approved: bool = True
    model_config = ConfigDict(extra="forbid")


class RecordBody(BaseModel):
    name: str = Field(min_length=2, max_length=500)
    city: str = Field(min_length=1, max_length=200)
    state: str = Field(min_length=1, max_length=200)
    ownership: Literal["Private", "Government", "Deemed"]
    stream: str = Field(min_length=1, max_length=100)
    feesRange: str = Field(default="", max_length=100)
    about: str = Field(default="", max_length=20000)
    established: Optional[int] = Field(default=None, ge=1000, le=YEAR)
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
            {"name": x.name, "duration": x.duration, "mode": x.mode, "fees": x.fees, "exams": x.exams or [], "eligibility": x.eligibility or "", "seats": x.seats}
            for x in sorted(c.courses or [], key=lambda x: x.created_at or 0)
        ],
        "placements": [
            {
                "year": p.year,
                "average": p.average_package or "",
                "median": p.median_package or "",
                "highest": p.highest_package or "",
                "placedPercent": p.placed_percent,
                "topRecruiters": p.top_recruiters or [],
            }
            for p in sorted(c.placements or [], key=lambda p: p.year, reverse=True)
        ],
        "cutoffs": [{"exam": x.exam, "category": x.category, "score": x.score} for x in (c.cutoffs or [])],
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

    fields = (await db.execute(select(HomeField.name).order_by(HomeField.name))).scalars().all()
    streams = sorted({*fields, *(await db.execute(select(College.stream).distinct())).scalars().all()} - {""})
    exams = (await db.execute(select(Exam.name).order_by(Exam.name))).scalars().all()
    courses = (await db.execute(select(CourseCatalogue.name).where(CourseCatalogue.is_published.is_(True)).order_by(CourseCatalogue.name))).scalars().all()
    colleges = (await db.execute(select(College.slug, College.name).order_by(College.name))).all()
    in_use = (await db.execute(select(College.approvals, College.tags))).all()
    approvals = sorted({a for row in in_use for a in (row[0] or [])})
    tags = sorted({t for row in in_use for t in (row[1] or [])})
    return SuccessResponse[dict](
        data={
            "streams": streams,
            "exams": sorted(set(exams)),
            "courses": sorted(set(courses)),
            "colleges": [{"slug": s, "name": n} for s, n in colleges],
            "approvals": approvals,
            "tags": tags,
            "states": sorted(INDIA_DISTRICTS),
        }
    )


@router.get("/{slug}/record", response_model=SuccessResponse[dict])
async def get_record(slug: str, _admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=_record(await _load(db, slug)))


def _parse(raw: dict) -> RecordBody:
    try:
        return RecordBody.model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


def _check(data: RecordBody) -> None:
    """Rules that span rows."""
    years = [p.year for p in data.placements]
    if len(set(years)) != len(years):
        raise ValidationError("placements: a year appears more than once.")
    if bool(data.rankingAuthority.strip()) != (data.rankingRank is not None):
        raise ValidationError("rankingRank: give both the ranking and its rank, or neither.")
    names = [c.name.strip().lower() for c in data.courses]
    if len(set(names)) != len(names):
        raise ValidationError("courses: a programme is listed more than once.")
    seen = set()
    for cut in data.cutoffs:
        key = (cut.exam.strip().lower(), cut.category.strip().lower())
        if key in seen:
            raise ValidationError(f"cutoffs: {cut.exam} / {cut.category} appears more than once.")
        seen.add(key)


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

    row.name = data.name.strip()
    row.city = data.city.strip()
    row.state = data.state.strip()
    row.ownership = OwnershipType(data.ownership)
    row.stream = data.stream.strip()
    row.fees_range = data.feesRange.strip() or None
    row.about = data.about.strip() or None
    row.established = data.established
    row.ranking_authority = data.rankingAuthority.strip() or None
    row.ranking_rank = data.rankingRank
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
        db.add(Course(id=uuid.uuid4(), college_id=row.id, name=c.name.strip(), duration=c.duration.strip(), mode=c.mode, fees=c.fees.strip(),
                      exams=[e.strip() for e in c.exams if e.strip()], eligibility=c.eligibility.strip(), seats=c.seats))
    for p in data.placements:
        db.add(Placement(id=uuid.uuid4(), college_id=row.id, year=p.year, average_package=p.average.strip() or None, median_package=p.median.strip() or None,
                         highest_package=p.highest.strip() or None, placed_percent=p.placedPercent, top_recruiters=[r.strip() for r in p.topRecruiters if r.strip()]))
    for k in data.cutoffs:
        db.add(Cutoff(id=uuid.uuid4(), college_id=row.id, exam=k.exam.strip(), category=k.category.strip(), score=k.score.strip()))

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
    if data.courses:
        row.courses_offered = len(data.courses)

    await db.commit()
    return SuccessResponse[dict](data={"message": f"{row.name} saved."})
