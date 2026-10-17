"""A person's own notifications, and the WebSocket that says when there is something new.

Everything here is about the signed-in person only: the query always filters on their id, so there is
no way to read or change someone else's.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, func, or_, select, update

from core.config import settings
from core.database import AsyncSessionLocal
from core.dependencies import CurrentUserId, DbSession
from core.exceptions import NotFoundError, ValidationError
from core.security import create_ws_ticket, redeem_ws_ticket
from models.notification import Notification
from models.user import User
from schemas.common import ListResponse, Meta, SuccessResponse
from services.notify import announce
from services.realtime import hub

router = APIRouter(tags=["notifications"])


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _json(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "kind": n.kind,
        "title": n.title,
        "body": n.body,
        "link": n.link,
        "requiresAck": bool(n.requires_ack),
        "read": n.read_at is not None,
        "acknowledgedAt": _iso(n.acknowledged_at),
        "handledBy": n.resolved_by_name,
        "createdAt": _iso(n.created_at),
    }


def _mine(user_id: uuid.UUID):
    """Their notifications that they have not cleared."""
    return (Notification.recipient_id == user_id, Notification.cleared_at.is_(None))


def _waiting_for_ack():
    """Pinned: asks for an acknowledgement nobody has given and nobody else has made unnecessary."""
    return and_(Notification.requires_ack.is_(True), Notification.acknowledged_at.is_(None), Notification.resolved_at.is_(None))


@router.get("/notifications", response_model=ListResponse[dict])
async def list_notifications(
    user_id: CurrentUserId,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread: bool = Query(False),
):
    """Newest first, with anything still waiting for an acknowledgement pinned to the top."""
    stmt = select(Notification).where(*_mine(user_id))
    if unread:
        stmt = stmt.where(Notification.read_at.is_(None))
    total = (await db.execute(select(func.count()).select_from(Notification).where(*_mine(user_id), *( [Notification.read_at.is_(None)] if unread else [] )))).scalar_one()
    rows = (await db.execute(
        stmt.order_by(_waiting_for_ack().desc(), Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )).scalars().all()
    pages = max(1, -(-total // limit))
    return ListResponse[dict](meta=Meta(total=total, page=page, limit=limit, pages=pages), data=[_json(n) for n in rows])


@router.get("/notifications/count", response_model=SuccessResponse[dict])
async def notification_count(user_id: CurrentUserId, db: DbSession):
    # One pass over their notifications for both numbers.
    unread, pending = (await db.execute(
        select(
            func.count().filter(Notification.read_at.is_(None)),
            func.count().filter(_waiting_for_ack()),
        ).where(*_mine(user_id))
    )).one()
    return SuccessResponse[dict](data={"unread": unread, "pendingAck": pending})


class ReadBody(BaseModel):
    ids: Optional[list[str]] = None  # None means everything of theirs
    model_config = ConfigDict(populate_by_name=True)


def _ids(raw: Optional[list[str]]) -> Optional[list[uuid.UUID]]:
    if raw is None:
        return None
    try:
        return [uuid.UUID(i) for i in raw[:200]]
    except ValueError as exc:
        raise ValidationError("ids: not valid ids.") from exc


async def _apply(db, user_id: uuid.UUID, ids: Optional[list[uuid.UUID]], values: dict, extra=()) -> None:
    """Updates their notifications, then tells their other open tabs."""
    stmt = update(Notification).where(*_mine(user_id), *extra)
    if ids is not None:
        stmt = stmt.where(Notification.id.in_(ids))
    await db.execute(stmt.values(**values))
    await announce(db, [user_id], "notification.updated")
    await db.commit()


@router.post("/notifications/read", response_model=SuccessResponse[dict])
async def mark_read(body: ReadBody, user_id: CurrentUserId, db: DbSession):
    """Seen in the list. Does not acknowledge anything."""
    await _apply(db, user_id, _ids(body.ids), {"read_at": datetime.now(timezone.utc)}, (Notification.read_at.is_(None),))
    return SuccessResponse[dict](data={"ok": True})


async def _one(db, user_id: uuid.UUID, notification_id: str) -> Notification:
    try:
        nid = uuid.UUID(notification_id)
    except ValueError as exc:
        raise ValidationError("id: not a valid id.") from exc
    row = (await db.execute(select(Notification).where(Notification.id == nid, *_mine(user_id)))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Notification")
    return row


@router.post("/notifications/acknowledge-all", response_model=SuccessResponse[dict])
async def acknowledge_all(user_id: CurrentUserId, db: DbSession):
    now = datetime.now(timezone.utc)
    await _apply(db, user_id, None, {"acknowledged_at": now, "read_at": func.coalesce(Notification.read_at, now)}, (Notification.acknowledged_at.is_(None),))
    return SuccessResponse[dict](data={"ok": True})


@router.post("/notifications/clear-all", response_model=SuccessResponse[dict])
async def clear_all(user_id: CurrentUserId, db: DbSession):
    """
    Hides everything in their list. Anything that was waiting for an acknowledgement is acknowledged
    at the same moment, and the time is kept, so the team can still see it was seen.
    """
    now = datetime.now(timezone.utc)
    await _apply(
        db,
        user_id,
        None,
        {
            "cleared_at": now,
            "read_at": func.coalesce(Notification.read_at, now),
            "acknowledged_at": func.coalesce(Notification.acknowledged_at, now),
        },
    )
    return SuccessResponse[dict](data={"ok": True})


@router.post("/notifications/{notification_id}/acknowledge", response_model=SuccessResponse[dict])
async def acknowledge(notification_id: str, user_id: CurrentUserId, db: DbSession):
    row = await _one(db, user_id, notification_id)
    now = datetime.now(timezone.utc)
    await _apply(db, user_id, [row.id], {"acknowledged_at": func.coalesce(Notification.acknowledged_at, now), "read_at": func.coalesce(Notification.read_at, now)})
    return SuccessResponse[dict](data={"ok": True})


@router.post("/notifications/{notification_id}/clear", response_model=SuccessResponse[dict])
async def clear_one(notification_id: str, user_id: CurrentUserId, db: DbSession):
    """Hides one. A notification still waiting for acknowledgement cannot be cleared on its own."""
    row = await _one(db, user_id, notification_id)
    if row.requires_ack and row.acknowledged_at is None and row.resolved_at is None:
        raise ValidationError("Acknowledge this notification before clearing it.")
    await _apply(db, user_id, [row.id], {"cleared_at": datetime.now(timezone.utc)})
    return SuccessResponse[dict](data={"ok": True})


# ── Live updates ──────────────────────────────────────────────────────────────

@router.post("/ws/ticket", response_model=SuccessResponse[dict])
async def socket_ticket(user_id: CurrentUserId):
    """A one-minute, single-use ticket for opening the socket. The site's server asks for it on the person's behalf."""
    return SuccessResponse[dict](data={"ticket": create_ws_ticket(str(user_id))})


@router.websocket("/ws")
async def notifications_socket(websocket: WebSocket, ticket: str = ""):
    """
    Sends small "something changed" messages for this person. It never receives anything useful
    from the browser; incoming text is read only to notice the connection closing.
    """
    # Only the site itself may open one. Without this, any page the visitor has open could.
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.cors_origin_list:
        await websocket.close(code=1008)
        return

    try:
        user_id = redeem_ws_ticket(ticket)
    except (jwt.PyJWTError, KeyError):
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        user = await db.get(User, uuid.UUID(user_id))
        if user is None or not user.is_active:
            await websocket.close(code=1008)
            return

    await websocket.accept()
    if not hub.add(user_id, websocket):
        await websocket.close(code=1013)  # too many tabs; try again later
        return
    try:
        await websocket.send_json({"event": "hello"})
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=300)
            except asyncio.TimeoutError:
                # Every five minutes, check the account is still allowed to be here.
                async with AsyncSessionLocal() as db:
                    user = await db.get(User, uuid.UUID(user_id))
                if user is None or not user.is_active:
                    await websocket.close(code=1008)
                    return
    except WebSocketDisconnect:
        pass
    finally:
        hub.remove(user_id, websocket)
