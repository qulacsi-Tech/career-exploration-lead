"""Admin "Fields" of the homepage grid: add, edit, delete, show or hide and reorder.
ADMIN role required.

Each field is one disc on the homepage: a name, an icon from the admin's picker,
the average CTC under it, and a tagline and badge on its back. The link goes to
/<slug>/colleges, so a field only leads somewhere useful when colleges carry a
stream with that slug. The list reports how many do, so the admin can see a dead
link before a visitor finds it.

The slug is made from the name when the field is created and never changes, so a
rename does not break links. It follows the stream pages' rule: lowercase, spaces
become hyphens.
"""

import re
import uuid
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.home_field import HomeField
from repositories.college import CollegeRepository
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/fields", tags=["admin"])

# Letters, numbers and single spaces. Anything else could not become a working link.
NAME_PATTERN = re.compile(r"^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$")
ICON_PATTERN = re.compile(r"^[a-z0-9-]{1,30}$")


class FieldBody(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    icon: str = Field(min_length=1, max_length=30)
    tagline: str = Field(default="", max_length=120)
    badge: str = Field(default="", max_length=60)
    avgCtc: str = Field(default="", max_length=40)
    # Omitted: a new field shows, an edited one is unchanged.
    show: bool | None = None
    model_config = ConfigDict(extra="forbid")


class TickBody(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    show: bool
    model_config = ConfigDict(extra="forbid")


class TicksBody(BaseModel):
    fields: list[TickBody] = Field(max_length=100)
    model_config = ConfigDict(extra="forbid")


def _parse(body: dict) -> FieldBody:
    try:
        data = FieldBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    if not NAME_PATTERN.match(data.name.strip()):
        raise ValidationError("name: use letters, numbers and single spaces only, since the name becomes the page address.")
    if not ICON_PATTERN.match(data.icon):
        raise ValidationError("icon: choose an icon from the list.")
    return data


def _slug(name: str) -> str:
    return name.strip().lower().replace(" ", "-")


def _card(row: HomeField, colleges: int) -> dict[str, Any]:
    return {
        "slug": row.slug,
        "name": row.name,
        "icon": row.icon,
        "tagline": row.tagline,
        "badge": row.badge,
        "avgCtc": row.avg_ctc,
        "show": row.show_on_home,
        # Colleges whose stream matches this field's page. Zero means the link shows "not found".
        "collegeCount": colleges,
    }


async def _college_counts(db) -> dict[str, int]:
    counts = await CollegeRepository(db).stream_counts()
    return {_slug(c["name"]): c["count"] for c in counts if c["name"]}


def _apply(row: HomeField, data: FieldBody) -> None:
    row.name = data.name.strip()
    row.icon = data.icon
    row.tagline = data.tagline.strip()
    row.badge = data.badge.strip()
    row.avg_ctc = data.avgCtc.strip()


@router.get("", response_model=SuccessResponse[dict])
async def list_fields(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(select(HomeField).order_by(HomeField.home_order, HomeField.name))).scalars().all()
    counts = await _college_counts(db)
    return SuccessResponse[dict](data={"fields": [_card(r, counts.get(r.slug, 0)) for r in rows]})


@router.put("/order", response_model=SuccessResponse[dict])
async def save_order(_admin: AdminPayload, db: DbSession, body: dict):
    """Saves which fields show and their order (the list order)."""
    try:
        data = TicksBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    slugs = [t.slug for t in data.fields]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("fields: a field appears more than once.")
    rows = {r.slug: r for r in (await db.execute(select(HomeField).where(HomeField.slug.in_(slugs)))).scalars().all()}
    missing = [s for s in slugs if s not in rows]
    if missing:
        raise ValidationError(f"fields: unknown field '{missing[0]}'.")
    for index, tick in enumerate(data.fields):
        rows[tick.slug].show_on_home = tick.show
        rows[tick.slug].home_order = index
    await db.commit()
    return SuccessResponse[dict](data={"message": "Fields saved."})


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def create_field(_admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(body)
    slug = _slug(data.name)
    if (await db.execute(select(HomeField.id).where(HomeField.slug == slug))).scalar_one_or_none():
        raise ValidationError(f"name: a field called '{data.name.strip()}' already exists.")
    last = (await db.execute(select(func.max(HomeField.home_order)))).scalar()
    row = HomeField(id=uuid.uuid4(), slug=slug, show_on_home=data.show is not False, home_order=(last + 1) if last is not None else 0)
    _apply(row, data)
    db.add(row)
    await db.commit()
    return SuccessResponse[dict](data=_card(row, (await _college_counts(db)).get(slug, 0)))


@router.patch("/{slug}", response_model=SuccessResponse[dict])
async def update_field(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(body)
    row = (await db.execute(select(HomeField).where(HomeField.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Field")
    _apply(row, data)
    if data.show is not None:
        row.show_on_home = data.show
    await db.commit()
    return SuccessResponse[dict](data=_card(row, (await _college_counts(db)).get(row.slug, 0)))


@router.delete("/{slug}", response_model=SuccessResponse[dict])
async def delete_field(slug: str, _admin: AdminPayload, db: DbSession):
    row = (await db.execute(select(HomeField).where(HomeField.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Field")
    await db.delete(row)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Field deleted."})
