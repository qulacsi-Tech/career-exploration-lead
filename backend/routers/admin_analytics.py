"""Admin views of who visited and what they did. Admin role required.

Every figure is counted from the events the site recorded; nothing is estimated. Visitors are
counted by browser (the first-party id), so one person on two devices counts twice until they
sign in on both.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import distinct, func, literal_column, or_, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.lead import Lead
from models.tracking import Event, VisitSession, Visitor
from models.user import User
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin", tags=["admin"])


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _value(enum_or_str) -> str:
    return enum_or_str.value if hasattr(enum_or_str, "value") else str(enum_or_str)


def _event_json(e: Event) -> dict:
    return {
        "id": e.id,
        "name": e.name,
        "path": e.path,
        "properties": e.properties or {},
        "at": _iso(e.occurred_at),
    }


async def _distinct_visitors(db, start: datetime, *conditions) -> int:
    stmt = select(func.count(distinct(Event.visitor_id))).where(Event.occurred_at >= start, *conditions)
    return (await db.execute(stmt)).scalar_one()


@router.get("/analytics", response_model=SuccessResponse[dict])
async def analytics(_admin: AdminPayload, db: DbSession, days: int = Query(14, ge=1, le=90)):
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    totals = {
        "visitors": await _distinct_visitors(db, start),
        "sessions": (await db.execute(
            select(func.count()).select_from(VisitSession).where(VisitSession.started_at >= start)
        )).scalar_one(),
        "pageViews": (await db.execute(
            select(func.count()).select_from(Event).where(Event.occurred_at >= start, Event.name == "page_view")
        )).scalar_one(),
        "leads": (await db.execute(
            select(func.count()).select_from(Lead).where(Lead.created_at >= start)
        )).scalar_one(),
        "signups": (await db.execute(
            select(func.count()).select_from(User).where(User.created_at >= start)
        )).scalar_one(),
    }

    day = func.date(Event.occurred_at)
    by_day_rows = (await db.execute(
        select(
            day,
            func.count(distinct(Event.visitor_id)),
            func.count().filter(Event.name == "page_view"),
        )
        .where(Event.occurred_at >= start)
        .group_by(day)
    )).all()
    per_day = {str(d): (v, p) for d, v, p in by_day_rows}
    by_day = []
    for i in range(days):
        key = (start + timedelta(days=i)).date().isoformat()
        visitors, views = per_day.get(key, (0, 0))
        by_day.append({"date": key, "visitors": visitors, "pageViews": views})

    top_pages = [
        {"path": path, "views": views, "visitors": visitors}
        for path, views, visitors in (await db.execute(
            select(Event.path, func.count(), func.count(distinct(Event.visitor_id)))
            .where(Event.occurred_at >= start, Event.name == "page_view", Event.path.is_not(None))
            .group_by(Event.path)
            .order_by(func.count().desc())
            .limit(10)
        )).all()
    ]

    cta = Event.properties["cta"].astext
    label = Event.properties["label"].astext
    top_ctas = [
        {"cta": c or "(unnamed)", "label": l, "clicks": n, "visitors": v}
        for c, l, n, v in (await db.execute(
            select(cta, label, func.count(), func.count(distinct(Event.visitor_id)))
            .where(Event.occurred_at >= start, Event.name == "click_cta")
            # By position: the JSONB keys are bind parameters, and Postgres would not match the
            # one in SELECT with a second copy in GROUP BY.
            .group_by(literal_column("1"), literal_column("2"))
            .order_by(func.count().desc())
            .limit(10)
        )).all()
    ]

    top_colleges = [
        {"slug": slug, "views": views, "visitors": visitors}
        for slug, views, visitors in (await db.execute(
            select(Event.college_slug, func.count(), func.count(distinct(Event.visitor_id)))
            .where(Event.occurred_at >= start, Event.name == "page_view", Event.college_slug.is_not(None))
            .group_by(Event.college_slug)
            .order_by(func.count().desc())
            .limit(8)
        )).all()
    ]

    sources = [
        {"source": source or "direct", "visitors": visitors, "sessions": sessions}
        for source, visitors, sessions in (await db.execute(
            select(VisitSession.source, func.count(distinct(VisitSession.visitor_id)), func.count())
            .where(VisitSession.started_at >= start)
            .group_by(VisitSession.source)
            .order_by(func.count().desc())
            .limit(8)
        )).all()
    ]

    devices = [
        {"device": device or "unknown", "visitors": n}
        for device, n in (await db.execute(
            select(Visitor.device_type, func.count())
            .where(Visitor.last_seen_at >= start)
            .group_by(Visitor.device_type)
            .order_by(func.count().desc())
        )).all()
    ]

    funnel = [
        {"step": "Visited the site", "count": totals["visitors"]},
        {"step": "Viewed a college page", "count": await _distinct_visitors(db, start, Event.name == "page_view", Event.college_slug.is_not(None))},
        {"step": "Clicked a call to action", "count": await _distinct_visitors(db, start, Event.name == "click_cta")},
        {"step": "Started the enquiry form", "count": await _distinct_visitors(db, start, Event.name == "form_start")},
        {"step": "Sent an enquiry", "count": await _distinct_visitors(db, start, Event.name == "form_submit")},
    ]

    return SuccessResponse[dict](data={
        "days": days,
        "totals": totals,
        "byDay": by_day,
        "topPages": top_pages,
        "topCtas": top_ctas,
        "topColleges": top_colleges,
        "sources": sources,
        "devices": devices,
        "funnel": funnel,
    })


@router.get("/leads/{lead_id}/journey", response_model=SuccessResponse[dict])
async def lead_journey(lead_id: str, _admin: AdminPayload, db: DbSession):
    """What the person behind a lead did on the site, newest first."""
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError as exc:
        raise ValidationError("lead_id: not a valid id.") from exc
    lead = await db.get(Lead, lead_uuid)
    if not lead:
        raise NotFoundError("Lead")

    match = []
    if lead.visitor_id:
        match.append(Event.visitor_id == lead.visitor_id)
    if lead.user_id:
        match.append(Event.user_id == lead.user_id)
    if not match:
        return SuccessResponse[dict](data={"visitor": None, "events": []})

    events = (await db.execute(
        select(Event).where(or_(*match)).order_by(Event.occurred_at.desc()).limit(100)
    )).scalars().all()

    visitor = await db.get(Visitor, lead.visitor_id) if lead.visitor_id else None
    return SuccessResponse[dict](data={
        "visitor": {
            "firstSeenAt": _iso(visitor.first_seen_at),
            "firstReferrer": visitor.first_referrer,
            "firstLandingPath": visitor.first_landing_path,
            "utmSource": visitor.utm_source,
            "utmCampaign": visitor.utm_campaign,
            "device": visitor.device_type,
            "browser": visitor.browser,
            "os": visitor.os,
        } if visitor else None,
        "events": [_event_json(e) for e in events],
    })
