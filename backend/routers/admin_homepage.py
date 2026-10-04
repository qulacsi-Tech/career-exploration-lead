"""Admin homepage bands: which collections appear on the homepage, in what order,
how many cards, and whether each is shown. ADMIN role required.

The band order and placement are stored on each collection, so this screen and
the collection editor cannot disagree. Saving writes the whole set in one
transaction: a collection not in the list loses its band.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.collection import Collection
from schemas.common import SuccessResponse
from services.collections import CollectionService

router = APIRouter(prefix="/admin/homepage", tags=["admin"])


class BandBody(BaseModel):
    slug: str = Field(min_length=2, max_length=200)
    limit: int = Field(ge=1, le=24)
    isVisible: bool
    model_config = ConfigDict(extra="forbid")


class BandsBody(BaseModel):
    bands: list[BandBody] = Field(default_factory=list, max_length=20)
    model_config = ConfigDict(extra="forbid")


@router.get("", response_model=SuccessResponse[dict])
async def admin_homepage(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(select(Collection))).scalars().all()
    service = CollectionService(db)

    placed: list[dict[str, Any]] = []
    available: list[dict[str, Any]] = []
    for row in rows:
        d = row.data
        placement = (d.get("placements") or {}).get("homepage")
        if placement:
            everything = await service.colleges_for(d)
            shown = everything[: placement["limit"]]
            placed.append({
                "slug": d["slug"],
                "title": d["title"],
                "heading": d.get("heading") or d["title"],
                "isPublished": bool(d.get("isPublished")),
                "isVisible": placement["isVisible"],
                "limit": placement["limit"],
                "order": placement["order"],
                "total": len(everything),
                # The same resolution the public page uses, so the preview is what visitors see.
                "preview": [{"slug": c.slug, "name": c.name} for c in shown],
            })
        else:
            available.append({"slug": d["slug"], "title": d["title"], "isPublished": bool(d.get("isPublished"))})

    placed.sort(key=lambda b: b["order"])
    available.sort(key=lambda b: b["title"])
    return SuccessResponse[dict](data={"bands": placed, "available": available})


@router.put("", response_model=SuccessResponse[dict])
async def admin_save_homepage(_admin: AdminPayload, db: DbSession, body: dict):
    try:
        data = BandsBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    slugs = [b.slug for b in data.bands]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("bands: a collection appears more than once.")

    rows = (await db.execute(select(Collection))).scalars().all()
    by_slug = {r.slug: r for r in rows}
    wanted = {b.slug: b for b in data.bands}

    for slug in slugs:
        if slug not in by_slug:
            raise ValidationError(f"bands: unknown collection '{slug}'.")
        if not by_slug[slug].data.get("isPublished"):
            raise ValidationError(f"bands: '{slug}' must be published before it can be on the homepage.")

    now = datetime.now(timezone.utc).isoformat()
    for row in rows:
        placements = dict(row.data.get("placements") or {})
        band = wanted.get(row.slug)
        if band is None:
            if "homepage" not in placements:
                continue
            placements.pop("homepage")
        else:
            placements["homepage"] = {
                "order": slugs.index(row.slug),
                "limit": band.limit,
                "isVisible": band.isVisible,
            }
        # A new dict, so the JSON column is seen as changed.
        row.data = {**row.data, "placements": placements, "updatedAt": now}

    await db.commit()
    return SuccessResponse[dict](data={"message": "Homepage bands saved."})


class TopExamsBody(BaseModel):
    slugs: list[str] = Field(default_factory=list, max_length=6)
    model_config = ConfigDict(extra="forbid")


def _exam_card(e, show: bool) -> dict:
    return {
        "slug": e.slug,
        "name": e.name,
        "conductingBody": e.conducting_body,
        "level": e.level.value if hasattr(e.level, "value") else str(e.level),
        "mode": e.mode or "",
        "description": e.description,
        "registrationCloses": e.registration_closes or "",
        "examDate": e.exam_date or "",
        "applicationFee": e.application_fee or "",
        "frequency": e.frequency or "",
        "officialSite": e.official_site or "",
        "durationMinutes": e.duration_minutes,
        "sections": e.sections or [],
        "image": e.image or "",
        "show": show,
    }


@router.get("/top-exams", response_model=SuccessResponse[dict])
async def admin_get_top_exams(_admin: AdminPayload, db: DbSession):
    """Every exam. The ones in the homepage row come first, in their order; the rest by name."""
    from models.exam import Exam
    from models.site_content import SiteContent
    row = (await db.execute(select(SiteContent).where(SiteContent.key == "home.topExams"))).scalar_one_or_none()
    slugs = list(row.data) if row and isinstance(row.data, list) else []
    exams = {e.slug: e for e in (await db.execute(select(Exam).order_by(Exam.name))).scalars().all()}
    chosen = [s for s in slugs if s in exams]
    rest = [s for s in exams if s not in chosen]
    return SuccessResponse[dict](data={
        "slugs": chosen,
        "exams": [_exam_card(exams[s], True) for s in chosen] + [_exam_card(exams[s], False) for s in rest],
    })


@router.put("/top-exams", response_model=SuccessResponse[dict])
async def admin_set_top_exams(_admin: AdminPayload, db: DbSession, body: dict):
    from models.exam import Exam
    from models.site_content import SiteContent
    data = _validate_top(body)
    if len(set(data.slugs)) != len(data.slugs):
        raise ValidationError("slugs: an exam appears more than once.")
    known = set((await db.execute(select(Exam.slug).where(Exam.slug.in_(data.slugs)))).scalars().all())
    missing = [s for s in data.slugs if s not in known]
    if missing:
        raise ValidationError(f"slugs: unknown exam '{missing[0]}'.")

    row = (await db.execute(select(SiteContent).where(SiteContent.key == "home.topExams"))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key="home.topExams", data=data.slugs))
    else:
        row.data = data.slugs
    await db.commit()
    return SuccessResponse[dict](data={"message": "Top exams saved."})


def _validate_top(body: dict) -> TopExamsBody:
    try:
        return TopExamsBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


class UniversitiesBody(BaseModel):
    slugs: list[str] = Field(default_factory=list, max_length=3)
    model_config = ConfigDict(extra="forbid")


@router.get("/universities", response_model=SuccessResponse[dict])
async def admin_get_universities(_admin: AdminPayload, db: DbSession):
    from models.college import College
    from models.site_content import SiteContent
    row = (await db.execute(select(SiteContent).where(SiteContent.key == "home.recommendedUniversities"))).scalar_one_or_none()
    slugs = list(row.data) if row and isinstance(row.data, list) else []
    colleges = dict((await db.execute(select(College.slug, College.name))).all())
    return SuccessResponse[dict](data={
        "slugs": slugs,
        "colleges": [{"slug": s, "name": colleges[s]} for s in slugs if s in colleges],
        "options": [{"slug": s, "name": n} for s, n in sorted(colleges.items(), key=lambda kv: kv[1])],
    })


@router.put("/universities", response_model=SuccessResponse[dict])
async def admin_set_universities(_admin: AdminPayload, db: DbSession, body: dict):
    from models.college import College
    from models.site_content import SiteContent
    try:
        data = UniversitiesBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    if len(set(data.slugs)) != len(data.slugs):
        raise ValidationError("slugs: a college appears more than once.")
    known = set((await db.execute(select(College.slug).where(College.slug.in_(data.slugs)))).scalars().all())
    missing = [s for s in data.slugs if s not in known]
    if missing:
        raise ValidationError(f"slugs: unknown college '{missing[0]}'.")

    row = (await db.execute(select(SiteContent).where(SiteContent.key == "home.recommendedUniversities"))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key="home.recommendedUniversities", data=data.slugs))
    else:
        row.data = data.slugs
    await db.commit()
    return SuccessResponse[dict](data={"message": "Recommended colleges saved."})


# ── Homepage location carousel ───────────────────────────────────────────────


def _location_image(value: str) -> str:
    """Empty, an upload, or one of the photos shipped with the site. Never an external address."""
    value = value.strip()
    allowed = value.startswith("/api/uploads/") or value.startswith("/images/locations/")
    if value and (not allowed or ".." in value):
        raise ValueError("must be an image uploaded through the admin")
    return value


class LocationTickBody(BaseModel):
    slug: str = Field(min_length=1, max_length=200)
    show: bool
    model_config = ConfigDict(extra="forbid")


class LocationTicksBody(BaseModel):
    locations: list[LocationTickBody] = Field(max_length=200)
    model_config = ConfigDict(extra="forbid")


def _card(loc, labels: list[str] | None = None) -> dict[str, Any]:
    return {
        "slug": loc.slug,
        "name": loc.name,
        "state": loc.state,
        "district": loc.district,
        "show": loc.show_on_home,
        "collegeCount": loc.college_count,
        "labels": labels or [],
        "description": loc.description,
        "avgPackage": loc.avg_package,
        "image": loc.image,
    }


@router.get("/locations", response_model=SuccessResponse[dict])
async def admin_get_home_locations(_admin: AdminPayload, db: DbSession):
    """Every location, in homepage order. Ticked or not, a location keeps its place."""
    from models.location import Location
    from repositories.location import LocationRepository
    rows = (await db.execute(select(Location))).scalars().all()
    rows = sorted(rows, key=lambda r: (r.home_order, -r.college_count, r.name))
    labels = await LocationRepository(db).labels_for([r.id for r in rows])
    return SuccessResponse[dict](data={"locations": [_card(r, labels.get(r.id, [])) for r in rows]})


@router.put("/locations", response_model=SuccessResponse[dict])
async def admin_put_home_locations(_admin: AdminPayload, db: DbSession, body: dict):
    """Saves which locations show and their order (the list order).

    Card content is edited per location in admin_locations.py, so this never
    overwrites it.
    """
    from models.location import Location
    try:
        data = LocationTicksBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    slugs = [c.slug for c in data.locations]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("locations: a location appears more than once.")
    rows = {r.slug: r for r in (await db.execute(select(Location).where(Location.slug.in_(slugs)))).scalars().all()}
    missing = [s for s in slugs if s not in rows]
    if missing:
        raise ValidationError(f"locations: unknown location '{missing[0]}'.")

    for index, tick in enumerate(data.locations):
        row = rows[tick.slug]
        row.show_on_home = tick.show
        row.home_order = index
    await db.commit()
    return SuccessResponse[dict](data={"message": "Locations saved."})
