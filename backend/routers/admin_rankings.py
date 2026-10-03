"""Admin rankings: ranking lists and their ordered entries. ADMIN role required.

A list's entries are replaced as a whole on save, so the order the editor shows
is the order stored. Every entry names an existing college, each college appears
once per list, and ranks are unique positive integers. A list that a collection
still orders by cannot be deleted.
"""

import uuid
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.collection import Collection
from models.college import College
from models.ranking import RankingEntry, RankingList
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/rankings", tags=["admin"])

SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"


class EntryBody(BaseModel):
    collegeSlug: str = Field(min_length=2, max_length=200)
    rank: int = Field(ge=1, le=100000)
    score: Optional[str] = Field(default=None, max_length=50)
    model_config = ConfigDict(extra="forbid")


class RankingBody(BaseModel):
    name: str = Field(min_length=2, max_length=300)
    authority: str = Field(min_length=2, max_length=200)
    year: int = Field(ge=1990, le=2100)
    stream: Optional[str] = Field(default=None, max_length=100)
    entries: list[EntryBody] = Field(default_factory=list, max_length=500)
    model_config = ConfigDict(extra="forbid")


class RankingCreateBody(RankingBody):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)


def _validate(model: type[BaseModel], raw: dict) -> BaseModel:
    try:
        return model.model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


async def _check_entries(db, entries: list[EntryBody]) -> None:
    """Every college must exist, appear once, and have a unique rank."""
    slugs = [e.collegeSlug for e in entries]
    ranks = [e.rank for e in entries]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("entries: a college appears more than once.")
    if len(set(ranks)) != len(ranks):
        raise ValidationError("entries: two colleges share a rank.")
    if not slugs:
        return
    known = set((await db.execute(select(College.slug).where(College.slug.in_(slugs)))).scalars().all())
    missing = [s for s in slugs if s not in known]
    if missing:
        raise ValidationError(f"entries: unknown college '{missing[0]}'.")


def _entries_out(entries: list[RankingEntry]) -> list[dict]:
    return [
        {"collegeSlug": e.college_slug, "rank": e.rank, "score": e.score}
        for e in sorted(entries, key=lambda e: e.rank)
    ]


def _list_out(rl: RankingList) -> dict:
    return {
        "id": str(rl.id),
        "slug": rl.slug,
        "name": rl.name,
        "authority": rl.authority,
        "year": rl.year,
        "stream": rl.stream,
        "entries": _entries_out(rl.entries or []),
    }


async def _by_slug(db, slug: str) -> RankingList:
    rl = (await db.execute(
        select(RankingList).where(RankingList.slug == slug).options(selectinload(RankingList.entries))
    )).scalar_one_or_none()
    if rl is None:
        raise NotFoundError("Ranking list")
    return rl


def _replace_entries(rl: RankingList, entries: list[EntryBody]) -> None:
    rl.entries = [
        RankingEntry(
            id=uuid.uuid4(),
            ranking_list_id=rl.id,
            college_slug=e.collegeSlug,
            rank=e.rank,
            score=e.score,
        )
        for e in entries
    ]


@router.get("", response_model=SuccessResponse[list])
async def admin_list_rankings(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(
        select(RankingList).options(selectinload(RankingList.entries)).order_by(RankingList.year.desc(), RankingList.name)
    )).scalars().unique().all()
    return SuccessResponse[list](data=[_list_out(rl) for rl in rows])


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_ranking(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(RankingCreateBody, body)
    taken = (await db.execute(select(RankingList.id).where(RankingList.slug == data.slug))).scalar_one_or_none()
    if taken is not None:
        raise ConflictError("RANKING_SLUG_TAKEN", f"A ranking list with slug '{data.slug}' already exists.")
    await _check_entries(db, data.entries)

    rl = RankingList(
        id=uuid.uuid4(),
        slug=data.slug,
        name=data.name,
        authority=data.authority,
        year=data.year,
        stream=data.stream,
    )
    db.add(rl)
    _replace_entries(rl, data.entries)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Ranking list '{data.slug}' created."})


@router.put("/{slug}", response_model=SuccessResponse[dict])
async def admin_update_ranking(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Replaces the list's details and its whole ordered entry set. The slug is fixed."""
    data = _validate(RankingBody, body)
    rl = await _by_slug(db, slug)
    await _check_entries(db, data.entries)

    rl.name = data.name
    rl.authority = data.authority
    rl.year = data.year
    rl.stream = data.stream
    _replace_entries(rl, data.entries)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Ranking list '{slug}' saved."})


@router.delete("/{slug}", response_model=SuccessResponse[dict])
async def admin_delete_ranking(slug: str, _admin: AdminPayload, db: DbSession):
    rl = await _by_slug(db, slug)
    # A collection that orders by this list would lose its ordering, so it is refused.
    using = (await db.execute(
        select(func.count()).select_from(Collection).where(Collection.data["rankingListSlug"].astext == slug)
    )).scalar_one()
    if using:
        raise ConflictError(
            "RANKING_IN_USE",
            f"{using} collection{'s' if using != 1 else ''} order by this list. Change them first.",
        )
    await db.delete(rl)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Ranking list '{slug}' deleted."})
