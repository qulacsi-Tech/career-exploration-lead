"""Creating notifications, and telling connected browsers that something changed.

Every part of the backend that wants to tell someone something calls `notify`. It writes the rows
and, in the same transaction, issues a Postgres NOTIFY. Postgres delivers that to every backend
worker once the transaction commits (and never for a rollback), and each worker passes it on to
the sockets it holds (see services/realtime.py). The socket only says "something changed"; the
page then reads the real rows, so a missed event costs a delay and never a lost notification.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Iterable, Optional

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification
from models.user import ADMIN_ROLES, User, UserRole

CHANNEL = "tcp_events"


async def announce(db: AsyncSession, user_ids: Iterable[uuid.UUID], event: str, notification_id: Optional[uuid.UUID] = None) -> None:
    """NOTIFY, inside the caller's transaction, one message per person."""
    for user_id in set(user_ids):
        payload = json.dumps({"user": str(user_id), "event": event, "id": str(notification_id) if notification_id else None})
        await db.execute(text("SELECT pg_notify(:channel, :payload)"), {"channel": CHANNEL, "payload": payload})


async def platform_admin_ids(db: AsyncSession) -> list[uuid.UUID]:
    """Everyone on the platform team who can currently sign in."""
    rows = await db.execute(select(User.id).where(User.role.in_(ADMIN_ROLES), User.is_active.is_(True)))
    return list(rows.scalars().all())


async def super_admin_ids(db: AsyncSession) -> list[uuid.UUID]:
    rows = await db.execute(select(User.id).where(User.role == UserRole.SUPER_ADMIN, User.is_active.is_(True)))
    return list(rows.scalars().all())


async def college_admin_id(db: AsyncSession, college_slug: str) -> Optional[uuid.UUID]:
    """The active college admin of a college, if it has one."""
    from models.college import College

    row = await db.execute(
        select(User.id)
        .join(College, College.id == User.college_id)
        .where(College.slug == college_slug, User.role == UserRole.COLLEGE_ADMIN, User.is_active.is_(True))
    )
    return row.scalar_one_or_none()


async def notify(
    db: AsyncSession,
    recipients: Iterable[uuid.UUID],
    *,
    kind: str,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
    requires_ack: bool = False,
    group_key: Optional[str] = None,
    exclude: Optional[uuid.UUID] = None,
    commit: bool = True,
) -> list[Notification]:
    """
    Gives each recipient one notification. `exclude` leaves out the person who caused it.
    Recipients are always decided by the server, never taken from a request.
    """
    people = [r for r in dict.fromkeys(recipients) if r != exclude]
    rows = [
        Notification(
            id=uuid.uuid4(),
            recipient_id=r,
            kind=kind,
            title=title[:200],
            body=body,
            link=link,
            requires_ack=requires_ack,
            group_key=group_key,
        )
        for r in people
    ]
    if not rows:
        return []
    db.add_all(rows)
    await db.flush()
    for row in rows:
        await announce(db, [row.recipient_id], "notification.created", row.id)
    if commit:
        await db.commit()
    return rows


async def resolve_group(db: AsyncSession, group_key: str, *, by_user_id: uuid.UUID, by_name: str, commit: bool = True) -> None:
    """
    Someone has dealt with the thing a group of notifications is about. For everyone else in the
    group they become "Handled by <name>" and stop asking for acknowledgement.
    """
    others = (await db.execute(
        select(Notification.id, Notification.recipient_id).where(
            Notification.group_key == group_key,
            Notification.resolved_at.is_(None),
            Notification.recipient_id != by_user_id,
        )
    )).all()
    if not others:
        return
    await db.execute(
        update(Notification)
        .where(Notification.id.in_([n for n, _ in others]))
        .values(resolved_by_name=by_name[:200], resolved_at=datetime.now(timezone.utc), requires_ack=False)
    )
    for notification_id, recipient in others:
        await announce(db, [recipient], "notification.updated", notification_id)
    if commit:
        await db.commit()
