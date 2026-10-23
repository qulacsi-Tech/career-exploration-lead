"""The banners, filter strips and ads shown between the colleges on a listing page.

Each slot says what it is (a banner, a strip of one-tap filters, or an advertiser's picture), where
it goes (after how many colleges, and whether it repeats) and how it looks (a preset or custom
background). The admin edits the whole list at once; the public read is open.

Until an admin saves, the page gets the layout it always had (DEFAULT_SLOTS). Saving an empty list
is a choice: it removes everything.
"""

import re
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError, field_validator
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse

Page = Literal["colleges"]

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
    # Shown after this many colleges on the page, then again every `every` colleges (0: once).
    after: int = Field(default=3, ge=1, le=100)
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


def _key(page: str) -> str:
    return f"listing.slots.{page}"


async def _current(db, page: str) -> dict:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == _key(page)))).scalar_one_or_none()
    if row is not None and isinstance(row.data, dict):
        try:
            return SlotsBody.model_validate(row.data).model_dump()
        except PydanticValidationError:
            pass
    return {"slots": DEFAULT_SLOTS}


@public_router.get("/{page}", response_model=SuccessResponse[dict])
async def get_listing_slots(page: Page, db: DbSession):
    return SuccessResponse[dict](data=await _current(db, page))


@router.get("/{page}", response_model=SuccessResponse[dict])
async def admin_get_listing_slots(page: Page, _admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db, page))


@router.put("/{page}", response_model=SuccessResponse[dict])
async def admin_put_listing_slots(page: Page, _admin: AdminPayload, db: DbSession, body: dict):
    try:
        value = SlotsBody.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    if len({s["id"] for s in value["slots"]}) != len(value["slots"]):
        raise ValidationError("slots: every item needs its own id")

    row = (await db.execute(select(SiteContent).where(SiteContent.key == _key(page)))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=_key(page), data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
