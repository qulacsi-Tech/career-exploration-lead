"""Admin priority: which institutes come first. ADMIN role required.

Two levels. The default priority sits on the college itself and applies to every list that has no
priority of its own. A header-menu link (Popular Courses > MBA, Colleges by Location > Bengaluru, a
collection...) and every filter of the college listing (category, course, specialisation, location, ranking,
credential, level, mode, ownership, exam, approval, fees) can carry priorities of their own. A priority is a
place in the list: 1 is the first place, 2 the second. Several institutes may share a number; they take turns at
that place on each visit (see services/priority_slots.py). Institutes with none fill the other places, by NIRF rank.
"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import case, delete, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from core.validation import validate_body
from models.college import College
from models.listing_priority import ListingPriority
from models.ranking import RankingList
from repositories.college import CollegeRepository
from schemas.college import CollegeFilterParams
from services.listing_priority import params_of_scope
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
    """Whole numbers from 1 to 100000. Several institutes may share a number: they take turns at that place."""
    for slug, n in values.items():
        if n < 1 or n > 100000:
            raise ValidationError(f"priority: {names.get(slug, slug)} has {n}; a priority is a whole number from 1 to 100000.")


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


# ── Priorities for each filter of the college listing ───────────────────────

class ScopeBody(BaseModel):
    # "<filter>=<value>", e.g. "city=Pune"; slug -> priority for the institutes in that filter's list.
    scope: str = Field(min_length=3, max_length=300)
    priority: dict[str, int] = Field(default_factory=dict, max_length=2000)
    model_config = ConfigDict(extra="forbid")


@router.get("/scopes", response_model=SuccessResponse[list])
async def admin_priority_scopes(_admin: AdminPayload, db: DbSession):
    """Every filter the college listing offers, with each of its values: what a priority can be set for."""
    facets = await CollegeRepository(db).facets()
    lists = (await db.execute(select(RankingList.slug, RankingList.name, RankingList.short_name, RankingList.year).order_by(RankingList.year.desc(), RankingList.name))).all()

    def group(gid: str, label: str, name: str, values: list[str]) -> dict:
        return {"id": gid, "label": label, "options": [{"scope": f"{name}={v}", "label": v} for v in values]}

    groups = [
        group("stream", "Category", "stream", facets["streams"]),
        group("course", "Course", "course", facets["courses"]),
        group("specialisation", "Specialisation", "specialisation", facets["specialisations"]),
        group("city", "Location", "city", facets["cities"]),
        {
            "id": "ranking_list",
            "label": "Ranking",
            "options": [
                {"scope": f"ranking_list={slug}", "label": (short or "").strip() or (name if str(year) in name else f"{name} {year}")}
                for slug, name, short, year in lists
            ],
        },
        group("credential", "Credential", "credential", ["Degree", "Diploma", "Doctorate"]),
        group("level", "Course Level", "level", ["UG", "PG", "Doctorate"]),
        group("mode", "Mode of Study", "mode", facets["modes"]),
        {"id": "fees", "label": "Total Fees", "options": [
            {"scope": "fees=-5", "label": "< 5 Lakh"}, {"scope": "fees=5-10", "label": "5 - 10 Lakh"},
            {"scope": "fees=10-20", "label": "10 - 20 Lakh"}, {"scope": "fees=20-", "label": "> 20 Lakh"},
        ]},
        group("ownership", "Ownership", "ownership", ["Private", "Government", "Deemed"]),
        group("exam", "Exam accepted", "exam", facets["exams"]),
        group("approval", "Approval", "approval", facets["approvals"]),
    ]
    return SuccessResponse[list](data=[g for g in groups if g["options"]])


@router.get("/scope", response_model=SuccessResponse[dict])
async def admin_scope_institutes(scope: str, _admin: AdminPayload, db: DbSession):
    """The published institutes a filter would list, with the priority already saved for each in that filter."""
    narrowing = params_of_scope(scope)
    if not narrowing:
        raise ValidationError("scope: not a filter of the college listing.")
    params = CollegeFilterParams(page=1, limit=500, **narrowing)
    colleges, total = await CollegeRepository(db).list(params)
    saved = dict((await db.execute(select(ListingPriority.college_slug, ListingPriority.priority).where(ListingPriority.scope == scope))).all())
    return SuccessResponse[dict](data={
        "truncated": total > len(colleges),
        "colleges": [{"slug": c.slug, "name": c.name, "city": c.city, "rank": c.ranking_rank, "priority": saved.get(c.slug)} for c in colleges],
    })


@router.put("/scope", response_model=SuccessResponse[dict])
async def admin_set_scope_priorities(_admin: AdminPayload, db: DbSession, body: dict):
    """Saves the priorities of one filter's list. Replaces what it had. Institutes may share a number."""
    data = validate_body(ScopeBody, body)
    if not params_of_scope(data.scope):
        raise ValidationError("scope: not a filter of the college listing.")
    names = {slug: name for slug, name in (await db.execute(select(College.slug, College.name).where(College.slug.in_(list(data.priority))))).all()} if data.priority else {}
    unknown = [s for s in data.priority if s not in names]
    if unknown:
        raise ValidationError(f"priority: unknown college '{unknown[0]}'.")
    _check_numbers(data.priority, names)
    await db.execute(delete(ListingPriority).where(ListingPriority.scope == data.scope))
    for slug, n in data.priority.items():
        db.add(ListingPriority(scope=data.scope, college_slug=slug, priority=n))
    await db.commit()
    return SuccessResponse[dict](data={"message": "Priorities saved."})
