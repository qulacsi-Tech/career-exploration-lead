"""Sharing leads with a sponsored college. ADMIN role required.

A sponsored college is one that has paid to receive leads. The platform team picks which leads it gets: either
specific ones, or the newest N that match a stream, city or type. The leads are then shared in bulk with that
college, whose admin finds them in their own Leads inbox (with everything the platform's own college leads
carry) and can export them. Only leads whose sender agreed to be contacted can be shared, and a lead is shared
with a college once.
"""

import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, or_, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.college import College
from models.lead import Lead, LeadShare, LeadType
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/colleges", tags=["admin"])

MAX_PER_SHARE = 500
PAGE = 100


def _value(x) -> str:
    return x.value if hasattr(x, "value") else str(x)


async def _sponsored(db, slug: str) -> College:
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    if not college.is_sponsored:
        raise ConflictError("NOT_SPONSORED", "Mark the college as sponsored and save it first, then share leads.")
    return college


def _item(lead: Lead, shared_at=None) -> dict:
    return {
        "id": str(lead.id),
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email or "",
        "city": lead.city or "",
        "stream": lead.stream or "",
        "type": _value(lead.type),
        "status": _value(lead.status),
        "message": lead.message or "",
        "programName": lead.program_name or "",
        "collegeSlug": lead.college_slug or "",
        "createdAt": lead.created_at.isoformat() if lead.created_at else None,
        "sharedAt": shared_at.isoformat() if shared_at else None,
    }


def _available(college: College, stream: str, city: str, kind: str, q: str):
    """Leads this college could be given: consented, not its own, not already shared with it, and matching the filters."""
    already = select(LeadShare.lead_id).where(LeadShare.college_id == college.id)
    conditions = [
        Lead.consent.is_(True),
        Lead.id.not_in(already),
        or_(Lead.college_slug.is_(None), Lead.college_slug != college.slug),
    ]
    if stream:
        conditions.append(func.lower(Lead.stream) == stream.lower())
    if city:
        conditions.append(func.lower(Lead.city) == city.lower())
    if kind:
        conditions.append(Lead.type == LeadType(kind))
    if q:
        like = f"%{q.strip()}%"
        conditions.append(or_(Lead.name.ilike(like), Lead.phone.ilike(like), Lead.email.ilike(like), Lead.message.ilike(like)))
    return conditions


@router.get("/{slug}/lead-sharing", response_model=SuccessResponse[dict])
async def lead_sharing(slug: str, _admin: AdminPayload, db: DbSession):
    """The college's sponsorship, and every lead already shared with it."""
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    rows = (
        await db.execute(
            select(Lead, LeadShare.shared_at)
            .join(LeadShare, LeadShare.lead_id == Lead.id)
            .where(LeadShare.college_id == college.id)
            .order_by(LeadShare.shared_at.desc())
            .limit(1000)
        )
    ).all()
    return SuccessResponse[dict](data={"sponsored": bool(college.is_sponsored), "shared": [_item(lead, at) for lead, at in rows]})


@router.get("/{slug}/shareable-leads", response_model=SuccessResponse[dict])
async def shareable_leads(
    slug: str,
    _admin: AdminPayload,
    db: DbSession,
    stream: str = Query("", max_length=100),
    city: str = Query("", max_length=100),
    type: str = Query("", max_length=20),
    q: str = Query("", max_length=100),
):
    """The leads that could be shared with this college, newest first, and what to filter them by."""
    college = await _sponsored(db, slug)
    if type and type not in {t.value for t in LeadType}:
        raise ValidationError("type: not a known lead type.")
    everything = _available(college, "", "", "", "")
    matching = _available(college, stream, city, type, q)

    total = (await db.execute(select(func.count()).select_from(Lead).where(*matching))).scalar_one()
    rows = (await db.execute(select(Lead).where(*matching).order_by(Lead.created_at.desc()).limit(PAGE))).scalars().all()
    streams = [s for s in (await db.execute(select(func.distinct(Lead.stream)).where(*everything, Lead.stream.is_not(None)).order_by(Lead.stream))).scalars().all() if s]
    cities = [c for c in (await db.execute(select(func.distinct(Lead.city)).where(*everything, Lead.city.is_not(None)).order_by(Lead.city).limit(200))).scalars().all() if c]
    return SuccessResponse[dict](
        data={
            "total": int(total),
            "items": [_item(lead) for lead in rows],
            "options": {"streams": streams, "cities": cities, "types": [t.value for t in LeadType]},
        }
    )


class ShareBody(BaseModel):
    # Either the leads picked one by one, or "the newest N that match these filters".
    leadIds: list[str] = Field(default_factory=list, max_length=MAX_PER_SHARE)
    count: Optional[int] = Field(default=None, ge=1, le=MAX_PER_SHARE)
    stream: str = Field(default="", max_length=100)
    city: str = Field(default="", max_length=100)
    type: Literal["", "callback", "counselling", "brochure", "enquiry"] = ""
    q: str = Field(default="", max_length=100)
    model_config = ConfigDict(extra="forbid")


@router.post("/{slug}/share-leads", response_model=SuccessResponse[dict], status_code=201)
async def share_leads(slug: str, data: ShareBody, admin: AdminPayload, db: DbSession):
    """Shares leads with the college in bulk, and tells its admin."""
    college = await _sponsored(db, slug)
    if not data.leadIds and not data.count:
        raise ValidationError("Choose the leads to share, or how many.")

    base = _available(college, data.stream, data.city, data.type, data.q)
    if data.leadIds:
        try:
            wanted = [uuid.UUID(i) for i in data.leadIds]
        except ValueError as exc:
            raise ValidationError("leadIds: not valid ids.") from exc
        picked = (await db.execute(select(Lead.id).where(*_available(college, "", "", "", ""), Lead.id.in_(wanted)))).scalars().all()
    else:
        picked = (await db.execute(select(Lead.id).where(*base).order_by(Lead.created_at.desc()).limit(data.count))).scalars().all()

    sharer = uuid.UUID(admin["sub"]) if admin.get("sub") else None
    for lead_id in picked:
        db.add(LeadShare(lead_id=lead_id, college_id=college.id, shared_by=sharer))
    await db.commit()

    if picked:
        try:
            from services.notify import college_admin_id, notify

            owner = await college_admin_id(db, college.slug)
            if owner:
                await notify(
                    db,
                    [owner],
                    kind="leads.shared",
                    title=f"{len(picked)} new {'lead' if len(picked) == 1 else 'leads'} shared with you",
                    body="Open your Leads inbox to see them.",
                    link="/admin/leads",
                )
        except Exception:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).exception("could not tell the college admin about shared leads")
    asked = len(data.leadIds) or data.count or 0
    return SuccessResponse[dict](data={"shared": len(picked), "skipped": max(0, asked - len(picked)) if data.leadIds else 0})


@router.delete("/{slug}/shared-leads/{lead_id}", response_model=SuccessResponse[dict])
async def unshare_lead(slug: str, lead_id: str, _admin: AdminPayload, db: DbSession):
    """Takes a lead back from the college: it leaves their inbox."""
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    try:
        wanted = uuid.UUID(lead_id)
    except ValueError as exc:
        raise ValidationError("lead_id: not a valid id.") from exc
    await db.execute(delete(LeadShare).where(LeadShare.college_id == college.id, LeadShare.lead_id == wanted))
    await db.commit()
    return SuccessResponse[dict](data={"message": "Taken back."})
