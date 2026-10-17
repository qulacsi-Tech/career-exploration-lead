"""A College Admin's change requests and messages. Everything is scoped to their one college.

An edit is not applied here: it is validated, stored as a request, and the platform team is told.
Only an Admin or Super Admin approving it (routers/admin_requests.py) changes the live college.
"""

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from core.dependencies import CollegeAdminScope, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.collab import ChangeRequest, MessageThread
from models.user import User
from routers import admin_college_record
from schemas.common import SuccessResponse
from services import collab
from services.notify import notify, platform_admin_ids, resolve_group

router = APIRouter(prefix="/college", tags=["college"])


def _scope_college(scope: dict) -> tuple[str, str]:
    return (scope["college_slug"], scope["college_name"])


# ── Change requests ───────────────────────────────────────────────────────────

class RequestBody(BaseModel):
    kind: Literal["edit", "delete"]
    record: Optional[dict] = None
    note: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("note")
    @classmethod
    def trim_note(cls, v: Optional[str]) -> Optional[str]:
        return v.strip()[:2000] if v and v.strip() else None


@router.post("/change-requests", response_model=SuccessResponse[dict], status_code=201)
async def submit_request(body: RequestBody, scope: CollegeAdminScope, db: DbSession):
    """Sends an edit or a deletion for approval. Nothing on the live college changes."""
    row = await admin_college_record._load(db, scope["college_slug"])
    current = admin_college_record._record(row)

    payload: Optional[dict] = None
    changed = 0
    if body.kind == "edit":
        if not body.record:
            raise ValidationError("record: send the college record you want approved.")
        payload = collab.strip_record(body.record)
        # Reviews are the students', not the college's: whatever was sent, they stay as they are.
        payload["reviews"] = current["reviews"]
        admin_college_record._check(admin_college_record._parse(payload))
        changed = len(collab.diff_records(collab.strip_record(current), payload))
        if changed == 0:
            raise ValidationError("You have not changed anything.")
    elif not body.note or len(body.note) < 5:
        raise ValidationError("note: tell us why you want the college removed.")

    user = await db.get(User, uuid.UUID(scope["sub"]))
    request = ChangeRequest(
        id=uuid.uuid4(),
        college_id=scope["college_id"],
        requested_by=user.id,
        requested_by_name=user.name,
        kind=body.kind,
        payload=payload,
        note=body.note,
        base_updated_at=current["updatedAt"],
        status="pending",
    )
    db.add(request)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise ConflictError("REQUEST_PENDING", "You already have a request waiting for review. Withdraw it first to send a new one.") from exc

    what = "an edit" if body.kind == "edit" else "a request to remove the college"
    await notify(
        db,
        await platform_admin_ids(db),
        kind="request.submitted",
        title=f"{scope['college_name']} submitted {what} for approval",
        body=(f"{changed} field{'s' if changed != 1 else ''} changed" if body.kind == "edit" else body.note[:200]),
        link=f"/admin/approvals/{request.id}",
        requires_ack=True,
        group_key=f"cr:{request.id}",
        commit=False,
    )
    await db.commit()
    return SuccessResponse[dict](data=collab.request_json(request, _scope_college(scope)))


@router.get("/change-requests", response_model=SuccessResponse[list[dict]])
async def my_requests(scope: CollegeAdminScope, db: DbSession):
    rows = (await db.execute(
        select(ChangeRequest).where(ChangeRequest.college_id == scope["college_id"]).order_by(ChangeRequest.created_at.desc()).limit(100)
    )).scalars().all()
    return SuccessResponse[list[dict]](data=[collab.request_json(r, _scope_college(scope)) for r in rows])


@router.post("/change-requests/{request_id}/withdraw", response_model=SuccessResponse[dict])
async def withdraw_request(request_id: str, scope: CollegeAdminScope, db: DbSession):
    try:
        rid = uuid.UUID(request_id)
    except ValueError as exc:
        raise ValidationError("id: not a valid id.") from exc
    row = (await db.execute(
        select(ChangeRequest).where(ChangeRequest.id == rid, ChangeRequest.college_id == scope["college_id"])
    )).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Request")
    if row.status != "pending":
        raise ConflictError("ALREADY_DECIDED", f"This request has already been {row.status}.")

    row.status = "withdrawn"
    row.decided_at = datetime.now(timezone.utc)
    # Everyone on the platform side who was asked to review it is told it is no longer waiting.
    await resolve_group(db, f"cr:{row.id}", by_user_id=uuid.UUID(scope["sub"]), by_name=f"{scope['name']} (withdrawn)", commit=False)
    await db.commit()
    return SuccessResponse[dict](data=collab.request_json(row, _scope_college(scope)))


