"""Admin homepage bands: which collections appear on the homepage, in what order,
how many cards, and whether each is shown. ADMIN role required.

The band order and placement are stored on each collection, so this screen and
the collection editor cannot disagree. Saving writes the whole set in one
transaction: a collection not in the list loses its band.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
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


@router.get("/top-exams", response_model=SuccessResponse[dict])
async def admin_get_top_exams(_admin: AdminPayload, db: DbSession):
    from models.exam import Exam
    from models.site_content import SiteContent
    row = (await db.execute(select(SiteContent).where(SiteContent.key == "home.topExams"))).scalar_one_or_none()
    slugs = list(row.data) if row and isinstance(row.data, list) else []
    names = dict((await db.execute(select(Exam.slug, Exam.name))).all())
    return SuccessResponse[dict](data={
        "slugs": slugs,
        "exams": [{"slug": s, "name": names[s]} for s in slugs if s in names],
        "options": [{"slug": s, "name": n} for s, n in sorted(names.items(), key=lambda kv: kv[1])],
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
