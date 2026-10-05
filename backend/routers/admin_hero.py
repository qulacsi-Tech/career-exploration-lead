"""Admin hero slides: add, edit, activate or deactivate, delete and reorder.
ADMIN role required.

Each slide is a headline, a sub-headline and a picture. The homepage rotates the
active slides in order, and shows a plain hero when only one is active. The search
box under the slides is shared and is edited with the homepage copy.
"""

import uuid
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.hero_item import HeroItem
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/hero-items", tags=["admin"])

MAX_SLIDES = 8


def _photo(value: str) -> str:
    """Empty, an upload, or a photo shipped with the site. Never an external address."""
    value = value.strip()
    allowed = value.startswith("/api/uploads/") or value.startswith("/images/")
    if value and (not allowed or ".." in value):
        raise ValueError("must be an image uploaded through the admin")
    return value


class HeroBody(BaseModel):
    headline: str = Field(min_length=5, max_length=150)
    subheadline: str = Field(min_length=5, max_length=300)
    image: str = Field(default="", max_length=200)
    imageAlt: str = Field(default="", max_length=150)
    # Omitted: a new slide is active, an edited one is unchanged.
    active: bool | None = None
    model_config = ConfigDict(extra="forbid")

    _image = field_validator("image")(_photo)


class OrderBody(BaseModel):
    ids: list[str] = Field(max_length=MAX_SLIDES)
    model_config = ConfigDict(extra="forbid")


def _parse(model, body: dict):
    try:
        return model.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


def _card(row: HeroItem) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "headline": row.headline,
        "subheadline": row.subheadline,
        "image": row.image,
        "imageAlt": row.image_alt,
        "active": row.active,
    }


def _apply(row: HeroItem, data: HeroBody) -> None:
    row.headline = data.headline.strip()
    row.subheadline = data.subheadline.strip()
    row.image = data.image
    row.image_alt = data.imageAlt.strip()


async def _get(db, item_id: str) -> HeroItem:
    try:
        key = uuid.UUID(item_id)
    except ValueError:
        raise NotFoundError("Hero slide")
    row = (await db.execute(select(HeroItem).where(HeroItem.id == key))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Hero slide")
    return row


@router.get("", response_model=SuccessResponse[dict])
async def list_slides(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(select(HeroItem).order_by(HeroItem.position, HeroItem.headline))).scalars().all()
    return SuccessResponse[dict](data={"items": [_card(r) for r in rows], "max": MAX_SLIDES})


@router.put("/order", response_model=SuccessResponse[dict])
async def save_order(_admin: AdminPayload, db: DbSession, body: dict):
    """Saves the order of every slide. The list must hold each slide exactly once."""
    data = _parse(OrderBody, body)
    rows = {str(r.id): r for r in (await db.execute(select(HeroItem))).scalars().all()}
    if len(set(data.ids)) != len(data.ids):
        raise ValidationError("ids: a slide appears more than once.")
    if set(data.ids) != set(rows):
        raise ValidationError("ids: the list does not match the slides. Reload the page and try again.")
    for index, item_id in enumerate(data.ids):
        rows[item_id].position = index
    await db.commit()
    return SuccessResponse[dict](data={"message": "Order saved."})


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def create_slide(_admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(HeroBody, body)
    count = (await db.execute(select(func.count(HeroItem.id)))).scalar() or 0
    if count >= MAX_SLIDES:
        raise ValidationError(f"The hero holds up to {MAX_SLIDES} slides. Delete one to add another.")
    last = (await db.execute(select(func.max(HeroItem.position)))).scalar()
    row = HeroItem(id=uuid.uuid4(), active=data.active is not False, position=(last + 1) if last is not None else 0)
    _apply(row, data)
    db.add(row)
    await db.commit()
    return SuccessResponse[dict](data=_card(row))


@router.patch("/{item_id}", response_model=SuccessResponse[dict])
async def update_slide(item_id: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(HeroBody, body)
    row = await _get(db, item_id)
    _apply(row, data)
    if data.active is not None:
        row.active = data.active
    await db.commit()
    return SuccessResponse[dict](data=_card(row))


@router.delete("/{item_id}", response_model=SuccessResponse[dict])
async def delete_slide(item_id: str, _admin: AdminPayload, db: DbSession):
    row = await _get(db, item_id)
    await db.delete(row)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Slide deleted."})
