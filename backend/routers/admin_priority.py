"""Admin priority: which institutes come first. ADMIN role required.

Two levels. The default priority sits on the college itself and applies to every list that has no
priority of its own. A header-menu link (Popular Courses > MBA, Colleges by Location > Bengaluru, a
collection...) can carry its own priorities for the institutes in its list. Within either level a
priority number belongs to one institute only: 1 is shown first, then 2, and so on. Institutes with
none come after, ordered by NIRF rank.
"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import case, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from core.validation import validate_body
from models.college import College
from routers.nav_menu import set_item_priority
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/priority", tags=["admin"])


class DefaultBody(BaseModel):
    # slug -> the college's priority, or null to clear it. Colleges not named keep theirs.
    priorities: dict[str, Optional[int]] = Field(max_length=2000)
    model_config = ConfigDict(extra="forbid")


class MenuBody(BaseModel):
    # "<category id>:<link key>" and slug -> priority for the institutes in that link's list.
    menu: str = Field(min_length=3, max_length=300)
    priority: dict[str, int] = Field(default_factory=dict, max_length=1000)
    model_config = ConfigDict(extra="forbid")


def _check_numbers(values: dict[str, int], names: dict[str, str]) -> None:
    """Each number once, from 1 to 100000. A repeat names the institutes that share it."""
    holders: dict[int, list[str]] = {}
    for slug, n in values.items():
        if n < 1 or n > 100000:
            raise ValidationError(f"priority: {names.get(slug, slug)} has {n}; a priority is a whole number from 1 to 100000.")
        holders.setdefault(n, []).append(names.get(slug, slug))
    for n, who in sorted(holders.items()):
        if len(who) > 1:
            raise ValidationError(f"priority: {n} is given to both {who[0]} and {who[1]}. Each priority belongs to one institute.")


@router.get("/default", response_model=SuccessResponse[list])
async def admin_default_priorities(_admin: AdminPayload, db: DbSession):
    """Every college that is not archived, in the order the lists show them now."""
    rows = (await db.execute(
        select(College.slug, College.name, College.city, College.stream, College.status, College.priority, College.ranking_rank)
        .where(College.status != "archived")
        .order_by(
            case((College.priority.is_(None), 1), else_=0), College.priority,
            case((College.ranking_rank.is_(None), 1), else_=0), College.ranking_rank, College.name,
        )
    )).all()
    return SuccessResponse[list](data=[
        {"slug": r.slug, "name": r.name, "city": r.city, "stream": r.stream, "status": r.status, "priority": r.priority, "rank": r.ranking_rank}
        for r in rows
    ])


@router.put("/default", response_model=SuccessResponse[dict])
async def admin_set_default_priorities(_admin: AdminPayload, db: DbSession, body: dict):
    data = validate_body(DefaultBody, body)
    colleges = {c.slug: c for c in (await db.execute(select(College))).scalars().all()}
    unknown = [s for s in data.priorities if s not in colleges]
    if unknown:
        raise ValidationError(f"priorities: unknown college '{unknown[0]}'.")

    final = {slug: c.priority for slug, c in colleges.items()}
    final.update(data.priorities)
    _check_numbers({s: n for s, n in final.items() if n is not None}, {s: c.name for s, c in colleges.items()})

    for slug, n in data.priorities.items():
        colleges[slug].priority = n
    await db.commit()
    return SuccessResponse[dict](data={"message": "Priorities saved."})


@router.put("/menu", response_model=SuccessResponse[dict])
async def admin_set_menu_priorities(_admin: AdminPayload, db: DbSession, body: dict):
    """Saves the priorities of one header-menu link's list. Replaces what it had."""
    data = validate_body(MenuBody, body)
    names = {slug: name for slug, name in (await db.execute(select(College.slug, College.name).where(College.slug.in_(list(data.priority))))).all()} if data.priority else {}
    unknown = [s for s in data.priority if s not in names]
    if unknown:
        raise ValidationError(f"priority: unknown college '{unknown[0]}'.")
    _check_numbers(data.priority, names)
    await set_item_priority(db, data.menu, data.priority)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Priorities saved."})
