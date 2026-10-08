"""Admin location directory: add, edit and delete locations. ADMIN role required.

A location is a city page on the site (/location/<slug>) and, when ticked, a card
in the homepage carousel. Which locations show and in what order is saved
separately, from the homepage Location tab (see admin_homepage.py).

The slug is made from the name once, when the location is created, and never
changes afterwards, so renaming a location does not break links to its page.
"""

import re
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import delete, func, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from data.india_districts import INDIA_DISTRICTS
from models.location import Location, LocationLabel, LocationLabelLink
from routers.admin_homepage import _card, _location_image
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/locations", tags=["admin"])

MAX_CARD_LABELS = 6
MAX_COURSE_FEES = 3
MAX_FEATURED_STREAMS = 6
MAX_FEATURED_COLLEGES = 12


class FeaturedBody(BaseModel):
    stream: str = Field(min_length=1, max_length=100)
    colleges: list[str] = Field(default_factory=list, max_length=MAX_FEATURED_COLLEGES)
    model_config = ConfigDict(extra="forbid")


class CourseFeeBody(BaseModel):
    category: str = Field(min_length=1, max_length=60)
    fees: str = Field(min_length=1, max_length=40)
    model_config = ConfigDict(extra="forbid")


class LocationBody(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    state: str = Field(min_length=2, max_length=200)
    district: str = Field(default="", max_length=200)
    collegeCount: int = Field(default=0, ge=0, le=100000)
    description: str = Field(default="", max_length=400)
    avgPackage: str = Field(default="", max_length=60)
    image: str = Field(default="", max_length=200)
    # The pool labels this card shows, by text. A text not yet in the pool is added to it.
    # Omitted: leave the card's labels as they are.
    labels: list[str] | None = Field(default=None, max_length=MAX_CARD_LABELS)
    # Course categories and fee ranges shown as tiles. Omitted: left as they are.
    courseFees: list[CourseFeeBody] | None = Field(default=None, max_length=MAX_COURSE_FEES)
    # Categories the card offers and the colleges under each. Omitted: left as they are.
    featured: list[FeaturedBody] | None = Field(default=None, max_length=MAX_FEATURED_STREAMS)
    # The college the card's photo shows, named in a caption on it. Empty: no caption.
    imageCaption: str = Field(default="", max_length=120)
    # Figures over the photo. Empty: worked out from the location's colleges.
    nirfRank: int | None = Field(default=None, ge=1, le=10000)
    otherRankLabel: str = Field(default="", max_length=60)
    otherRank: int | None = Field(default=None, ge=1, le=10000)
    topRating: float | None = Field(default=None, ge=0, le=5)
    # On the homepage carousel. Omitted: a new location shows, an edited one is unchanged.
    show: bool | None = None
    model_config = ConfigDict(extra="forbid")

    _image = field_validator("image")(_location_image)

    @field_validator("labels")
    @classmethod
    def _label_texts(cls, value):
        if value is None:
            return value
        for text in value:
            if len(text.strip()) > 60:
                raise ValueError("a label is longer than 60 characters")
        return value


def _parse(body: dict) -> LocationBody:
    try:
        data = LocationBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    # State and district come from the dropdowns, so anything else is a bad request.
    state = data.state.strip()
    if state not in INDIA_DISTRICTS:
        raise ValidationError("state: choose a state or union territory from the list.")
    district = data.district.strip()
    if district and district not in INDIA_DISTRICTS[state]:
        raise ValidationError(f"district: '{district}' is not a district of {state}.")
    return data


def _check_figures(data: LocationBody) -> None:
    """Another ranking's rank needs the ranking's name, and the name needs a rank."""
    if (data.otherRank is None) != (data.otherRankLabel.strip() == ""):
        raise ValidationError("otherRank: give both the ranking's name and its rank, or neither.")


async def _check_featured(db, featured: list[FeaturedBody] | None) -> None:
    """Every category must be unique and every college must exist and belong to its category."""
    if not featured:
        return
    from models.college import College

    streams = [f.stream.strip() for f in featured]
    if len({s.lower() for s in streams}) != len(streams):
        raise ValidationError("featured: a category appears more than once.")
    slugs = [s for f in featured for s in f.colleges]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("featured: a college is picked more than once.")
    found = {
        slug: stream
        for slug, stream in (await db.execute(select(College.slug, College.stream).where(College.slug.in_(slugs)))).all()
    }
    for f in featured:
        for slug in f.colleges:
            if slug not in found:
                raise ValidationError(f"featured: unknown college '{slug}'.")
            if found[slug].strip().lower() != f.stream.strip().lower():
                raise ValidationError(f"featured: '{slug}' is not a {f.stream.strip()} college.")


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _apply(row: Location, data: LocationBody) -> None:
    row.name = data.name.strip()
    row.state = data.state.strip()
    row.district = data.district.strip()
    row.college_count = data.collegeCount
    row.description = data.description.strip()
    row.avg_package = data.avgPackage.strip()
    row.image = data.image
    row.image_caption = data.imageCaption.strip()
    row.nirf_rank = data.nirfRank
    row.other_rank_label = data.otherRankLabel.strip()
    row.other_rank = data.otherRank
    row.top_rating = data.topRating
    if data.courseFees is not None:
        row.course_fees = [{"category": c.category.strip(), "fees": c.fees.strip()} for c in data.courseFees]
    if data.featured is not None:
        row.featured = [{"stream": f.stream.strip(), "colleges": f.colleges} for f in data.featured]


async def _set_labels(db, row: Location, texts: list[str]) -> list[str]:
    """Makes `texts` exactly the labels on this card, adding unknown ones to the pool.

    Matching is case-insensitive, so typing "student capital" reuses "Student Capital"
    rather than creating a near-duplicate. Returns the card's labels in pool order.
    """
    clean: list[str] = []
    seen: set[str] = set()
    for text in texts:
        text = text.strip()
        if text and text.lower() not in seen:
            seen.add(text.lower())
            clean.append(text)

    pool = {l.text.lower(): l for l in (await db.execute(select(LocationLabel))).scalars().all()}
    last = max((l.position for l in pool.values()), default=-1)
    chosen: list[LocationLabel] = []
    for text in clean:
        label = pool.get(text.lower())
        if label is None:
            last += 1
            label = LocationLabel(id=uuid.uuid4(), text=text, position=last)
            db.add(label)
            pool[text.lower()] = label
        chosen.append(label)
    await db.flush()

    await db.execute(delete(LocationLabelLink).where(LocationLabelLink.location_id == row.id))
    for label in chosen:
        db.add(LocationLabelLink(label_id=label.id, location_id=row.id))
    return [l.text for l in sorted(chosen, key=lambda l: (l.position, l.text))]


async def _prune_labels(db) -> None:
    """Drops labels no card uses, so the suggestion list never fills with leftovers."""
    used = select(LocationLabelLink.label_id)
    await db.execute(delete(LocationLabel).where(LocationLabel.id.not_in(used)))


async def _current_labels(db, row: Location) -> list[str]:
    from repositories.location import LocationRepository
    return (await LocationRepository(db).labels_for([row.id])).get(row.id, [])


@router.get("/picker", response_model=SuccessResponse[dict])
async def picker(_admin: AdminPayload, db: DbSession):
    """Every category and its colleges: what the card editor's pickers offer."""
    from models.college import College

    rows = (await db.execute(select(College.slug, College.name, College.stream, College.city).order_by(College.name))).all()
    streams = sorted({r.stream for r in rows})
    return SuccessResponse[dict](
        data={
            "streams": streams,
            "colleges": [{"slug": r.slug, "name": r.name, "stream": r.stream, "city": r.city} for r in rows],
        }
    )


@router.get("/geo", response_model=SuccessResponse[dict])
async def geo(_admin: AdminPayload):
    """Every state or union territory with its districts, for the admin's dropdowns."""
    return SuccessResponse[dict](data={"states": INDIA_DISTRICTS})


# ── Card labels ──────────────────────────────────────────────────────────────


async def _labels_payload(db) -> list[dict]:
    labels = (await db.execute(select(LocationLabel).order_by(LocationLabel.position, LocationLabel.text))).scalars().all()
    links = (
        await db.execute(
            select(LocationLabelLink.label_id, Location.slug)
            .join(Location, Location.id == LocationLabelLink.location_id)
            .order_by(Location.name)
        )
    ).all()
    by_label: dict = {}
    for label_id, slug in links:
        by_label.setdefault(label_id, []).append(slug)
    return [{"id": str(l.id), "text": l.text, "slugs": by_label.get(l.id, [])} for l in labels]


@router.get("/labels", response_model=SuccessResponse[dict])
async def list_labels(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data={"labels": await _labels_payload(db)})


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def create_location(_admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(body)
    _check_figures(data)
    await _check_featured(db, data.featured)
    slug = _slugify(data.name)
    if not slug:
        raise ValidationError("name: use letters or numbers.")
    taken = (await db.execute(select(Location.id).where(Location.slug == slug))).scalar_one_or_none()
    if taken:
        raise ValidationError(f"name: a location called '{data.name.strip()}' already exists.")

    last = (await db.execute(select(func.max(Location.home_order)))).scalar()
    row = Location(id=uuid.uuid4(), slug=slug, show_on_home=data.show is not False, home_order=(last + 1) if last is not None else 0)
    _apply(row, data)
    db.add(row)
    await db.flush()
    labels = await _set_labels(db, row, data.labels) if data.labels else []
    await _prune_labels(db)
    await db.commit()
    return SuccessResponse[dict](data=_card(row, labels))


@router.patch("/{slug}", response_model=SuccessResponse[dict])
async def update_location(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(body)
    _check_figures(data)
    await _check_featured(db, data.featured)
    row = (await db.execute(select(Location).where(Location.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Location")
    _apply(row, data)
    if data.show is not None:
        row.show_on_home = data.show
    if data.labels is not None:
        labels = await _set_labels(db, row, data.labels)
        await _prune_labels(db)
    else:
        labels = await _current_labels(db, row)
    await db.commit()
    return SuccessResponse[dict](data=_card(row, labels))


@router.delete("/{slug}", response_model=SuccessResponse[dict])
async def delete_location(slug: str, _admin: AdminPayload, db: DbSession):
    row = (await db.execute(select(Location).where(Location.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Location")
    await db.delete(row)
    await db.flush()
    await _prune_labels(db)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Location deleted."})
