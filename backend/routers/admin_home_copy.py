"""Admin editors for the homepage's own copy: the hero (with its background
image), every section heading and the promo banner. ADMIN role required.

Each part is saved on its own, so editing one section never rewrites another.
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
from schemas.home import HomeCopySchema

router = APIRouter(prefix="/admin/home-copy", tags=["admin"])
KEY = "home.copy"


def _upload_path(value: str) -> str:
    """Empty, or a path to one of our own uploads. Never an external address."""
    value = value.strip()
    if value and not (value.startswith("/api/uploads/") and ".." not in value):
        raise ValueError("must be an image uploaded through the admin")
    return value


class HeroBody(BaseModel):
    headline: str = Field(min_length=5, max_length=150)
    subheadline: str = Field(min_length=5, max_length=300)
    searchPlaceholder: str = Field(min_length=1, max_length=100)
    searchButton: str = Field(min_length=1, max_length=30)
    image: str = Field(default="", max_length=200)
    imageAlt: str = Field(default="", max_length=150)
    model_config = ConfigDict(extra="forbid")

    _image = field_validator("image")(_upload_path)


class SectionBody(BaseModel):
    eyebrow: str = Field(default="", max_length=60)
    heading: str = Field(min_length=2, max_length=100)
    accent: str = Field(default="", max_length=60)
    subheading: str = Field(default="", max_length=300)
    model_config = ConfigDict(extra="forbid")


class StoryBody(BaseModel):
    heading: str = Field(min_length=2, max_length=60)
    accent: str = Field(default="", max_length=60)
    itemEyebrow: str = Field(default="", max_length=60)
    itemSubline: str = Field(default="", max_length=160)
    buttonLabel: str = Field(default="", max_length=30)
    model_config = ConfigDict(extra="forbid")


class PromoBannerBody(BaseModel):
    heading: str = Field(min_length=5, max_length=120)
    buttonLabel: str = Field(min_length=1, max_length=30)
    buttonHref: str = Field(min_length=1, max_length=200)
    image: str = Field(default="", max_length=200)
    imageAlt: str = Field(default="", max_length=150)
    model_config = ConfigDict(extra="forbid")

    _image = field_validator("image")(_upload_path)

    @field_validator("buttonHref")
    @classmethod
    def _internal_link(cls, value: str) -> str:
        value = value.strip()
        if not value.startswith("/") or value.startswith("//"):
            raise ValueError("must be a path on this site, starting with /")
        return value


PARTS = {
    "hero": HeroBody,
    "locations": SectionBody,
    "streams": SectionBody,
    "topExams": SectionBody,
    "programs": StoryBody,
    "careers": SectionBody,
    "promoBanner": PromoBannerBody,
    "universities": StoryBody,
    "data": SectionBody,
    "articles": SectionBody,
}
Part = Literal["hero", "locations", "streams", "topExams", "programs", "careers", "promoBanner", "universities", "data", "articles"]


async def _current(db) -> dict:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row and isinstance(row.data, dict):
        return HomeCopySchema.model_validate(row.data).model_dump()
    return HomeCopySchema().model_dump()


@router.get("", response_model=SuccessResponse[dict])
async def admin_get_home_copy(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.put("/{part}", response_model=SuccessResponse[dict])
async def admin_put_home_copy(part: Part, _admin: AdminPayload, db: DbSession, body: dict):
    try:
        value = PARTS[part].model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    merged = {**(await _current(db)), part: value}
    if row is None:
        db.add(SiteContent(key=KEY, data=merged))
    else:
        row.data = merged
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
