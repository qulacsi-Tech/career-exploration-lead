"""The site's header and footer, as the admin arranges them: the logo, the order and wording of the header's
menu links, and the order of the footer's columns and of the links in each. The public read is open; the
write needs ADMIN.

What the header and footer contain still comes from where it always did (the fixed header links, the
collections placed in footer columns, the exams, the company pages). This only says in what order to show
them, what to call the header links, and which logo to use. Anything not mentioned keeps its place after
the ones that are, so a collection added later still appears.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError, field_validator
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse

public_router = APIRouter(prefix="/site-chrome", tags=["site"])
router = APIRouter(prefix="/admin/site-chrome", tags=["admin"])

KEY = "site.chrome"

HeaderId = Literal["courses", "colleges", "compare", "news"]
HEADER_DEFAULTS: list[dict] = [
    {"id": "courses", "label": "Courses", "hidden": False},
    {"id": "colleges", "label": "Top Ranked Colleges", "hidden": False},
    {"id": "compare", "label": "Compare", "hidden": False},
    {"id": "news", "label": "News", "hidden": False},
]


class HeaderItem(BaseModel):
    id: HeaderId
    label: str = Field(default="", max_length=40)
    hidden: bool = False
    model_config = ConfigDict(extra="forbid")

    @field_validator("label")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()


class LogoConfig(BaseModel):
    """One logo spot (the header's or the footer's). Nothing set: the built-in logo. A picture, some text,
    or both (the text beside the picture)."""

    image: str = Field(default="", max_length=200)
    text: str = Field(default="", max_length=40)
    alt: str = Field(default="", max_length=140)
    model_config = ConfigDict(extra="forbid")

    @field_validator("text", "alt")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()

    @field_validator("image")
    @classmethod
    def _upload_path(cls, value: str) -> str:
        """Empty, or a path to one of our own uploads. Never an external address."""
        value = value.strip()
        if value and not (value.startswith("/api/uploads/") and ".." not in value):
            raise ValueError("must be an image uploaded through the admin")
        return value


class ChromeBody(BaseModel):
    # The header and the footer can have different logos (the footer is dark).
    headerLogo: LogoConfig = Field(default_factory=LogoConfig)
    footerLogo: LogoConfig = Field(default_factory=LogoConfig)
    headerItems: list[HeaderItem] = Field(default_factory=list, max_length=8)
    # Footer columns by title, and the links of each column by address, in the order to show them.
    footerColumnOrder: list[str] = Field(default_factory=list, max_length=40)
    footerLinkOrder: dict[str, list[str]] = Field(default_factory=dict, max_length=40)
    model_config = ConfigDict(extra="forbid")

    @field_validator("footerColumnOrder")
    @classmethod
    def _titles(cls, value: list[str]) -> list[str]:
        if any(len(v) > 80 for v in value):
            raise ValueError("a column title is at most 80 characters")
        return value

    @field_validator("footerLinkOrder")
    @classmethod
    def _hrefs(cls, value: dict[str, list[str]]) -> dict[str, list[str]]:
        for title, hrefs in value.items():
            if len(title) > 80 or len(hrefs) > 100 or any(len(h) > 300 for h in hrefs):
                raise ValueError("too long")
        return value


def _complete(data: dict) -> dict:
    """The saved arrangement with every header link present once, in saved order, then the rest."""
    seen: set[str] = set()
    items: list[dict] = []
    for raw in data.get("headerItems") or []:
        hid = raw.get("id")
        default = next((d for d in HEADER_DEFAULTS if d["id"] == hid), None)
        if default is None or hid in seen:
            continue
        seen.add(hid)
        items.append({"id": hid, "label": (raw.get("label") or "").strip() or default["label"], "hidden": bool(raw.get("hidden"))})
    items += [dict(d) for d in HEADER_DEFAULTS if d["id"] not in seen]
    return {
        "headerLogo": {**LogoConfig().model_dump(), **(data.get("headerLogo") or {})},
        "footerLogo": {**LogoConfig().model_dump(), **(data.get("footerLogo") or {})},
        "headerItems": items,
        "footerColumnOrder": list(data.get("footerColumnOrder") or []),
        "footerLinkOrder": dict(data.get("footerLinkOrder") or {}),
    }


async def _row(db):
    return (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()


async def _current(db) -> dict:
    row = await _row(db)
    if row is not None and isinstance(row.data, dict):
        data = dict(row.data)
        # An arrangement saved when there was one logo for both spots.
        if "logo" in data:
            one = {"image": data.pop("logo") or "", "alt": data.pop("logoAlt", "") or ""}
            data.setdefault("headerLogo", one)
            data.setdefault("footerLogo", one)
        try:
            return _complete(ChromeBody.model_validate(data).model_dump())
        except PydanticValidationError:
            pass
    return _complete({})


@public_router.get("", response_model=SuccessResponse[dict])
async def get_site_chrome(db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.get("", response_model=SuccessResponse[dict])
async def admin_get_site_chrome(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.put("", response_model=SuccessResponse[dict])
async def admin_put_site_chrome(_admin: AdminPayload, db: DbSession, body: dict):
    try:
        value = ChromeBody.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    ids = [i["id"] for i in value["headerItems"]]
    if len(set(ids)) != len(ids):
        raise ValidationError("headerItems: a link appears more than once")

    row = await _row(db)
    if row is None:
        db.add(SiteContent(key=KEY, data=value))
    else:
        row.data = value
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
