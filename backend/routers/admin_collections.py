"""Admin collections: named groups of colleges that open the colleges listing. ADMIN role required on every route.

A collection is either automatic (every college matching its filters: category, course,
specialisation, city, type, level, study mode, exam, approval, ranking list) or hand-picked (only
the colleges chosen, in the chosen order). Either way it has its own header and SEO, opens
/colleges with its filters preset, and can be shown on the homepage, in the footer and in the header
menu. Every reference (ranking list, colleges) must exist when saved. A collection can be published
only when it has something to show, so a public page is never empty.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.validation import validate_body
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.collection import Collection
from models.college import College
from models.ranking import RankingList
from repositories.college import CollegeRepository
from routers.admin_college_record import pools as college_pools
from schemas.college import CollegeFilterParams
from schemas.common import SuccessResponse
from routers.nav_menu import apply_menu, current_config, group_labels, menu_group_of
from services.collections import normalise

router = APIRouter(prefix="/admin/collections", tags=["admin"])

SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"
OWNERSHIPS = ["Private", "Government", "Deemed"]
LEVELS = ["UG", "PG", "Doctorate"]
CREDENTIALS = ["Degree", "Diploma", "Doctorate"]


class FiltersBody(BaseModel):
    """The listing filters a collection presets. Blank means "any"."""

    stream: Optional[str] = Field(default=None, max_length=120)
    course: Optional[str] = Field(default=None, max_length=200)
    specialisation: Optional[str] = Field(default=None, max_length=200)
    city: Optional[str] = Field(default=None, max_length=120)
    ownership: Optional[Literal["Private", "Government", "Deemed"]] = None
    level: Optional[Literal["UG", "PG", "Doctorate"]] = None
    credential: Optional[Literal["Degree", "Diploma", "Doctorate"]] = None
    mode: Optional[str] = Field(default=None, max_length=60)
    exam: Optional[str] = Field(default=None, max_length=120)
    approval: Optional[str] = Field(default=None, max_length=120)
    model_config = ConfigDict(extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
        return None if value == "" else value


class HomepageBody(BaseModel):
    order: int = Field(ge=0, le=1000)
    limit: int = Field(ge=1, le=24)
    isVisible: bool
    model_config = ConfigDict(extra="forbid")


class FooterBody(BaseModel):
    column: str = Field(min_length=1, max_length=60)
    order: int = Field(ge=0, le=1000)
    model_config = ConfigDict(extra="forbid")


class MenuBody(BaseModel):
    """Which header-menu category the collection sits in: an existing category's id, or "new" with a name."""

    group: str = Field(default="", max_length=40)
    name: str = Field(default="", max_length=60)
    model_config = ConfigDict(extra="forbid")


class FaqBody(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    answer: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")


class SeoBody(BaseModel):
    # Empty: the listing writes them from the heading.
    metaTitle: str = Field(default="", max_length=120)
    metaDescription: str = Field(default="", max_length=320)
    canonical: Optional[str] = Field(default=None, max_length=300, pattern=r"^/[^\s]*$")
    intro: str = Field(default="", max_length=5000)
    faqs: list[FaqBody] = Field(default_factory=list, max_length=20)
    model_config = ConfigDict(extra="forbid")


class AuthorBody(BaseModel):
    """Who the page says wrote it. An empty name hides the author, and the listing's own author shows instead."""

    name: str = Field(default="", max_length=80)
    role: str = Field(default="", max_length=80)
    photo: str = Field(default="", max_length=200)
    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "role")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()

    @field_validator("photo")
    @classmethod
    def _upload_path(cls, value: str) -> str:
        """Empty, or a path to one of our own uploads. Never an external address."""
        value = value.strip()
        if value and not (value.startswith("/api/uploads/") and ".." not in value):
            raise ValueError("must be an image uploaded through the admin")
        return value


