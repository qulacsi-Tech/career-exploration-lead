"""The header content of a listing page (/colleges, /courses): the author (name, role,
photo) and the intro text under the heading. Each page has its own, edited from that
page's admin screen. The public read is open; the write needs ADMIN.

An empty name hides the author row; an empty intro falls back to a short guide the page
writes from its own data.

A header can also belong to one selection in the colleges menu (a course, a city, a ranking
list...), named by a scope such as "course=MBA". The page uses the scope's header when it has
one and the page's own otherwise.
"""

import re

from typing import Literal

from fastapi import APIRouter, Query
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
    # Empty: the page writes the heading from the filters picked.
    title: str = Field(default="", max_length=120)
    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "role", "intro", "title")
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


_SCOPE = re.compile(r"^(city|course|specialisation|credential|level|mode|ownership|exam|approval|ranking_list)=[^\n]{1,60}$")


def _scope(value: str) -> str:
    """The scope as given, or "" for the page's own header. Anything else is refused."""
    value = value.strip()
    if value and not _SCOPE.match(value):
        raise ValidationError("scope: not a selection from the colleges menu")
    return value


def _key(page: str, scope: str = "") -> str:
    return f"listing.header.{page}:{scope}" if scope else f"listing.header.{page}"


async def _row(db, key: str):
    return (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()


def _body(data) -> dict | None:
    if not isinstance(data, dict):
        return None
    try:
        return HeaderBody.model_validate({k: v for k, v in data.items() if k in HeaderBody.model_fields}).model_dump()
    except PydanticValidationError:
        return None


async def _current(db, page: str, scope: str = "") -> dict:
    """The header for `scope` when it has its own (`custom` true), else the page's. Never fails."""
    if scope:
        row = await _row(db, _key(page, scope))
        body = _body(row.data) if row else None
        if body is not None:
            return {**body, "custom": True}
    keys = [_key(page)] + (["colleges.author"] if page == "colleges" else [])  # the older author-only record
    for key in keys:
        row = await _row(db, key)
        body = _body(row.data) if row else None
        if body is not None:
            return {**body, "custom": not scope}
    return {**HeaderBody().model_dump(), "custom": False}


@public_router.get("/{page}", response_model=SuccessResponse[dict])
async def get_listing_header(page: Page, db: DbSession, scope: str = Query(default="", max_length=80)):
    return SuccessResponse[dict](data=await _current(db, page, _scope(scope)))


@router.get("/{page}/scopes", response_model=SuccessResponse[list[str]])
async def admin_listing_header_scopes(page: Page, _admin: AdminPayload, db: DbSession):
    """The selections that have a header of their own."""
    prefix = _key(page) + ":"
    rows = (await db.execute(select(SiteContent.key).where(SiteContent.key.startswith(prefix, autoescape=True)))).scalars().all()
    return SuccessResponse[list[str]](data=sorted(k[len(prefix):] for k in rows))


@router.get("/{page}", response_model=SuccessResponse[dict])
async def admin_get_listing_header(page: Page, _admin: AdminPayload, db: DbSession, scope: str = Query(default="", max_length=80)):
    return SuccessResponse[dict](data=await _current(db, page, _scope(scope)))


@router.put("/{page}", response_model=SuccessResponse[dict])
async def admin_put_listing_header(
    page: Page, _admin: AdminPayload, db: DbSession, body: dict, scope: str = Query(default="", max_length=80)
):
    scope = _scope(scope)
    try:
        value = HeaderBody.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    key = _key(page, scope)
    row = await _row(db, key)
    if row is None:
        db.add(SiteContent(key=key, data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})


@router.delete("/{page}", response_model=SuccessResponse[dict])
async def admin_reset_listing_header(page: Page, _admin: AdminPayload, db: DbSession, scope: str = Query(max_length=80)):
    """Drop a selection's own header, so it shows the page's again."""
    scope = _scope(scope)
    if not scope:
        raise ValidationError("scope: choose a selection to reset")
    row = await _row(db, _key(page, scope))
    if row is not None:
        await db.delete(row)
        await db.commit()
    return SuccessResponse[dict](data={"message": "Reset."})
