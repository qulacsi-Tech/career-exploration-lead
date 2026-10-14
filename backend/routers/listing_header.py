"""The header content of a listing page (/colleges, /courses): the author (name, role,
photo) and the intro text under the heading. Each page has its own, edited from that
page's admin screen. The public read is open; the write needs ADMIN.

An empty name hides the author row; an empty intro falls back to a short guide the page
writes from its own data.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse

Page = Literal["colleges", "courses"]

public_router = APIRouter(prefix="/listing-header", tags=["listings"])
router = APIRouter(prefix="/admin/listing-header", tags=["admin"])


class HeaderBody(BaseModel):
    name: str = Field(default="", max_length=80)
    role: str = Field(default="", max_length=80)
    photo: str = Field(default="", max_length=200)
    # Paragraphs separated by a blank line.
    intro: str = Field(default="", max_length=4000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "role", "intro")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()

    @field_validator("photo")
    @classmethod
    def _upload_path(cls, value: str) -> str:
        """Empty, or a path to one of our own uploads. Never an external address."""
        value = value.strip()
        if value and not (value.startswith("/api/uploads/") and ".." not in value):
            raise ValueError("must be an image uploaded through the admin")
        return value


def _key(page: str) -> str:
    return f"listing.header.{page}"


async def _current(db, page: str) -> dict:
    keys = [_key(page)] + (["colleges.author"] if page == "colleges" else [])  # the older author-only record
    for key in keys:
        row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
        if row and isinstance(row.data, dict):
            try:
                return HeaderBody.model_validate({k: v for k, v in row.data.items() if k in HeaderBody.model_fields}).model_dump()
            except PydanticValidationError:
                continue
    return HeaderBody().model_dump()


@public_router.get("/{page}", response_model=SuccessResponse[dict])
async def get_listing_header(page: Page, db: DbSession):
    return SuccessResponse[dict](data=await _current(db, page))


@router.get("/{page}", response_model=SuccessResponse[dict])
async def admin_get_listing_header(page: Page, _admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db, page))


@router.put("/{page}", response_model=SuccessResponse[dict])
async def admin_put_listing_header(page: Page, _admin: AdminPayload, db: DbSession, body: dict):
    try:
        value = HeaderBody.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    row = (await db.execute(select(SiteContent).where(SiteContent.key == _key(page)))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=_key(page), data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