class CollectionBody(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    heading: str = Field(default="", max_length=200)
    subheading: str = Field(default="", max_length=300)
    membership: Literal["filters", "picked"] = "filters"
    filters: FiltersBody = Field(default_factory=FiltersBody)
    rankingListSlug: Optional[str] = Field(default=None, max_length=200)
    collegeSlugs: list[str] = Field(default_factory=list, max_length=500)
    homepage: Optional[HomepageBody] = None
    footer: Optional[FooterBody] = None
    menu: Optional[MenuBody] = None
    author: AuthorBody = Field(default_factory=AuthorBody)
    seo: SeoBody = Field(default_factory=SeoBody)
    isPublished: bool = False
    model_config = ConfigDict(extra="forbid")

    @field_validator("rankingListSlug", mode="before")
    @classmethod
    def _blank_ranking(cls, value: Any) -> Any:
        return None if isinstance(value, str) and value.strip() == "" else value


class CollectionCreateBody(CollectionBody):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)


class PreviewBody(BaseModel):
    membership: Literal["filters", "picked"] = "filters"
    filters: FiltersBody = Field(default_factory=FiltersBody)
    rankingListSlug: Optional[str] = Field(default=None, max_length=200)
    collegeSlugs: list[str] = Field(default_factory=list, max_length=500)
    model_config = ConfigDict(extra="forbid")


def _validate(model: type[BaseModel], raw: dict) -> BaseModel:
    return validate_body(model, raw)


