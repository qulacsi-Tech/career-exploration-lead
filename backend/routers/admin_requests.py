"""The platform team's side: reviewing college admins' change requests, and answering their messages.
Admin or Super Admin.

Approving is the only thing that writes a college admin's edit to the live college, and it does so
with the same validation and the same save as the platform editor. The decision is claimed with one
conditional update, so two people pressing Approve at once cannot both succeed.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import selectinload

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.college import College
from models.collab import ChangeRequest, MessageThread
from models.user import User
from routers import admin_college_record
from schemas.common import ListResponse, Meta, SuccessResponse
from services import collab
from services.notify import notify, resolve_group

router = APIRouter(prefix="/admin", tags=["admin"])


def _uid(value: str, what: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise ValidationError(f"{what}: not a valid id.") from exc


# ── Change requests ───────────────────────────────────────────────────────────

@router.get("/change-requests", response_model=ListResponse[dict])
async def list_requests(
    _admin: AdminPayload,
    db: DbSession,
    status: str = Query("pending", pattern="^(pending|decided|all)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    conds = []
    if status == "pending":
        conds.append(ChangeRequest.status == "pending")
    elif status == "decided":
        conds.append(ChangeRequest.status != "pending")

    total = (await db.execute(select(func.count()).select_from(ChangeRequest).where(*conds))).scalar_one()
    rows = (await db.execute(
        select(ChangeRequest).where(*conds).order_by(
            # Waiting ones oldest first, so nothing sits at the bottom; decided ones newest first.
            (ChangeRequest.status != "pending"), ChangeRequest.created_at.asc() if status == "pending" else ChangeRequest.created_at.desc()
        ).offset((page - 1) * limit).limit(limit)
    )).scalars().all()
    colleges = await collab.college_map(db, {r.college_id for r in rows})
    pages = max(1, -(-total // limit))
    return ListResponse[dict](
        meta=Meta(total=total, page=page, limit=limit, pages=pages),
        data=[collab.request_json(r, colleges.get(r.college_id)) for r in rows],
    )


async def _request(db, request_id: str) -> ChangeRequest:
    row = await db.get(ChangeRequest, _uid(request_id))
    if row is None:
        raise NotFoundError("Request")
    return row


@router.get("/change-requests/{request_id}", response_model=SuccessResponse[dict])
async def get_request(request_id: str, _admin: AdminPayload, db: DbSession):
    """The request, with a field-by-field comparison against the college as it is now."""
    cr = await _request(db, request_id)
    college = await db.get(College, cr.college_id)
    data = collab.request_json(cr, (college.slug, college.name) if college else None)

    diff: list[dict] = []
    stale = False
    if cr.kind == "edit" and college is not None:
        current = admin_college_record._record(await admin_college_record._load(db, college.slug))
        diff = collab.diff_records(collab.strip_record(current), cr.payload or {})
        # Someone saved the college after the college admin began: approving would overwrite that.
        stale = cr.status == "pending" and current["updatedAt"] != cr.base_updated_at

    thread_id = (await db.execute(
        select(MessageThread.id).where(MessageThread.change_request_id == cr.id).order_by(MessageThread.created_at).limit(1)
    )).scalar_one_or_none()
    return SuccessResponse[dict](data={**data, "diff": diff, "stale": stale, "threadId": str(thread_id) if thread_id else None})


class ApproveBody(BaseModel):
    # Required when the live college changed after the college admin started.
    acknowledgeStale: bool = False
    model_config = ConfigDict(populate_by_name=True)


class RejectBody(BaseModel):
    note: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("note")
    @classmethod
    def validate_note(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 2000:
            raise ValueError("Say why in 3 to 2000 characters.")
        return v


async def _claim(db, cr: ChangeRequest, admin: dict, status: str, note: Optional[str]) -> None:
    """Takes the decision, or says who already did. Nothing is committed here."""
    # Read what is needed before anything can be rolled back: a rollback expires every loaded object,
    # and reading an expired attribute in async code is an error, not a quiet reload.
    request_id = cr.id
    reviewer_id = uuid.UUID(admin["sub"])
    reviewer_name = (await db.get(User, reviewer_id)).name

    result = await db.execute(
        update(ChangeRequest)
        .where(ChangeRequest.id == request_id, ChangeRequest.status == "pending")
        .values(
            status=status,
            reviewed_by=reviewer_id,
            reviewed_by_name=reviewer_name,
            review_note=note,
            decided_at=datetime.now(timezone.utc),
        )
    )
    if result.rowcount == 0:
        await db.rollback()
        latest = await db.get(ChangeRequest, request_id)
        by = f" by {latest.reviewed_by_name}" if latest.reviewed_by_name else ""
        raise ConflictError("ALREADY_DECIDED", f"Already {latest.status}{by}.")


async def _tell_college(db, cr: ChangeRequest, college_name: str, outcome: str, note: Optional[str]) -> None:
    await notify(
        db,
        await collab.college_admin_ids_of(db, cr.college_id),
        kind=f"request.{outcome}",
        title=f"Your {'edit' if cr.kind == 'edit' else 'removal request'} was {outcome}",
        body=note[:200] if note else None,
        link="/admin/requests",
        requires_ack=True,
        group_key=f"cr-college:{cr.id}",
        commit=False,
    )


@router.post("/change-requests/{request_id}/approve", response_model=SuccessResponse[dict])
async def approve_request(request_id: str, body: ApproveBody, admin: AdminPayload, db: DbSession):
    cr = await _request(db, request_id)
    if cr.status != "pending":
        raise ConflictError("ALREADY_DECIDED", f"Already {cr.status}{' by ' + cr.reviewed_by_name if cr.reviewed_by_name else ''}.")
    college = await db.get(College, cr.college_id)
    if college is None:
        raise NotFoundError("College")
    slug, name = college.slug, college.name

    if cr.kind == "edit":
        live = admin_college_record._record(await admin_college_record._load(db, slug))
        if live["updatedAt"] != cr.base_updated_at and not body.acknowledgeStale:
            raise ConflictError("STALE", "The college was changed after this edit was written. Review the comparison and approve again to overwrite those changes.")
        # Reviews are the students', and may have moved on since the request was sent.
        proposed = {**(cr.payload or {}), "reviews": live["reviews"]}

    await _claim(db, cr, admin, "approved", None)
    reviewer = await db.get(User, uuid.UUID(admin["sub"]))

    try:
        if cr.kind == "edit":
            # The platform editor's own save: same checks, and it commits the claim with the change.
            await admin_college_record.save_record(slug=slug, _admin=admin, db=db, body=proposed)
        else:
            await db.execute(delete(College).where(College.id == cr.college_id))
    except Exception:
        # Nothing was committed, so the request goes back to waiting, with the reason in the error.
        await db.rollback()
        raise

    if cr.kind == "delete":
        await db.commit()
    await _tell_college_after(db, cr, name, "approved", None, reviewer)
    return SuccessResponse[dict](data={"status": "approved", "kind": cr.kind, "collegeSlug": slug})


async def _tell_college_after(db, cr: ChangeRequest, college_name: str, outcome: str, note: Optional[str], reviewer: User) -> None:
    """After the decision is committed: tell the college admin, and everyone else on the team it is handled."""
    if cr.kind == "delete" and outcome == "approved":
        # The college and its admin account's link are gone; there is nobody left to tell.
        await resolve_group(db, f"cr:{cr.id}", by_user_id=reviewer.id, by_name=reviewer.name)
        return
    await _tell_college(db, cr, college_name, outcome, note)
    await resolve_group(db, f"cr:{cr.id}", by_user_id=reviewer.id, by_name=reviewer.name, commit=False)
    await db.commit()


@router.post("/change-requests/{request_id}/reject", response_model=SuccessResponse[dict])
async def reject_request(request_id: str, body: RejectBody, admin: AdminPayload, db: DbSession):
    cr = await _request(db, request_id)
    college = await db.get(College, cr.college_id)
    name = college.name if college else "the college"
    await _claim(db, cr, admin, "rejected", body.note)
    reviewer = await db.get(User, uuid.UUID(admin["sub"]))

    # The reason also goes into a conversation about this request, so the college admin can answer it.
    thread = (await db.execute(
        select(MessageThread).where(MessageThread.change_request_id == cr.id).options(selectinload(MessageThread.messages)).limit(1)
    )).scalar_one_or_none()
    if thread is None:
        thread = MessageThread(
            id=uuid.uuid4(), college_id=cr.college_id, change_request_id=cr.id,
            subject=f"Your {'edit' if cr.kind == 'edit' else 'removal request'} was rejected", created_by=reviewer.id,
        )
        db.add(thread)
        await db.flush()
        thread.messages = []
    await collab.add_message(db, thread, sender=reviewer, side="platform", body=body.note, college_name=name, notify_others=False)
    await db.commit()
    await _tell_college_after(db, cr, name, "rejected", body.note, reviewer)
    return SuccessResponse[dict](data={"status": "rejected"})


# ── Messages ──────────────────────────────────────────────────────────────────

class ReplyBody(BaseModel):
    body: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 4000:
            raise ValueError("A message must be between 2 and 4000 characters.")
        return v


async def _thread(db, thread_id: str) -> MessageThread:
    row = (await db.execute(
        select(MessageThread).where(MessageThread.id == _uid(thread_id)).options(selectinload(MessageThread.messages))
    )).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Thread")
    return row


@router.get("/threads", response_model=ListResponse[dict])
async def list_threads(
    _admin: AdminPayload,
    db: DbSession,
    status: str = Query("open", pattern="^(open|resolved|all)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    conds = [] if status == "all" else [MessageThread.status == status]
    total = (await db.execute(select(func.count()).select_from(MessageThread).where(*conds))).scalar_one()
    rows = (await db.execute(
        select(MessageThread).where(*conds).options(selectinload(MessageThread.messages))
        .order_by(MessageThread.updated_at.desc()).offset((page - 1) * limit).limit(limit)
    )).scalars().all()
    colleges = await collab.college_map(db, {t.college_id for t in rows})
    pages = max(1, -(-total // limit))
    return ListResponse[dict](
        meta=Meta(total=total, page=page, limit=limit, pages=pages),
        data=[collab.thread_json(t, colleges.get(t.college_id)) for t in rows],
    )


@router.get("/threads/{thread_id}", response_model=SuccessResponse[dict])
async def get_thread(thread_id: str, _admin: AdminPayload, db: DbSession):
    thread = await _thread(db, thread_id)
    colleges = await collab.college_map(db, {thread.college_id})
    return SuccessResponse[dict](data=collab.thread_json(thread, colleges.get(thread.college_id), with_messages=True))


@router.post("/threads/{thread_id}/messages", response_model=SuccessResponse[dict], status_code=201)
async def reply(thread_id: str, body: ReplyBody, admin: AdminPayload, db: DbSession):
    """A reply resolves the thread for the whole team, and tells the college admin."""
    thread = await _thread(db, thread_id)
    colleges = await collab.college_map(db, {thread.college_id})
    college = colleges.get(thread.college_id)
    sender = await db.get(User, uuid.UUID(admin["sub"]))
    await collab.add_message(db, thread, sender=sender, side="platform", body=body.body, college_name=college[1] if college else "")
    await db.commit()
    thread = await _thread(db, thread_id)
    return SuccessResponse[dict](data=collab.thread_json(thread, college, with_messages=True))


@router.post("/threads/{thread_id}/resolve", response_model=SuccessResponse[dict])
async def resolve(thread_id: str, admin: AdminPayload, db: DbSession):
    """Marks it handled without writing back, when nothing needs saying."""
    thread = await _thread(db, thread_id)
    by = await db.get(User, uuid.UUID(admin["sub"]))
    await collab.resolve_thread(db, thread, by=by)
    await db.commit()
    colleges = await collab.college_map(db, {thread.college_id})
    return SuccessResponse[dict](data=collab.thread_json(await _thread(db, thread_id), colleges.get(thread.college_id), with_messages=True))
