"""Change requests and message threads between college admins and the platform team.

Shared by the two sides' routers (routers/college_requests.py and routers/admin_requests.py), so
the rules live in one place: what a diff is, how a thread changes state, and who is told.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.college import College
from models.collab import ChangeRequest, MessageThread, ThreadMessage
from models.user import User, UserRole
from services.notify import notify, platform_admin_ids, resolve_group

# Parts of a record that are not the college admin's to propose changes to.
STRIPPED_KEYS = ("slug", "updatedAt")


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


# ── Diffs ─────────────────────────────────────────────────────────────────────

def strip_record(record: dict) -> dict:
    return {k: v for k, v in record.items() if k not in STRIPPED_KEYS}


def diff_records(old: dict, new: dict) -> list[dict]:
    """
    What differs between the live college and the proposal, field by field.

    Objects are compared key by key, so a change to one detail field is reported as that field. Lists
    (courses, placements, cut-offs, gallery) are compared whole: they are rewritten as a set when saved.
    """
    out: list[dict] = []

    def walk(path: str, before: Any, after: Any) -> None:
        if isinstance(before, dict) and isinstance(after, dict):
            for key in sorted(set(before) | set(after)):
                walk(f"{path}.{key}" if path else key, before.get(key), after.get(key))
        elif before != after:
            out.append({"path": path, "before": before, "after": after})

    walk("", old, new)
    return out


# ── Serialising ───────────────────────────────────────────────────────────────

async def college_map(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, tuple[str, str]]:
    if not ids:
        return {}
    rows = (await db.execute(select(College.id, College.slug, College.name).where(College.id.in_(ids)))).all()
    return {cid: (slug, name) for cid, slug, name in rows}


def request_json(cr: ChangeRequest, college: Optional[tuple[str, str]] = None) -> dict:
    return {
        "id": str(cr.id),
        "kind": cr.kind,
        "status": cr.status,
        "note": cr.note,
        "requestedBy": cr.requested_by_name,
        "reviewedBy": cr.reviewed_by_name,
        "reviewNote": cr.review_note,
        "createdAt": _iso(cr.created_at),
        "decidedAt": _iso(cr.decided_at),
        "collegeSlug": college[0] if college else None,
        "collegeName": college[1] if college else None,
    }


def thread_json(thread: MessageThread, college: Optional[tuple[str, str]] = None, *, with_messages: bool = False) -> dict:
    last = thread.messages[-1] if thread.messages else None
    data = {
        "id": str(thread.id),
        "subject": thread.subject,
        "status": thread.status,
        "resolvedBy": thread.resolved_by_name,
        "resolvedAt": _iso(thread.resolved_at),
        "changeRequestId": str(thread.change_request_id) if thread.change_request_id else None,
        "collegeSlug": college[0] if college else None,
        "collegeName": college[1] if college else None,
        "createdAt": _iso(thread.created_at),
        "updatedAt": _iso(thread.updated_at),
        "messageCount": len(thread.messages),
        "last": {"side": last.side, "sender": last.sender_name, "body": last.body[:140], "at": _iso(last.created_at)} if last else None,
    }
    if with_messages:
        data["messages"] = [
            {"id": str(m.id), "sender": m.sender_name, "side": m.side, "body": m.body, "at": _iso(m.created_at)}
            for m in thread.messages
        ]
    return data


# ── Threads ───────────────────────────────────────────────────────────────────

async def college_admin_ids_of(db: AsyncSession, college_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await db.execute(
        select(User.id).where(User.college_id == college_id, User.role == UserRole.COLLEGE_ADMIN, User.is_active.is_(True))
    )
    return list(rows.scalars().all())


async def add_message(
    db: AsyncSession,
    thread: MessageThread,
    *,
    sender: User,
    side: str,
    body: str,
    college_name: str,
    notify_others: bool = True,
) -> ThreadMessage:
    """
    Adds a message and moves the thread to where it now belongs.

    A college admin writing opens the thread (or reopens a resolved one) and tells the whole platform
    team. A platform admin replying resolves it for the team: everyone else's notification becomes
    "Handled by <name>", and the college admin is told. Resolved means "answered", not "locked": either
    side can keep writing.
    """
    now = datetime.now(timezone.utc)
    message = ThreadMessage(id=uuid.uuid4(), thread_id=thread.id, sender_id=sender.id, sender_name=sender.name, side=side, body=body)
    db.add(message)
    thread.updated_at = now
    group = f"th:{thread.id}"

    if side == "college":
        thread.status = "open"
        thread.resolved_by_name = None
        thread.resolved_at = None
        await db.flush()
        if notify_others:
            await notify(
                db,
                await platform_admin_ids(db),
                kind="thread.message",
                title=f"Message from {college_name}",
                body=f"{thread.subject}: {body[:160]}",
                link=f"/admin/messages?thread={thread.id}",
                requires_ack=True,
                group_key=group,
                commit=False,
            )
    else:
        thread.status = "resolved"
        thread.resolved_by_name = sender.name
        thread.resolved_at = now
        await db.flush()
        await resolve_group(db, group, by_user_id=sender.id, by_name=sender.name, commit=False)
        if notify_others:
            await notify(
                db,
                await college_admin_ids_of(db, thread.college_id),
                kind="thread.reply",
                title=f"{sender.name} replied: {thread.subject}",
                body=body[:200],
                link=f"/admin/messages?thread={thread.id}",
                requires_ack=True,
                group_key=f"th-college:{thread.id}",
                commit=False,
            )
    return message


async def resolve_thread(db: AsyncSession, thread: MessageThread, *, by: User) -> None:
    """Closes it for the team without a reply, e.g. when nothing needs saying."""
    thread.status = "resolved"
    thread.resolved_by_name = by.name
    thread.resolved_at = datetime.now(timezone.utc)
    thread.updated_at = thread.resolved_at
    await resolve_group(db, f"th:{thread.id}", by_user_id=by.id, by_name=by.name, commit=False)