def _intro_doc(text: str) -> dict:
    """Plain text becomes paragraphs, split on blank lines. Empty text is an empty doc."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": p}]} for p in paragraphs
        ],
    }


def _filter_values(body: CollectionBody | PreviewBody) -> dict[str, str]:
    return {k: v for k, v in body.filters.model_dump().items() if v}


async def _matches(db, body: CollectionBody | PreviewBody, limit: int = 8) -> tuple[int, list[College]]:
    """How many published colleges the collection resolves to, and the first few."""
    if body.membership == "picked":
        slugs = body.collegeSlugs
        if not slugs:
            return 0, []
        params = CollegeFilterParams(page=1, limit=limit, slugs=slugs, order_list=body.rankingListSlug or None)
    else:
        filters = _filter_values(body)
        if not filters and not body.rankingListSlug:
            return 0, []  # no filter would mean every college
        params = CollegeFilterParams(page=1, limit=limit, ranking_list=body.rankingListSlug or None, **filters)
    rows, total = await CollegeRepository(db).list(params)
    return total, rows


async def _check_references(db, body: CollectionBody) -> None:
    if body.rankingListSlug and not (await db.execute(
        select(RankingList.id).where(RankingList.slug == body.rankingListSlug))).scalar_one_or_none():
        raise ValidationError(f"rankingListSlug: no ranking list '{body.rankingListSlug}'.")

    if len(set(body.collegeSlugs)) != len(body.collegeSlugs):
        raise ValidationError("collegeSlugs: a college is listed more than once.")
    if body.collegeSlugs:
        known = set((await db.execute(
            select(College.slug).where(College.slug.in_(body.collegeSlugs)))).scalars().all())
        missing = [s for s in body.collegeSlugs if s not in known]
        if missing:
            raise ValidationError(f"collegeSlugs: unknown college '{missing[0]}'.")

    if body.isPublished:
        if body.membership == "picked" and not body.collegeSlugs:
            raise ValidationError("collegeSlugs: pick at least one college before publishing.")
        if body.membership == "filters" and not _filter_values(body) and not body.rankingListSlug:
            raise ValidationError("filters: choose at least one filter before publishing, or the collection would hold every college.")
        total, _ = await _matches(db, body, limit=1)
        if total == 0:
            raise ValidationError("isPublished: no published college matches this collection yet, so it cannot go live.")


def _stored(collection_id: str, slug: str, body: CollectionBody) -> dict:
    seo: dict[str, Any] = {
        "metaTitle": body.seo.metaTitle.strip(),
        "metaDescription": body.seo.metaDescription.strip(),
        "intro": _intro_doc(body.seo.intro),
        "faqs": [f.model_dump() for f in body.seo.faqs],
    }
    if body.seo.canonical:
        seo["canonical"] = body.seo.canonical

    placements: dict[str, Any] = {}
    if body.homepage is not None:
        placements["homepage"] = body.homepage.model_dump()
    if body.footer is not None:
        placements["footer"] = body.footer.model_dump()

    return {
        "id": collection_id,
        "slug": slug,
        "title": body.title.strip(),
        "heading": body.heading.strip(),
        "subheading": body.subheading.strip(),
        "author": body.author.model_dump(),
        "membership": body.membership,
        "filters": _filter_values(body),
        "rankingListSlug": body.rankingListSlug or "",
        "collegeSlugs": body.collegeSlugs,
        "seo": seo,
        "placements": placements,
        "isPublished": body.isPublished,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/options", response_model=SuccessResponse[dict])
async def admin_collection_options(admin: AdminPayload, db: DbSession):
    """Everything the editor can choose from, in one response."""
    pools = (await college_pools(admin, db)).data
    facets = await CollegeRepository(db).facets()
    rankings = (await db.execute(select(RankingList.slug, RankingList.name).order_by(RankingList.name))).all()
    colleges = (await db.execute(
        select(College.slug, College.name, College.city, College.stream).where(College.status == "published").order_by(College.name)
    )).all()
    return SuccessResponse[dict](data={
        "streams": pools["streams"],
        "courses": pools["courses"],
        "specialisations": pools["specialisations"],
        "courseStreams": pools["courseStreams"],
        "specialisationCourses": pools["specialisationCourses"],
        "cities": facets["cities"],
        "exams": facets["exams"],
        "approvals": facets["approvals"],
        "modes": facets["modes"],
        "ownerships": OWNERSHIPS,
        "levels": LEVELS,
        "credentials": CREDENTIALS,
        "rankings": [{"slug": s, "name": n} for s, n in rankings],
        "colleges": [{"slug": s, "name": n, "city": c or "", "stream": st or ""} for s, n, c, st in colleges],
        "menuGroups": group_labels(await current_config(db)),
    })


@router.post("/preview", response_model=SuccessResponse[dict])
async def admin_preview_collection(_admin: AdminPayload, db: DbSession, body: dict):
    """How many published colleges a membership would hold right now, and the first few. Saves nothing."""
    data = _validate(PreviewBody, body)
    total, rows = await _matches(db, data)
    return SuccessResponse[dict](data={"count": total, "sample": [{"slug": c.slug, "name": c.name, "city": c.city} for c in rows]})


@router.get("", response_model=SuccessResponse[list])
async def admin_list_collections(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(select(Collection).order_by(Collection.slug))).scalars().all()
    menu = await current_config(db)
    return SuccessResponse[list](data=[{**normalise(r.data), "menuGroup": menu_group_of(menu, r.slug)} for r in rows])


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_collection(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(CollectionCreateBody, body)
    taken = (await db.execute(select(Collection.id).where(Collection.slug == data.slug))).scalar_one_or_none()
    if taken is not None:
        raise ConflictError("COLLECTION_SLUG_TAKEN", f"A collection with slug '{data.slug}' already exists.")
    await _check_references(db, data)

    collection_id = str(uuid.uuid4())
    db.add(Collection(id=uuid.UUID(collection_id), slug=data.slug,
                      data=_stored(collection_id, data.slug, data)))
    await apply_menu(db, data.slug, data.menu.model_dump() if data.menu else None)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Collection '{data.slug}' created."})


@router.put("/{slug}", response_model=SuccessResponse[dict])
async def admin_update_collection(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Replaces the collection. The slug is its address, so it cannot change here."""
    data = _validate(CollectionBody, body)
    row = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Collection")
    await _check_references(db, data)

    row.data = _stored(row.data["id"], slug, data)
    await apply_menu(db, slug, data.menu.model_dump() if data.menu else None)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Collection '{slug}' saved."})


@router.delete("/{slug}", response_model=SuccessResponse[dict])
async def admin_delete_collection(slug: str, _admin: AdminPayload, db: DbSession, confirm: Optional[str] = None):
    """Deletes a collection. A collection on the homepage cannot be deleted. A live
    (published) collection needs `confirm` set to its slug, so a live page is never
    removed by a single click."""
    row = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Collection")
    if row.data.get("isPublished") and confirm != slug:
        raise ConflictError(
            "COLLECTION_PUBLISHED",
            f"This collection is live. Type its slug ({slug}) to confirm deleting it.",
        )
    if (row.data.get("placements") or {}).get("homepage"):
        raise ConflictError("COLLECTION_ON_HOMEPAGE", "Remove this collection from the homepage before deleting it.")
    await apply_menu(db, slug, None)
    await db.delete(row)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Collection '{slug}' deleted."})
