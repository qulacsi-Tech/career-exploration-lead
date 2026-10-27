"""Admin rankings: ranking lists and their ordered entries. ADMIN role required.

A list's entries are replaced as a whole on save, so the order the editor shows
is the order stored. Every entry names an existing college, each college appears
once per list, and ranks are unique positive integers. A list that a collection
still orders by cannot be deleted.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from core.dependencies import AdminPayload, DbSession
from core.validation import validate_body
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

    @field_validator("score", mode="before")
    @classmethod
    def _validate_score(cls, v):
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            return None
        try:
            val = float(s)
        except (ValueError, TypeError):
            raise ValueError("Score must be a number between 0 and 100.")
        if val < 0 or val > 100:
            raise ValueError("Score must be between 0 and 100.")
        return f"{val:g}"


class RankingBody(BaseModel):
    name: str = Field(min_length=2, max_length=300)
    shortName: str = Field(default="", max_length=100)
    authority: str = Field(min_length=2, max_length=200)
    year: int = Field(ge=1990)
    stream: Optional[str] = Field(default=None, max_length=100)
    entries: list[EntryBody] = Field(default_factory=list, max_length=500)
    model_config = ConfigDict(extra="forbid")

    @field_validator("year")
    @classmethod
    def _validate_year(cls, v: int) -> int:
        max_year = datetime.now().year + 1
        if v > max_year:
            raise ValueError(f"Year cannot be in the future (max {max_year}).")
        return v


class RankingCreateBody(RankingBody):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)


def _validate(model: type[BaseModel], raw: dict) -> BaseModel:
    return validate_body(model, raw)


async def _check_entries(db, entries: list[EntryBody]) -> None:
    """Every college must exist, appear once, and have a unique rank."""
    slugs = [e.collegeSlug for e in entries]
    ranks = [e.rank for e in entries]
    if len(set(slugs)) != len(slugs):
        raise ValidationError("entries: a college appears more than once.")
    known_names = {slug: name for slug, name in (await db.execute(select(College.slug, College.name).where(College.slug.in_(slugs)))).all()} if slugs else {}
    if len(set(ranks)) != len(ranks):
        # Say who: the first rank given to two colleges, and both of them.
        holders: dict[int, list[str]] = {}
        for e in entries:
            holders.setdefault(e.rank, []).append(known_names.get(e.collegeSlug, e.collegeSlug))
        rank, who = next((r, w) for r, w in holders.items() if len(w) > 1)
        raise ValidationError(f"entries: rank {rank} is given to both {who[0]} and {who[1]}. Each rank belongs to one college in a list.")
    if not slugs:
        return
    missing = [s for s in slugs if s not in known_names]
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
        "shortName": rl.short_name or "",
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


async def _sync_primary(db, college_slugs) -> None:
    """Sets each college's headline ranking (the one on its cards) from the lists it is in.

    NIRF comes first when the college is in a NIRF list, then the newest list, then
    the best rank. A college in no list has its headline ranking cleared.
    """
    for slug in set(college_slugs):
        college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
        if college is None:
            continue
        rows = (await db.execute(
            select(RankingList.authority, RankingList.year, RankingEntry.rank)
            .join(RankingEntry, RankingEntry.ranking_list_id == RankingList.id)
            .where(RankingEntry.college_slug == slug)
        )).all()
        if not rows:
            college.ranking_authority = None
            college.ranking_rank = None
            continue
        best = min(rows, key=lambda r: (0 if "nirf" in r.authority.lower() else 1, -r.year, r.rank))
        college.ranking_authority = best.authority
        college.ranking_rank = best.rank


class PlacementBody(BaseModel):
    rank: int = Field(ge=1, le=100000)
    score: Optional[str] = Field(default=None, max_length=50)
    model_config = ConfigDict(extra="forbid")


@router.get("/college/{college_slug}", response_model=SuccessResponse[dict])
async def admin_college_rankings(college_slug: str, _admin: AdminPayload, db: DbSession):
    """The ranking lists a college is in, and the lists it could still be added to."""
    lists = (await db.execute(
        select(RankingList).options(selectinload(RankingList.entries)).order_by(RankingList.year.desc(), RankingList.name)
    )).scalars().unique().all()
    mine, available = [], []
    for rl in lists:
        entry = next((e for e in rl.entries if e.college_slug == college_slug), None)
        head = {"slug": rl.slug, "name": rl.name, "authority": rl.authority, "year": rl.year, "stream": rl.stream}
        if entry:
            mine.append({**head, "rank": entry.rank, "score": entry.score})
        else:
            available.append(head)
    return SuccessResponse[dict](data={"entries": mine, "available": available})


@router.get("/{slug}/rank/{rank}", response_model=SuccessResponse[dict])
async def admin_rank_holder(slug: str, rank: int, _admin: AdminPayload, db: DbSession, exclude: Optional[str] = None):
    """Who holds a rank in a list, for the warning shown while a rank is being typed. `exclude` is the college being edited."""
    rl = await _by_slug(db, slug)
    entry = next((e for e in rl.entries if e.rank == rank and e.college_slug != exclude), None)
    if entry is None:
        return SuccessResponse[dict](data={"holder": None, "list": rl.name})
    name = (await db.execute(select(College.name).where(College.slug == entry.college_slug))).scalar_one_or_none() or entry.college_slug
    return SuccessResponse[dict](data={"holder": {"slug": entry.college_slug, "name": name}, "list": rl.name})


@router.put("/{slug}/entries/{college_slug}", response_model=SuccessResponse[dict])
async def admin_set_entry(slug: str, college_slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Puts one college in a list at a rank, or changes its rank there."""
    data = _validate(PlacementBody, body)
    rl = await _by_slug(db, slug)
    if (await db.execute(select(College.slug).where(College.slug == college_slug))).scalar_one_or_none() is None:
        raise NotFoundError("College")
    clash = next((e for e in rl.entries if e.rank == data.rank and e.college_slug != college_slug), None)
    if clash is not None:
        holder = (await db.execute(select(College.name).where(College.slug == clash.college_slug))).scalar_one_or_none() or clash.college_slug
        raise ConflictError("RANK_TAKEN", f"Rank {data.rank} in {rl.name} is already held by {holder}. Choose another rank, or change theirs first.")
    entry = next((e for e in rl.entries if e.college_slug == college_slug), None)
    if entry is None:
        db.add(RankingEntry(id=uuid.uuid4(), ranking_list_id=rl.id, college_slug=college_slug, rank=data.rank, score=data.score))
    else:
        entry.rank = data.rank
        entry.score = data.score
    await db.flush()
    await _sync_primary(db, [college_slug])
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})


