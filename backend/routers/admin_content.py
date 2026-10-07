"""Admin editors for stored homepage content: the careers panels and the data tiles.

Each block is replaced as a whole on save. Links must be site paths (starting
with /), so the editor cannot send a visitor off to an arbitrary address.
"""

from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/content", tags=["admin"])

SITE_PATH = r"^/[^\s]*$"
SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"


class LinkBody(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    href: str = Field(min_length=1, max_length=300, pattern=SITE_PATH)
    model_config = ConfigDict(extra="forbid")


class CareerPanelBody(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    # The category tab the panel shows under, a name from the Fields list. Empty: under every tab.
    category: str = Field(default="", max_length=100)
    viewAllHref: str = Field(min_length=1, max_length=300, pattern=SITE_PATH)
    links: list[LinkBody] = Field(min_length=1, max_length=12)
    model_config = ConfigDict(extra="forbid")


class DataTileBody(BaseModel):
    slug: str = Field(min_length=2, max_length=80, pattern=SLUG)
    title: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=1, max_length=300)
    links: list[LinkBody] = Field(min_length=1, max_length=8)
    model_config = ConfigDict(extra="forbid")


class ItemsBody(BaseModel):
    items: list[Any] = Field(default_factory=list)
    model_config = ConfigDict(extra="forbid")


# The URL name, the stored key, the item model, and the most items allowed.
BLOCKS: dict[str, tuple[str, type[BaseModel], int]] = {
    "careers": ("home.careerPanels", CareerPanelBody, 6),
    "highlights": ("home.dataHighlights", DataTileBody, 8),
}


# Pages that exist whatever the data is.
STATIC_PAGES = [
    ("All colleges", "/colleges"),
    ("All exams", "/exams"),
    ("All courses", "/courses"),
    ("Compare colleges", "/compare"),
    ("Study abroad", "/study-abroad"),
    ("Get counselling", "/enquiry"),
]


@router.get("/link-pool", response_model=SuccessResponse[dict])
async def admin_link_pool(_admin: AdminPayload, db: DbSession):
    """Every page a homepage link can point to, grouped, so the editors offer a list instead
    of a path to type. Built from the categories, colleges, exams, courses, programmes,
    cities and collections already in the directory."""
    from models.collection import Collection
    from models.college import College
    from models.course_catalogue import CourseCatalogue
    from models.exam import Exam
    from models.home_field import HomeField
    from models.location import Location
    from models.program import Program

    def group(label: str, rows, path) -> dict:
        return {"label": label, "items": [{"label": name, "path": path(slug)} for slug, name in rows]}

    fields = (await db.execute(select(HomeField.slug, HomeField.name).order_by(HomeField.name))).all()
    exams = (await db.execute(select(Exam.slug, Exam.name).order_by(Exam.name))).all()
    courses = (await db.execute(select(CourseCatalogue.slug, CourseCatalogue.name).where(CourseCatalogue.is_published.is_(True)).order_by(CourseCatalogue.name))).all()
    programs = (await db.execute(select(Program.slug, Program.name).where(Program.is_active.is_(True)).order_by(Program.name))).all()
    colleges = (await db.execute(select(College.slug, College.name).order_by(College.name))).all()
    cities = (await db.execute(select(Location.slug, Location.name).order_by(Location.name))).all()
    collections = [(c.slug, c.data.get("title", c.slug)) for c in (await db.execute(select(Collection))).scalars().all() if c.data.get("isPublished")]

    groups = [
        {"label": "Pages", "items": [{"label": name, "path": path} for name, path in STATIC_PAGES]},
        group("Categories (colleges of a field)", fields, lambda s: f"/{s}/colleges"),
        group("Exams", exams, lambda s: f"/exams/{s}"),
        group("Courses", courses, lambda s: f"/courses/{s}"),
        group("Programmes", programs, lambda s: f"/courses/{s}"),
        group("Cities", cities, lambda s: f"/location/{s}"),
        group("College lists", sorted(collections, key=lambda c: c[1]), lambda s: f"/colleges/{s}"),
        group("Colleges", colleges, lambda s: f"/college/{s}"),
    ]
    return SuccessResponse[dict](data={"groups": [g for g in groups if g["items"]]})


@router.get("/{name}", response_model=SuccessResponse[dict])
async def admin_get_content(name: Literal["careers", "highlights"], _admin: AdminPayload, db: DbSession):
    key = BLOCKS[name][0]
    row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
    return SuccessResponse[dict](data={"items": row.data if row else []})


@router.put("/{name}", response_model=SuccessResponse[dict])
async def admin_put_content(name: Literal["careers", "highlights"], _admin: AdminPayload, db: DbSession, body: dict):
    key, model, limit = BLOCKS[name]
    try:
        envelope = ItemsBody.model_validate(body)
    except PydanticValidationError as exc:
        raise ValidationError(str(exc.errors()[0]["msg"])) from exc
    if len(envelope.items) > limit:
        raise ValidationError(f"items: at most {limit} allowed.")

    validated = []
    for index, item in enumerate(envelope.items):
        try:
            validated.append(model.model_validate(item).model_dump())
        except PydanticValidationError as exc:
            first = exc.errors()[0]
            field = ".".join(str(p) for p in first["loc"])
            raise ValidationError(f"items[{index}].{field}: {first['msg']}") from exc

    slugs = [i["slug"] for i in validated if "slug" in i]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("items: two tiles share a slug.")

    row = (await db.execute(select(SiteContent).where(SiteContent.key == key))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=key, data=validated))
    else:
        row.data = validated
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})
