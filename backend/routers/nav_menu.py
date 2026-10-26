"""What the admin has decided about the "Top Ranked Colleges" menu in the site header.

The menu's groups and links still come from what the directory holds (ranking lists, courses,
cities...). This record only sits on top: which groups and links are shown, in what order, under
what name, the page title and description a link's listing page gets, and which institutes a link
leaves out. It also holds the categories the admin adds themselves, each a list of collections.
Nothing in the record means "as the directory has it", so a new course still appears without anyone
touching this.

Groups are named by the menu's own ids (or "custom-xxxx" for an added one); links by the filter
value they stand for (the course name, the ranking list's slug, a collection's slug...). The public
read is open; the write needs ADMIN.
"""

import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse

KEY = "nav.collegesMenu"
BUILT_IN = ("ranking", "course", "specialisation", "location", "type", "level", "mode", "exam", "collection")
GROUP_ID = re.compile(r"^(" + "|".join(BUILT_IN) + r"|custom-[a-z0-9]{4,16})$")
MAX_CUSTOM = 12

public_router = APIRouter(prefix="/nav", tags=["nav"])
router = APIRouter(prefix="/admin/nav", tags=["admin"])


def _trim(value: str) -> str:
    return value.strip()


def _group_id(value: str) -> str:
    if not GROUP_ID.match(value):
        raise ValueError(f"'{value}' is not a menu category.")
    return value


class ItemBody(BaseModel):
    # Empty: the link keeps the name the directory gives it.
    label: str = Field(default="", max_length=80)
    hidden: bool = False
    # Empty: the listing page writes its own title and description.
    seoTitle: str = Field(default="", max_length=120)
    seoDescription: str = Field(default="", max_length=320)
    # Slugs of institutes the link's listing leaves out.
    excluded: list[str] = Field(default_factory=list, max_length=1000)
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


class CustomGroup(BaseModel):
    """A category the admin added: a name and the collections it links to."""

    id: str
    label: str = Field(min_length=1, max_length=60)
    collections: list[str] = Field(default_factory=list, max_length=100)
    model_config = ConfigDict(extra="forbid")

    _label = field_validator("label")(_trim)

    @field_validator("id")
    @classmethod
    def _custom_id(cls, value: str) -> str:
        if not value.startswith("custom-"):
            raise ValueError("an added category's id starts with custom-.")
        return _group_id(value)


class NavBody(BaseModel):
    # Groups in the order they show; groups not listed follow in the built-in order.
    order: list[str] = Field(default_factory=list, max_length=MAX_CUSTOM + len(BUILT_IN))
    groups: dict[str, GroupBody] = Field(default_factory=dict)
    custom: list[CustomGroup] = Field(default_factory=list, max_length=MAX_CUSTOM)
    model_config = ConfigDict(extra="forbid")

    @field_validator("order")
    @classmethod
    def _order_ids(cls, value: list[str]) -> list[str]:
        return [_group_id(v) for v in value]

    @field_validator("groups")
    @classmethod
    def _group_ids(cls, value: dict[str, GroupBody]) -> dict[str, GroupBody]:
        for key in value:
            _group_id(key)
        return value


async def _current(db) -> dict:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row and isinstance(row.data, dict):
        try:
            return NavBody.model_validate(row.data).model_dump()
        except PydanticValidationError:
            pass  # A record that no longer fits the shape reads as "nothing decided".
    return NavBody().model_dump()


async def excluded_for(db, menu: Optional[str]) -> list[str]:
    """The institutes a menu link leaves out. `menu` is "<category id>:<link key>"; anything unknown leaves out nothing."""
    if not menu or ":" not in menu:
        return []
    group, _, key = menu.partition(":")
    config = await _current(db)
    item = (config["groups"].get(group) or {}).get("items", {}).get(key) or {}
    return list(item.get("excluded") or [])


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

    ids = [c["id"] for c in value["custom"]]
    if len(set(ids)) != len(ids):
        raise ValidationError("custom: two categories share an id.")
    names = [c["label"].lower() for c in value["custom"]]
    if len(set(names)) != len(names):
        raise ValidationError("custom: two added categories have the same name.")

    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=KEY, data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
