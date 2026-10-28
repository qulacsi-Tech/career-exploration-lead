"""The banners, filter strips and ads shown between the colleges on a listing page, and the banners and ads on the articles pages.

Each slot says what it is (a banner, a strip of one-tap filters, or an advertiser's picture), where
it goes (after how many colleges, and whether it repeats) and how it looks (a preset or custom
background). The admin edits the whole list at once; the public read is open.

Until an admin saves, the page gets the layout it always had (DEFAULT_SLOTS). Saving an empty list
is a choice: it removes everything.

Like the listing's header, a set can belong to one selection of the header menu (a course, a city, a
ranking list...), named by a scope such as "course=MBA". A visitor who opened that selection gets the set
written for it; a selection without one gets the page's set.
"""

import re
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError, field_validator
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from routers.listing_header import _scope
from schemas.common import SuccessResponse

# "articles" is the news listing, "article" one story. Both take banners and ads only (a filter strip
# is a college-filter idea), and neither has a menu selection to scope to.
Page = Literal["colleges", "articles", "article"]

public_router = APIRouter(prefix="/listing-slots", tags=["listings"])
router = APIRouter(prefix="/admin/listing-slots", tags=["admin"])

MAX_SLOTS = 40
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

Preset = Literal["brand", "amber", "emerald", "ocean", "plum", "night", "cream"]
Group = Literal[
    "location", "ranking", "course", "specialisation", "credential", "level", "mode", "fees", "ownership", "exam", "approval"
]


class Slot(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    type: Literal["banner", "filter", "ad"]
    enabled: bool = True
    # Where it goes: between the items of the list (colleges, stories, or the sections of a story), or in
    # the right-hand column.
    # inline: between the listed items. top / bottom: above or below the whole list. left: the left column
    # (the news list only, under its filters). sidebar: the right-hand column.
    placement: Literal["inline", "top", "bottom", "left", "sidebar"] = "inline"
    # Story page only: the stories (by slug) the item shows on. Empty: every story.
    articles: list[str] = Field(default_factory=list, max_length=100)
    # Inline: shown after this many items, then again every `every` (0: once). Sidebar: after this many of
    # the column's own blocks (0 is the top of the column) and never repeated.
    after: int = Field(default=3, ge=0, le=100)
    every: int = Field(default=0, ge=0, le=100)

    # Look (banner and filter strip)
    bgMode: Literal["preset", "gradient", "solid", "image"] = "preset"
    bgPreset: Preset = "brand"
    bgFrom: str = ""
    bgTo: str = ""
    bgImage: str = Field(default="", max_length=200)
    tone: Literal["light", "dark"] = "light"  # "light": white text, for a dark background

    # Banner
    title: str = Field(default="", max_length=140)
    text: str = Field(default="", max_length=300)
    buttonLabel: str = Field(default="", max_length=40)
    buttonHref: str = Field(default="", max_length=300)
    icon: Literal["compare", "handshake", "target", "sparkles", "graduation", "none"] = "sparkles"
    sponsored: bool = False

    # Ad
    image: str = Field(default="", max_length=200)
    href: str = Field(default="", max_length=300)
    alt: str = Field(default="", max_length=140)

    # Filter strip
    group: Group = "location"
    hint: str = Field(default="", max_length=140)
    limit: int = Field(default=8, ge=1, le=20)

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "text", "buttonLabel", "alt", "hint", "id")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()

    @field_validator("bgFrom", "bgTo")
    @classmethod
    def _colour(cls, value: str) -> str:
        value = value.strip()
        if value and not _HEX.match(value):
            raise ValueError("must be a colour like #b1243e")
        return value

    @field_validator("bgImage", "image")
    @classmethod
    def _upload_path(cls, value: str) -> str:
        """Empty, or a path to one of our own uploads. Never an external address."""
        value = value.strip()
        if value and not (value.startswith("/api/uploads/") and ".." not in value):
            raise ValueError("must be an image uploaded through the admin")
        return value

    @field_validator("buttonHref", "href")
    @classmethod
    def _link(cls, value: str) -> str:
        """Empty, a path on this site, or an https address."""
        value = value.strip()
        if value and not ((value.startswith("/") and not value.startswith("//")) or value.startswith("https://")):
            raise ValueError("must start with / or https://")
        return value


class SlotsBody(BaseModel):
    slots: list[Slot] = Field(max_length=MAX_SLOTS)
    model_config = ConfigDict(extra="forbid")


def _banner(id_, after, title, text, label, href, preset, icon):
    return Slot(
        id=id_, type="banner", after=after, title=title, text=text, buttonLabel=label,
        buttonHref=href, bgPreset=preset, icon=icon, sponsored=True,
    ).model_dump()


def _strip(id_, after, group, title, hint, limit):
    return Slot(id=id_, type="filter", after=after, group=group, title=title, hint=hint, limit=limit).model_dump()


