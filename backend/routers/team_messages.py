"""Messages from the platform team to newsletter subscribers, and each student's inbox of them.

The team writes a message on the Subscribed emails page and sends it to every subscribed address or to the ones it
picked. It is in-app only: a subscriber with an account finds it in My account, Messages (and gets a bell
notification). An address with no account has no inbox, so it is left out and counted as skipped.
"""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, update

from core.dependencies import AdminPayload, CurrentUserId, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.newsletter import NewsletterSubscriber
from models.team_message import TeamMessage, TeamMessageRecipient
from models.user import User
from schemas.common import ListResponse, Meta, SuccessResponse
from services.notify import notify

admin_router = APIRouter(prefix="/admin/team-messages", tags=["admin"])
me_router = APIRouter(prefix="/me/messages", tags=["me"])

MAX_SELECTED = 500


class SendBody(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1, max_length=8000)
    audience: Literal["all", "selected"]
    # The subscriber rows picked on the page, for "selected".
    subscriberIds: list[str] = Field(default_factory=list, max_length=MAX_SELECTED)
    model_config = ConfigDict(extra="forbid")


@admin_router.post("", response_model=SuccessResponse[dict], status_code=201)
async def send_message(data: SendBody, admin: AdminPayload, db: DbSession):
    """Sends the message to the inbox of every subscribed address with an account, or of the ones picked."""
    conditions = [NewsletterSubscriber.is_active.is_(True)]
    if data.audience == "selected":
        if not data.subscriberIds:
            raise ValidationError("Choose at least one subscriber, or send to everyone.")
        try:
            ids = [uuid.UUID(i) for i in data.subscriberIds]
        except ValueError as exc:
            raise ValidationError("subscriberIds: not valid ids.") from exc
        conditions.append(NewsletterSubscriber.id.in_(ids))
    emails = [e.lower() for e in (await db.execute(select(NewsletterSubscriber.email).where(*conditions))).scalars().all()]
    if not emails:
        raise ValidationError("Nobody to send to: the chosen addresses are not subscribed.")

    users = {u.email.lower(): u for u in (await db.execute(select(User).where(func.lower(User.email).in_(emails), User.is_active.is_(True)))).scalars().all()}
    # In-app only: an address with an account gets it in its inbox; one without an account is skipped.
    reachable = [e for e in emails if e in users]
    if not reachable:
        raise ValidationError("None of the chosen addresses has an account, so there is no inbox to send to.")

    sender = uuid.UUID(admin["sub"]) if admin.get("sub") else None
    who = await db.get(User, sender) if sender else None
    message = TeamMessage(
        subject=data.subject.strip(),
        body=data.body.strip(),
        audience=data.audience,
        also_email=False,
        sent_by=sender,
        sent_by_name=(who.name if who else "")[:200],
        recipient_count=len(reachable),
    )
    db.add(message)
    await db.flush()
    db.add_all([TeamMessageRecipient(message_id=message.id, user_id=users[e].id, email=e) for e in reachable])
    await db.flush()

    preview = message.body if len(message.body) <= 160 else message.body[:157].rstrip() + "…"
    await notify(db, [users[e].id for e in reachable], kind="team.message", title=message.subject, body=preview, link="/account/messages", commit=False)
    await db.commit()

    return SuccessResponse[dict](data={"id": str(message.id), "total": len(emails), "inApp": len(reachable), "skipped": len(emails) - len(reachable)})


@admin_router.get("", response_model=ListResponse[dict])
async def sent_messages(_admin: AdminPayload, db: DbSession, page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50)):
    """What the team has sent, newest first, with how many have read each one."""
    total = (await db.execute(select(func.count()).select_from(TeamMessage))).scalar_one()
    messages = (await db.execute(select(TeamMessage).order_by(TeamMessage.sent_at.desc()).offset((page - 1) * limit).limit(limit))).scalars().all()
    reads: dict = {}
    if messages:
        reads = dict(
            (
                await db.execute(
                    select(TeamMessageRecipient.message_id, func.count())
                    .where(TeamMessageRecipient.message_id.in_([m.id for m in messages]), TeamMessageRecipient.read_at.is_not(None))
                    .group_by(TeamMessageRecipient.message_id)
                )
            ).all()
        )
    data = [
        {
            "id": str(m.id),
            "subject": m.subject,
            "body": m.body,
            "audience": m.audience,
            "alsoEmail": bool(m.also_email),
            "sentBy": m.sent_by_name,
            "recipients": m.recipient_count,
            "read": int(reads.get(m.id, 0)),
            "sentAt": m.sent_at.isoformat() if m.sent_at else None,
        }
        for m in messages
    ]
    return ListResponse[dict](data=data, meta=Meta(total=int(total), page=page, limit=limit, pages=max(1, -(-int(total) // limit))))


# -- The student's inbox ---------------------------------------------------------

@me_router.get("", response_model=SuccessResponse[dict])
async def my_messages(user_id: CurrentUserId, db: DbSession):
    """The team's messages to this student, newest first, and how many are unread."""
    rows = (
        await db.execute(
            select(TeamMessageRecipient, TeamMessage)
            .join(TeamMessage, TeamMessage.id == TeamMessageRecipient.message_id)
            .where(TeamMessageRecipient.user_id == user_id, TeamMessageRecipient.deleted_at.is_(None))
            .order_by(TeamMessage.sent_at.desc())
            .limit(200)
        )
    ).all()
    items = [
        {
            "id": str(r.id),
            "subject": m.subject,
            "body": m.body,
            "from": "TopCollegePath team",
            "sentAt": m.sent_at.isoformat() if m.sent_at else None,
            "read": r.read_at is not None,
        }
        for r, m in rows
    ]
    return SuccessResponse[dict](data={"items": items, "unread": sum(1 for i in items if not i["read"])})


def _mine(user_id, recipient_id: str):
    try:
        rid = uuid.UUID(recipient_id)
    except ValueError as exc:
        raise ValidationError("id: not a valid id.") from exc
    return [TeamMessageRecipient.id == rid, TeamMessageRecipient.user_id == user_id]


@me_router.post("/{recipient_id}/read", response_model=SuccessResponse[dict])
async def read_message(recipient_id: str, user_id: CurrentUserId, db: DbSession):
    """Marks one message read (opening it does this)."""
    result = await db.execute(
        update(TeamMessageRecipient).where(*_mine(user_id, recipient_id), TeamMessageRecipient.read_at.is_(None)).values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return SuccessResponse[dict](data={"updated": result.rowcount})


@me_router.delete("/{recipient_id}", response_model=SuccessResponse[dict])
async def delete_message(recipient_id: str, user_id: CurrentUserId, db: DbSession):
    """Removes a message from the student's inbox."""
    result = await db.execute(
        update(TeamMessageRecipient).where(*_mine(user_id, recipient_id), TeamMessageRecipient.deleted_at.is_(None)).values(deleted_at=datetime.now(timezone.utc))
    )
    await db.commit()
    if not result.rowcount:
        raise NotFoundError("Message")
    return SuccessResponse[dict](data={"deleted": True})