# ── Messages ──────────────────────────────────────────────────────────────────

class NewThreadBody(BaseModel):
    subject: str
    body: str
    changeRequestId: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 200:
            raise ValueError("The subject must be between 3 and 200 characters.")
        return v

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 4000:
            raise ValueError("A message must be between 2 and 4000 characters.")
        return v


class MessageBody(BaseModel):
    body: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 4000:
            raise ValueError("A message must be between 2 and 4000 characters.")
        return v


async def _own_thread(scope: dict, db, thread_id: str) -> MessageThread:
    try:
        tid = uuid.UUID(thread_id)
    except ValueError as exc:
        raise ValidationError("id: not a valid id.") from exc
    thread = (await db.execute(
        select(MessageThread)
        .where(MessageThread.id == tid, MessageThread.college_id == scope["college_id"])
        .options(selectinload(MessageThread.messages))
    )).scalar_one_or_none()
    if thread is None:
        raise NotFoundError("Thread")
    return thread


@router.get("/threads", response_model=SuccessResponse[list[dict]])
async def my_threads(scope: CollegeAdminScope, db: DbSession):
    rows = (await db.execute(
        select(MessageThread)
        .where(MessageThread.college_id == scope["college_id"])
        .options(selectinload(MessageThread.messages))
        .order_by(MessageThread.updated_at.desc())
        .limit(100)
    )).scalars().all()
    return SuccessResponse[list[dict]](data=[collab.thread_json(t, _scope_college(scope)) for t in rows])


@router.post("/threads", response_model=SuccessResponse[dict], status_code=201)
async def start_thread(body: NewThreadBody, scope: CollegeAdminScope, db: DbSession):
    """Writes to the platform team. It goes to every Admin and Super Admin as a shared inbox."""
    request_id: Optional[uuid.UUID] = None
    if body.changeRequestId:
        try:
            request_id = uuid.UUID(body.changeRequestId)
        except ValueError as exc:
            raise ValidationError("changeRequestId: not a valid id.") from exc
        owned = (await db.execute(
            select(ChangeRequest.id).where(ChangeRequest.id == request_id, ChangeRequest.college_id == scope["college_id"])
        )).first()
        if not owned:
            raise NotFoundError("Request")

    user = await db.get(User, uuid.UUID(scope["sub"]))
    thread = MessageThread(
        id=uuid.uuid4(),
        college_id=scope["college_id"],
        change_request_id=request_id,
        subject=body.subject,
        created_by=user.id,
    )
    db.add(thread)
    await db.flush()
    await collab.add_message(db, thread, sender=user, side="college", body=body.body, college_name=scope["college_name"])
    await db.commit()
    thread = await _own_thread(scope, db, str(thread.id))
    return SuccessResponse[dict](data=collab.thread_json(thread, _scope_college(scope), with_messages=True))


@router.get("/threads/{thread_id}", response_model=SuccessResponse[dict])
async def get_thread(thread_id: str, scope: CollegeAdminScope, db: DbSession):
    thread = await _own_thread(scope, db, thread_id)
    return SuccessResponse[dict](data=collab.thread_json(thread, _scope_college(scope), with_messages=True))


@router.post("/threads/{thread_id}/messages", response_model=SuccessResponse[dict], status_code=201)
async def reply_in_thread(thread_id: str, body: MessageBody, scope: CollegeAdminScope, db: DbSession):
    thread = await _own_thread(scope, db, thread_id)
    user = await db.get(User, uuid.UUID(scope["sub"]))
    await collab.add_message(db, thread, sender=user, side="college", body=body.body, college_name=scope["college_name"])
    await db.commit()
    thread = await _own_thread(scope, db, thread_id)
    return SuccessResponse[dict](data=collab.thread_json(thread, _scope_college(scope), with_messages=True))
