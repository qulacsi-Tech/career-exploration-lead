"""Admin editors for the homepage's own copy: the hero, the locations heading and
the streams heading. ADMIN role required.

Each part is saved on its own, so editing one section never rewrites another.
""" 

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse
from schemas.home import HomeCopySchema

router = APIRouter(prefix="/admin/home-copy", tags=["admin"])
KEY = "home.copy"


class HeroBody(BaseModel):
    headline: str = Field(min_length=5, max_length=150)
    subheadline: str = Field(min_length=5, max_length=300)
    searchPlaceholder: str = Field(min_length=1, max_length=100)
    searchButton: str = Field(min_length=1, max_length=30)
    model_config = ConfigDict(extra="forbid")


class SectionBody(BaseModel):
    eyebrow: str = Field(default="", max_length=60)
    heading: str = Field(min_length=2, max_length=100)
    accent: str = Field(default="", max_length=60)
    subheading: str = Field(default="", max_length=300)
    model_config = ConfigDict(extra="forbid")


PARTS = {"hero": HeroBody, "locations": SectionBody, "streams": SectionBody}


async def _current(db) -> dict:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row and isinstance(row.data, dict):
        return HomeCopySchema.model_validate(row.data).model_dump()
    return HomeCopySchema().model_dump()


@router.get("", response_model=SuccessResponse[dict])
async def admin_get_home_copy(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.put("/{part}", response_model=SuccessResponse[dict])
async def admin_put_home_copy(part: Literal["hero", "locations", "streams"], _admin: AdminPayload, db: DbSession, body: dict):
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
