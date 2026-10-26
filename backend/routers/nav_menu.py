"""What the admin has decided about the "Top Ranked Colleges" menu in the site header.

The menu's groups and links still come from what the directory holds (ranking lists, courses,
cities...). This record only sits on top: which groups and links are shown, in what order, under
what name, and the page title and description a link's listing page gets. Nothing in the record
means "as the directory has it", so a new course still appears without anyone touching this.

Groups are named by the menu's own ids; links by the filter value they stand for (the course name,
the ranking list's slug...). The public read is open; the write needs ADMIN.
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

KEY = "nav.collegesMenu"
GroupId = Literal["ranking", "course", "specialisation", "location", "type", "level", "mode", "exam"]

public_router = APIRouter(prefix="/nav", tags=["nav"])
router = APIRouter(prefix="/admin/nav", tags=["admin"])


def _trim(value: str) -> str:
    return value.strip()


class ItemBody(BaseModel):
    # Empty: the link keeps the name the directory gives it.
    label: str = Field(default="", max_length=80)
    hidden: bool = False
    # Empty: the listing page writes its own title and description.
    seoTitle: str = Field(default="", max_length=120)
    seoDescription: str = Field(default="", max_length=320)
    model_config = ConfigDict(extra="forbid")

    _trimmed = field_validator("label", "seoTitle", "seoDescription")(_trim)


class GroupBody(BaseModel):
    # Empty: the group keeps its built-in name.
    label: str = Field(default="", max_length=60)
    hidden: bool = False
    # How many links the group shows. 0: the built-in limit.
    limit: int = Field(default=0, ge=0, le=100)
    # Links in the order they show; links not listed follow in the directory's order.
    order: list[str] = Field(default_factory=list, max_length=500)
    items: dict[str, ItemBody] = Field(default_factory=dict, max_length=500)
    model_config = ConfigDict(extra="forbid")

    _label = field_validator("label")(_trim)


class NavBody(BaseModel):
    # Groups in the order they show; groups not listed follow in the built-in order.
    order: list[GroupId] = Field(default_factory=list, max_length=8)
    groups: dict[GroupId, GroupBody] = Field(default_factory=dict)
    model_config = ConfigDict(extra="forbid")


async def _current(db) -> dict:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row and isinstance(row.data, dict):
        try:
            return NavBody.model_validate(row.data).model_dump()
        except PydanticValidationError:
            pass  # A record that no longer fits the shape reads as "nothing decided".
    return NavBody().model_dump()


@public_router.get("/colleges-menu", response_model=SuccessResponse[dict])
async def get_colleges_menu_config(db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.get("/colleges-menu", response_model=SuccessResponse[dict])
async def admin_get_colleges_menu_config(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.put("/colleges-menu", response_model=SuccessResponse[dict])
async def admin_put_colleges_menu_config(_admin: AdminPayload, db: DbSession, body: dict):
    try:
        value = NavBody.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=KEY, data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