@router.delete("/{slug}/entries/{college_slug}", response_model=SuccessResponse[dict])
async def admin_remove_entry(slug: str, college_slug: str, _admin: AdminPayload, db: DbSession):
    rl = await _by_slug(db, slug)
    entry = next((e for e in rl.entries if e.college_slug == college_slug), None)
    if entry is None:
        raise NotFoundError("Ranking entry")
    await db.delete(entry)
    await db.flush()
    await _sync_primary(db, [college_slug])
    await db.commit()
    return SuccessResponse[dict](data={"message": "Removed."})


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
        short_name=data.shortName.strip(),
        authority=data.authority,
        year=data.year,
        stream=data.stream,
    )
    db.add(rl)
    _replace_entries(rl, data.entries)
    await db.flush()
    await _sync_primary(db, [e.collegeSlug for e in data.entries])
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Ranking list '{data.slug}' created."})


@router.put("/{slug}", response_model=SuccessResponse[dict])
async def admin_update_ranking(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Replaces the list's details and its whole ordered entry set. The slug is fixed."""
    data = _validate(RankingBody, body)
    rl = await _by_slug(db, slug)
    await _check_entries(db, data.entries)

    rl.name = data.name
    rl.short_name = data.shortName.strip()
    rl.authority = data.authority
    rl.year = data.year
    rl.stream = data.stream
    before = [e.college_slug for e in rl.entries]
    _replace_entries(rl, data.entries)
    await db.flush()
    await _sync_primary(db, before + [e.collegeSlug for e in data.entries])
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
    members = [e.college_slug for e in rl.entries]
    await db.delete(rl)
    await db.flush()
    await _sync_primary(db, members)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Ranking list '{slug}' deleted."})
