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
import uuid
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
# The site has two header menus, each with its own saved choices: the colleges menu and the courses menu.
MENUS = {"colleges": KEY, "courses": "nav.coursesMenu"}
BUILT_IN = ("ranking", "course", "specialisation", "location", "type", "level", "mode", "exam", "collection", "category")
# The built-in categories' own names, as the site header shows them (kept in step with
# frontend/src/components/colleges-menu-data.ts). The admin can rename one in the config.
BUILT_IN_LABELS = {
    "ranking": "Top Ranked Colleges",
    "course": "Popular Courses",
    "specialisation": "Popular Specialisations",
    "location": "Colleges by Location",
    "type": "Colleges by Type",
    "level": "Colleges by Level",
    "mode": "Mode of Study",
    "exam": "Exams Accepted",
}
# "cat-<category>": the courses menu has one group for each category the catalogue holds.
GROUP_ID = re.compile(r"^(" + "|".join(BUILT_IN) + r"|custom-[a-z0-9]{4,16}|cat-[a-z0-9-]{1,60})$")
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
    # Priority of institutes within this link's list: slug -> 1, 2, 3... (1 first), each number once.
    priority: dict[str, int] = Field(default_factory=dict, max_length=1000)
    model_config = ConfigDict(extra="forbid")

    _trimmed = field_validator("label", "seoTitle", "seoDescription")(_trim)

    @field_validator("priority")
    @classmethod
    def _priority_numbers(cls, value: dict[str, int]) -> dict[str, int]:
        if any(n < 1 or n > 100000 for n in value.values()):
            raise ValueError("a priority is a whole number from 1 to 100000.")
        if len(set(value.values())) != len(value):
            raise ValueError("two institutes share a priority number.")
        return value


class GroupBody(BaseModel):
    # Empty: the group keeps its built-in name.
    label: str = Field(default="", max_length=60)
    hidden: bool = False
    # How many links the group shows. 0: the built-in limit.
    limit: int = Field(default=0, ge=0, le=100)
    # Links in the order they show; links not listed follow in the directory's order.
    order: list[str] = Field(default_factory=list, max_length=500)
    items: dict[str, ItemBody] = Field(default_factory=dict, max_length=500)
    # Slugs of collections added to this category, after the directory's own links.
    collections: list[str] = Field(default_factory=list, max_length=100)
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
    order: list[str] = Field(default_factory=list, max_length=200)
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


async def current_config(db) -> dict:
    return await _current(db)


async def _current(db, key: str = KEY) -> dict:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
    if row and isinstance(row.data, dict):
        try:
            return NavBody.model_validate(row.data).model_dump()
        except PydanticValidationError:
            pass  # A record that no longer fits the shape reads as "nothing decided".
    return NavBody().model_dump()


def group_labels(config: dict) -> list[dict]:
    """Every category a collection can be added to: the built-in ones, then the ones the admin made."""
    built_in = [{"id": gid, "label": (config["groups"].get(gid) or {}).get("label") or label} for gid, label in BUILT_IN_LABELS.items()]
    return built_in + [{"id": c["id"], "label": c["label"]} for c in config["custom"]]


def menu_group_of(config: dict, slug: str) -> Optional[str]:
    """The category a collection sits in, if any."""
    for c in config["custom"]:
        if slug in c["collections"]:
            return c["id"]
    for gid, g in config["groups"].items():
        if slug in g.get("collections", []):
            return gid
    return None


async def apply_menu(db, slug: str, menu: Optional[dict]) -> None:
    """Puts a collection in one menu category, or takes it out of the menu (`menu` None).

    `menu` is {"group": a category id, or "new", "name": the new category's name}. A collection sits
    in at most one category, so it is first taken out of wherever it was. The caller commits.
    """
    config = await _current(db)
    for c in config["custom"]:
        c["collections"] = [s for s in c["collections"] if s != slug]
    for g in config["groups"].values():
        g["collections"] = [s for s in g.get("collections", []) if s != slug]

    if menu:
        group = (menu.get("group") or "").strip()
        if not group:
            raise ValidationError("menu: choose a category for the header menu.")
        if group == "new":
            name = (menu.get("name") or "").strip()
            if not name:
                raise ValidationError("menu: name the new category.")
            if name.lower() in {g["label"].lower() for g in group_labels(config)}:
                raise ValidationError(f"menu: a category called '{name}' already exists. Choose it from the list.")
            if len(config["custom"]) >= MAX_CUSTOM:
                raise ValidationError("menu: the menu already has the most categories it can hold.")
            config["custom"].append({"id": f"custom-{uuid.uuid4().hex[:8]}", "label": name, "collections": [slug]})
        elif group.startswith("custom-"):
            target = next((c for c in config["custom"] if c["id"] == group), None)
            if target is None:
                raise ValidationError("menu: that category is no longer in the menu.")
            target["collections"].append(slug)
        elif group in BUILT_IN_LABELS:
            config["groups"].setdefault(group, GroupBody().model_dump())["collections"].append(slug)
        else:
            raise ValidationError("menu: not a menu category.")

    value = NavBody.model_validate(config).model_dump()
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=KEY, data=value))
    else:
        row.data = value


async def menu_settings(db, menu: Optional[str]) -> tuple[list[str], dict[str, int]]:
    """What the admin set on a menu link: the institutes it leaves out, and its priorities.

    `menu` is "<category id>:<link key>"; anything unknown sets nothing.
    """
    if not menu or ":" not in menu:
        return [], {}
    group, _, key = menu.partition(":")
    config = await _current(db)
    item = (config["groups"].get(group) or {}).get("items", {}).get(key) or {}
    return list(item.get("excluded") or []), dict(item.get("priority") or {})


async def set_item_priority(db, menu: str, priority: dict[str, int]) -> None:
    """Saves the priorities of one menu link, keeping everything else the admin set on it. The caller commits."""
    group, _, key = menu.partition(":")
    config = await _current(db)
    if group not in BUILT_IN_LABELS and not any(c["id"] == group for c in config["custom"]):
        raise ValidationError("menu: not a menu category.")
    if not key:
        raise ValidationError("menu: name the link.")
    entry = config["groups"].setdefault(group, GroupBody().model_dump())
    entry["items"].setdefault(key, ItemBody().model_dump())["priority"] = priority
    value = NavBody.model_validate(config).model_dump()
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=KEY, data=value))
    else:
        row.data = value


def _register(name: str, key: str) -> None:
    """The three routes of one menu: the public read, and the admin's read and write."""

    @public_router.get(f"/{name}-menu", response_model=SuccessResponse[dict], name=f"get_{name}_menu_config")
    async def get_config(db: DbSession):
        return SuccessResponse[dict](data=await _current(db, key))

    @router.get(f"/{name}-menu", response_model=SuccessResponse[dict], name=f"admin_get_{name}_menu_config")
    async def admin_get_config(_admin: AdminPayload, db: DbSession):
        return SuccessResponse[dict](data=await _current(db, key))

    @router.put(f"/{name}-menu", response_model=SuccessResponse[dict], name=f"admin_put_{name}_menu_config")
    async def admin_put_config(_admin: AdminPayload, db: DbSession, body: dict):
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

        row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
        if row is None:
            db.add(SiteContent(key=key, data=value))
        else:
            row.data = value
        await db.commit()
        return SuccessResponse[dict](data={"message": "Saved."})


for _name, _key in MENUS.items():
    _register(_name, _key)
