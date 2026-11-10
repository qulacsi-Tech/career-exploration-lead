"""The newsletter's subscribed emails, for the platform team. ADMIN role required."""

import uuid

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, select

from core.dependencies import AdminPayload, DbSession
from models.newsletter import NewsletterSubscriber
from models.user import User
from core.exceptions import NotFoundError, ValidationError
from schemas.common import ListResponse, Meta, SuccessResponse

router = APIRouter(prefix="/admin/subscribers", tags=["admin"])


@router.get("", response_model=ListResponse[dict])
async def list_subscribers(
    _admin: AdminPayload,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=100),
    status: str = Query("", pattern="^(|active|unsubscribed)$"),
):
    """Subscribed emails, newest first, a page at a time. Each shows whether the address has an account and whether it has a password yet."""
    conditions = []
    if q.strip():
        conditions.append(NewsletterSubscriber.email.ilike(f"%{q.strip()}%"))
    if status:
        conditions.append(NewsletterSubscriber.is_active.is_(status == "active"))
    total = (await db.execute(select(func.count()).select_from(NewsletterSubscriber).where(*conditions))).scalar_one()
    rows = (
        await db.execute(
            select(NewsletterSubscriber, User.name, User.password_hash, User.google_sub, User.auth_provider)
            .outerjoin(User, func.lower(User.email) == func.lower(NewsletterSubscriber.email))
            .where(*conditions)
            .order_by(NewsletterSubscriber.subscribed_at.desc(), NewsletterSubscriber.id)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    data = []
    for sub, name, password_hash, google_sub, provider in rows:
        if name is None:
            account = "none"
        elif provider == "newsletter" and not password_hash and not google_sub:
            account = "subscriber"  # made when they subscribed; no password yet
        else:
            account = "registered"
        data.append(
            {
                "id": str(sub.id),
                "email": sub.email,
                "name": name or "",
                "account": account,
                "active": bool(sub.is_active),
                "subscribedAt": sub.subscribed_at.isoformat() if sub.subscribed_at else None,
            }
        )
    return ListResponse[dict](data=data, meta=Meta(total=int(total), page=page, limit=limit, pages=max(1, -(-int(total) // limit))))


class SubscriberChange(BaseModel):
    active: bool
    model_config = ConfigDict(extra="forbid")


def _id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise ValidationError("id: not a valid id.") from exc


@router.patch("/{subscriber_id}", response_model=SuccessResponse[dict])
async def set_subscriber(subscriber_id: str, body: SubscriberChange, _admin: AdminPayload, db: DbSession):
    """Unsubscribes an address, or subscribes it again. The record stays."""
    sub = await db.get(NewsletterSubscriber, _id(subscriber_id))
    if sub is None:
        raise NotFoundError("Subscriber")
    sub.is_active = body.active
    await db.commit()
    return SuccessResponse[dict](data={"message": "Subscribed again." if body.active else "Unsubscribed."})


@router.delete("/{subscriber_id}", response_model=SuccessResponse[dict])
async def remove_subscriber(subscriber_id: str, _admin: AdminPayload, db: DbSession):
    """Removes the address from the list. Its account, if any, is left alone."""
    wanted = _id(subscriber_id)
    if await db.get(NewsletterSubscriber, wanted) is None:
        raise NotFoundError("Subscriber")
    await db.execute(delete(NewsletterSubscriber).where(NewsletterSubscriber.id == wanted))
    await db.commit()
    return SuccessResponse[dict](data={"message": "Removed from the list."})
