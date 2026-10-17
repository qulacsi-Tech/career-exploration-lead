"""What a College Admin may do, all of it about their one college.

Every query here is scoped to the college read from the signed-in account in the database
(core.dependencies.require_college_admin), never from anything the browser sends. A lead for
another college is therefore a 404, not a hidden row.

Two deliberate limits:
- Only leads whose sender agreed to be contacted are shown. The privacy policy says an enquiry
  about a college is passed to that college, and the agreement is what that rests on.
- Nothing here writes to the live college. Changes go through the approval flow (see the plan).
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import distinct, func, select, update
from sqlalchemy.orm import selectinload

from core.dependencies import CollegeAdminScope, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.lead import Lead, LeadStatus
from models.tracking import Event
from repositories.lead import LeadRepository
from routers import admin_college_record
from schemas.common import ListResponse, Meta, SuccessResponse
from services.lead_view import lead_json

router = APIRouter(prefix="/college", tags=["college"])

WINDOW_DAYS = 14


def _mine(scope: dict):
    """The leads this college admin may see."""
    return (Lead.college_slug == scope["college_slug"], Lead.consent.is_(True))


@router.get("/me", response_model=SuccessResponse[dict])
async def college_me(scope: CollegeAdminScope):
    return SuccessResponse[dict](data={
        "name": scope["name"],
        "college": {"slug": scope["college_slug"], "name": scope["college_name"]},
    })


@router.get("/record", response_model=SuccessResponse[dict])
async def college_record(scope: CollegeAdminScope, db: DbSession):
    """Their college exactly as the admin editor shows it. Read only until the approval flow lands."""
    row = await admin_college_record._load(db, scope["college_slug"])
    return SuccessResponse[dict](data=admin_college_record._record(row))


@router.get("/pools", response_model=SuccessResponse[dict])
async def college_pools(scope: CollegeAdminScope, db: DbSession):
    """The lists the editor's dropdowns are filled from (the same as the platform admin's)."""
    return await admin_college_record.pools(_admin=scope, db=db)


@router.get("/dashboard", response_model=SuccessResponse[dict])
async def college_dashboard(scope: CollegeAdminScope, db: DbSession):
    slug = scope["college_slug"]
    start = (datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    total = (await db.execute(select(func.count()).select_from(Lead).where(*_mine(scope)))).scalar_one()
    new = (await db.execute(
        select(func.count()).select_from(Lead).where(*_mine(scope), Lead.status == LeadStatus.NEW)
    )).scalar_one()

    day = func.date(Lead.created_at)
    leads_per_day = {
        str(d): n
        for d, n in (await db.execute(
            select(day, func.count()).where(*_mine(scope), Lead.created_at >= start).group_by(day)
        )).all()
    }

    views_day = func.date(Event.occurred_at)
    page_rows = (await db.execute(
        select(views_day, func.count(), func.count(distinct(Event.visitor_id)))
        .where(Event.college_slug == slug, Event.name == "page_view", Event.occurred_at >= start)
        .group_by(views_day)
    )).all()
    views_per_day = {str(d): (n, v) for d, n, v in page_rows}

    clicks = (await db.execute(
        select(func.count()).select_from(Event).where(Event.college_slug == slug, Event.name == "click_cta", Event.occurred_at >= start)
    )).scalar_one()

    series = []
    for i in range(WINDOW_DAYS):
        key = (start + timedelta(days=i)).date().isoformat()
        views, visitors = views_per_day.get(key, (0, 0))
        series.append({"date": key, "leads": leads_per_day.get(key, 0), "views": views, "visitors": visitors})

    return SuccessResponse[dict](data={
        "college": {"slug": slug, "name": scope["college_name"]},
        "totals": {
            "leads": total,
            "newLeads": new,
            "pageViews": sum(p["views"] for p in series),
            "visitors": sum(p["visitors"] for p in series),
            "ctaClicks": clicks,
        },
        "byDay": series,
        "days": WINDOW_DAYS,
    })


@router.get("/leads", response_model=ListResponse[dict])
async def college_leads(
    scope: CollegeAdminScope,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
):
    stmt = select(Lead).where(*_mine(scope)).order_by(Lead.created_at.desc())
    if status:
        if status not in {s.value for s in LeadStatus}:
            raise ValidationError("status: not a known status.")
        stmt = stmt.where(Lead.status == status)

    total = (await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    leads = (await db.execute(
        stmt.options(selectinload(Lead.replies)).offset((page - 1) * limit).limit(limit)
    )).scalars().all()
    pages = max(1, -(-total // limit))
    return ListResponse[dict](
        meta=Meta(total=total, page=page, limit=limit, pages=pages),
        data=[lead_json(lead, for_college=True) for lead in leads],
    )


async def _own_lead(scope: dict, db, lead_id: str) -> Lead:
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError as exc:
        raise ValidationError("lead_id: not a valid id.") from exc
    lead = (await db.execute(select(Lead).where(Lead.id == lead_uuid, *_mine(scope)))).scalar_one_or_none()
    if lead is None:
        raise NotFoundError("Lead")
    return lead


class StatusBody(BaseModel):
    status: str
    model_config = ConfigDict(populate_by_name=True)


@router.patch("/leads/{lead_id}", response_model=SuccessResponse[dict])
async def college_update_lead(lead_id: str, body: StatusBody, scope: CollegeAdminScope, db: DbSession):
    if body.status not in {s.value for s in LeadStatus}:
        raise ValidationError("status: not a known status.")
    lead = await _own_lead(scope, db, lead_id)
    await db.execute(update(Lead).where(Lead.id == lead.id).values(status=body.status))
    await db.commit()
    return SuccessResponse[dict](data={"message": "Lead status updated."})


class ReplyBody(BaseModel):
    body: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 2000:
            raise ValueError("A reply must be between 2 and 2000 characters.")
        return v


@router.post("/leads/{lead_id}/replies", response_model=SuccessResponse[dict], status_code=201)
async def college_reply(lead_id: str, body: ReplyBody, scope: CollegeAdminScope, db: DbSession):
    lead = await _own_lead(scope, db, lead_id)
    if not lead.user_id:
        raise ValidationError("This visitor was not signed in, so there is no account to show a reply on.")
    # The student sees who wrote it and for which college.
    author = f"{scope['name']}, {scope['college_name']}"
    await LeadRepository(db).add_reply(lead.id, author[:200], body.body)
    try:
        from services.notify import notify

        await notify(db, [lead.user_id], kind="lead.reply", title=f"{scope['college_name']} replied to your enquiry", body=body.body[:200], link="/account/replies")
    except Exception:  # noqa: BLE001 - the reply is already saved
        pass
    return SuccessResponse[dict](data={"message": "Reply sent."})
