"""Admin collections: curated groups of colleges. ADMIN role required on every route.

A collection stores which colleges it holds and in what editor order. A bound
ranking list, when there is one, sets the displayed order instead. Every
reference (scope, colleges, ranking list) must exist when saved. A collection
can be published only with at least one college and a meta title and
description, so a public page is never empty or untitled.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.collection import Collection
from models.college import College
from models.course_catalogue import CourseCatalogue
from models.exam import Exam
from models.location import Location
from models.ranking import RankingList
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/collections", tags=["admin"])

SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"


class ScopeBody(BaseModel):
    programSlug: Optional[str] = Field(default=None, max_length=100)
    locationSlug: Optional[str] = Field(default=None, max_length=100)
    examSlug: Optional[str] = Field(default=None, max_length=100)
    courseSlug: Optional[str] = Field(default=None, max_length=100)
    model_config = ConfigDict(extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, value: Any) -> Any:
        return None if isinstance(value, str) and value.strip() == "" else value


class HomepageBody(BaseModel):
    order: int = Field(ge=0, le=1000)
    limit: int = Field(ge=1, le=24)
    isVisible: bool
    model_config = ConfigDict(extra="forbid")


class FooterBody(BaseModel):
    column: str = Field(min_length=1, max_length=60)
    order: int = Field(ge=0, le=1000)
    model_config = ConfigDict(extra="forbid")


class FaqBody(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    answer: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")


class SeoBody(BaseModel):
    metaTitle: str = Field(default="", max_length=70)
    metaDescription: str = Field(default="", max_length=170)
    canonical: Optional[str] = Field(default=None, max_length=300, pattern=r"^/[^\s]*$")
    intro: str = Field(default="", max_length=5000)
    faqs: list[FaqBody] = Field(default_factory=list, max_length=20)
    model_config = ConfigDict(extra="forbid")


class CollectionBody(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    heading: str = Field(default="", max_length=200)
    subheading: str = Field(default="", max_length=300)
    scope: ScopeBody = Field(default_factory=ScopeBody)
    rankingListSlug: Optional[str] = Field(default=None, max_length=200)
    collegeSlugs: list[str] = Field(default_factory=list, max_length=500)
    homepage: Optional[HomepageBody] = None
    footer: Optional[FooterBody] = None
    seo: SeoBody = Field(default_factory=SeoBody)
    isPublished: bool = False
    model_config = ConfigDict(extra="forbid")

    @field_validator("rankingListSlug", mode="before")
    @classmethod
    def _blank_ranking(cls, value: Any) -> Any:
        return None if isinstance(value, str) and value.strip() == "" else value


class CollectionCreateBody(CollectionBody):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)


def _validate(model: type[BaseModel], raw: dict) -> BaseModel:
    try:
        return model.model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


def _intro_doc(text: str) -> dict:
    """Plain text becomes paragraphs, split on blank lines. Empty text is an empty doc."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": p}]} for p in paragraphs
        ],
    }


async def _program_slugs(db) -> set[str]:
    """Programme scopes are the streams colleges are filed under, in slug form."""
    names = (await db.execute(select(College.stream).distinct())).scalars().all()
    return {n.lower().replace(" ", "-") for n in names if n}


async def _check_references(db, body: CollectionBody) -> None:
    scope = body.scope
    if scope.programSlug and scope.programSlug not in await _program_slugs(db):
        raise ValidationError(f"scope.programSlug: no programme '{scope.programSlug}'.")
    if scope.locationSlug and not (await db.execute(
        select(Location.id).where(Location.slug == scope.locationSlug))).scalar_one_or_none():
        raise ValidationError(f"scope.locationSlug: no city '{scope.locationSlug}'.")
    if scope.examSlug and not (await db.execute(
        select(Exam.id).where(Exam.slug == scope.examSlug))).scalar_one_or_none():
        raise ValidationError(f"scope.examSlug: no exam '{scope.examSlug}'.")
    if scope.courseSlug and not (await db.execute(
        select(CourseCatalogue.id).where(CourseCatalogue.slug == scope.courseSlug))).scalar_one_or_none():
        raise ValidationError(f"scope.courseSlug: no course '{scope.courseSlug}'.")

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
        if not body.collegeSlugs:
            raise ValidationError("isPublished: add at least one college before publishing.")
        if not body.seo.metaTitle.strip():
            raise ValidationError("seo.metaTitle: required before publishing.")
        if not body.seo.metaDescription.strip():
            raise ValidationError("seo.metaDescription: required before publishing.")


def _stored(collection_id: str, slug: str, body: CollectionBody) -> dict:
    seo: dict[str, Any] = {
        "metaTitle": body.seo.metaTitle,
        "metaDescription": body.seo.metaDescription,
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
        "title": body.title,
        "heading": body.heading,
        "subheading": body.subheading,
        "scope": {k: v for k, v in body.scope.model_dump().items() if v},
        "rankingListSlug": body.rankingListSlug or "",
        "collegeSlugs": body.collegeSlugs,
        "seo": seo,
        "placements": placements,
        "isPublished": body.isPublished,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/options", response_model=SuccessResponse[dict])
async def admin_collection_options(_admin: AdminPayload, db: DbSession):
    """Everything the editor can choose from, in one response."""
    programs = sorted(await _program_slugs(db))
    locations = (await db.execute(select(Location.slug, Location.name).order_by(Location.name))).all()
    exams = (await db.execute(select(Exam.slug, Exam.name).order_by(Exam.name))).all()
    courses = (await db.execute(select(CourseCatalogue.slug, CourseCatalogue.name).order_by(CourseCatalogue.name))).all()
    colleges = (await db.execute(select(College.slug, College.name).order_by(College.name))).all()
    rankings = (await db.execute(select(RankingList.slug, RankingList.name).order_by(RankingList.name))).all()
    return SuccessResponse[dict](data={
        "programs": [{"slug": p, "name": p.replace("-", " ").title()} for p in programs],
        "locations": [{"slug": s, "name": n} for s, n in locations],
        "exams": [{"slug": s, "name": n} for s, n in exams],
        "courses": [{"slug": s, "name": n} for s, n in courses],
        "colleges": [{"slug": s, "name": n} for s, n in colleges],
        "rankings": [{"slug": s, "name": n} for s, n in rankings],
    })


@router.get("", response_model=SuccessResponse[list])
async def admin_list_collections(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(select(Collection).order_by(Collection.slug))).scalars().all()
    return SuccessResponse[list](data=[r.data for r in rows])


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
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Collection '{slug}' saved."})


@router.delete("/{slug}", response_model=SuccessResponse[dict])
async def admin_delete_collection(slug: str, _admin: AdminPayload, db: DbSession):
    """Deletes a collection. Only a draft that is not on the homepage can be deleted,
    so no live page or homepage band loses its target."""
    row = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Collection")
    if row.data.get("isPublished"):
        raise ConflictError("COLLECTION_PUBLISHED", "Unpublish this collection before deleting it.")
    if (row.data.get("placements") or {}).get("homepage"):
        raise ConflictError("COLLECTION_ON_HOMEPAGE", "Remove this collection from the homepage before deleting it.")
    await db.delete(row)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Collection '{slug}' deleted."})