# The layout the page had before it was editable.
DEFAULT_SLOTS = [
    _banner("compare", 2, "Can't pick between two? Put them head to head.",
            "Fees, placements and rankings, side by side. No spreadsheet required.", "Compare colleges!", "/compare", "brand", "compare"),
    _strip("by-location", 5, "location", "Filter by location", "Pick a city and we will do the rest.", 10),
    _banner("counselling", 8, "Lost in the list? Totally normal.",
            "A real counsellor matches colleges to your score and budget. Free, friendly and no spam.", "Talk to a counsellor", "/enquiry", "amber", "handshake"),
    _strip("by-ownership", 11, "ownership", "Filter by ownership", "Private, government or deemed?", 4),
    _banner("exams", 14, "Got an exam coming up? Know what to aim for.",
            "See which colleges accept your exam and the cut-offs they ask for.", "Browse exams", "/exams", "emerald", "target"),
    _strip("by-fees", 17, "fees", "Filter by fees", "Know your budget? Start here.", 4),
]


def _key(page: str, scope: str = "") -> str:
    return f"listing.slots.{page}:{scope}" if scope else f"listing.slots.{page}"


async def _row(db, key: str):
    return (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()


def _body(row):
    if row is not None and isinstance(row.data, dict):
        try:
            return SlotsBody.model_validate(row.data).model_dump()
        except PydanticValidationError:
            return None
    return None


async def _current(db, page: str, scope: str = "") -> dict:
    """The set for `scope` when it has its own (`custom` true), else the page's. Never fails."""
    if scope:
        own = _body(await _row(db, _key(page, scope)))
        if own is not None:
            return {**own, "custom": True}
    page_set = _body(await _row(db, _key(page)))
    if page_set is not None:
        return {**page_set, "custom": not scope}
    return {"slots": DEFAULT_SLOTS if page == "colleges" else [], "custom": False}


def _page_scope(page: str, scope: str) -> str:
    """Only the colleges page has selections of the header menu to scope to."""
    return _scope(scope) if page == "colleges" else ""


@public_router.get("/{page}", response_model=SuccessResponse[dict])
async def get_listing_slots(page: Page, db: DbSession, scope: str = Query(default="", max_length=80)):
    return SuccessResponse[dict](data=await _current(db, page, _page_scope(page, scope)))


@router.get("/{page}/scopes", response_model=SuccessResponse[list[str]])
async def admin_listing_slot_scopes(page: Page, _admin: AdminPayload, db: DbSession):
    """The selections that have a set of their own."""
    prefix = _key(page) + ":"
    rows = (await db.execute(select(SiteContent.key).where(SiteContent.key.startswith(prefix, autoescape=True)))).scalars().all()
    return SuccessResponse[list[str]](data=sorted(k[len(prefix):] for k in rows))


@router.get("/{page}", response_model=SuccessResponse[dict])
async def admin_get_listing_slots(page: Page, _admin: AdminPayload, db: DbSession, scope: str = Query(default="", max_length=80)):
    return SuccessResponse[dict](data=await _current(db, page, _page_scope(page, scope)))


@router.put("/{page}", response_model=SuccessResponse[dict])
async def admin_put_listing_slots(page: Page, _admin: AdminPayload, db: DbSession, body: dict, scope: str = Query(default="", max_length=80)):
    scope = _page_scope(page, scope)
    try:
        value = SlotsBody.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    if len({s["id"] for s in value["slots"]}) != len(value["slots"]):
        raise ValidationError("slots: every item needs its own id")
    if page != "article" and any(s["articles"] for s in value["slots"]):
        raise ValidationError("slots: choosing stories is only for the story page")
    if page != "colleges" and any(s["type"] == "filter" for s in value["slots"]):
        raise ValidationError("slots: a filter strip is only for the colleges page")
    allowed = {"colleges": {"inline"}, "articles": {"inline", "top", "bottom", "left", "sidebar"}, "article": {"top", "bottom", "sidebar"}}[page]
    if any(s["placement"] not in allowed for s in value["slots"]):
        raise ValidationError("slots: that position is not available on this page")
    if any(s["placement"] == "inline" and s["after"] < 1 for s in value["slots"]):
        raise ValidationError("slots: an item between the listed ones is shown after at least 1")

    key = _key(page, scope)
    row = await _row(db, key)
    if row is None:
        db.add(SiteContent(key=key, data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})


@router.delete("/{page}", response_model=SuccessResponse[dict])
async def admin_reset_listing_slots(page: Page, _admin: AdminPayload, db: DbSession, scope: str = Query(max_length=80)):
    """Drop a selection's own set, so it shows the page's again."""
    scope = _scope(scope)
    if not scope:
        raise ValidationError("scope: choose a selection to reset")
    row = await _row(db, _key(page, scope))
    if row is not None:
        await db.delete(row)
        await db.commit()
    return SuccessResponse[dict](data={"message": "Reset."})
