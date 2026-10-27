"""Which category comes first in each homepage section that groups by category. ADMIN role required to write.

The homepage's Top Colleges, Top Exams and Explore Careers sections have a tab for each category, and
the Recommended colleges row can hold colleges of several. Without a priority their categories follow
the Fields list; with one, the categories named come first, in that order, and the rest follow. Each
section has its own list. The public read is open.
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

KEY = "home.categoryPriority"
Section = Literal["topColleges", "topExams", "careers", "universities"]
SECTIONS = ("topColleges", "topExams", "careers", "universities")

public_router = APIRouter(prefix="/home", tags=["home"])
router = APIRouter(prefix="/admin/home-category-priority", tags=["admin"])


class OrderBody(BaseModel):
    # Category names, first priority first. Empty: the Fields list's own order.
    order: list[str] = Field(default_factory=list, max_length=60)
    model_config = ConfigDict(extra="forbid")

    @field_validator("order")
    @classmethod
    def _clean(cls, value: list[str]) -> list[str]:
        names = [v.strip() for v in value if v.strip()]
        if any(len(n) > 100 for n in names):
            raise ValueError("a category name is at most 100 characters.")
        return list(dict.fromkeys(names))


async def _current(db) -> dict[str, list[str]]:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    data = row.data if row and isinstance(row.data, dict) else {}
    return {s: [str(n) for n in (data.get(s) or []) if isinstance(n, str)] for s in SECTIONS}


@public_router.get("/category-priority", response_model=SuccessResponse[dict])
async def get_category_priority(db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.get("", response_model=SuccessResponse[dict])
async def admin_get_category_priority(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.put("/{section}", response_model=SuccessResponse[dict])
async def admin_put_category_priority(section: Section, _admin: AdminPayload, db: DbSession, body: dict):
    """Replaces one section's priority list."""
    try:
        value = OrderBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        raise ValidationError(f"{'.'.join(str(p) for p in first['loc'])}: {first['msg']}") from exc

    data = {**(await _current(db)), section: value.order}
    row = (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=KEY, data=data))
    else:
        row.data = data
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
