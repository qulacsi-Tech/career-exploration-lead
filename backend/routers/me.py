from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict

from core.dependencies import CurrentUserId, DbSession
from models.tracking import Event
from repositories.lead import LeadRepository
from repositories.user import UserRepository
from schemas.auth import ProfileSchema, ProfileUpdateSchema
from schemas.common import SuccessResponse
from services.auth import AuthService

router = APIRouter(prefix="/me", tags=["me"])


class ReplySchema(BaseModel):
    id: str
    authorName: str
    body: str
    createdAt: Optional[str]
    read: bool
    model_config = ConfigDict(populate_by_name=True)


class MyLeadSchema(BaseModel):
    id: str
    type: str
    status: str
    collegeSlug: Optional[str]
    programName: Optional[str]
    stream: Optional[str]
    city: Optional[str]
    message: Optional[str]
    source: Optional[str]
    createdAt: Optional[str]
    replies: list[ReplySchema]
    model_config = ConfigDict(populate_by_name=True)


class ActivitySchema(BaseModel):
    kind: str  # account_created | login | enquiry_sent | reply_received | page_view | click
    title: str
    detail: Optional[str] = None
    href: Optional[str] = None
    at: Optional[str]
    model_config = ConfigDict(populate_by_name=True)


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _pretty(slug: str) -> str:
    return " ".join(word.capitalize() for word in slug.split("-") if word)


def _value(enum_or_str) -> str:
    return enum_or_str.value if hasattr(enum_or_str, "value") else str(enum_or_str)


@router.get("", response_model=SuccessResponse[ProfileSchema])
async def get_me(user_id: CurrentUserId, db: DbSession):
    return SuccessResponse[ProfileSchema](data=await AuthService(db).get_profile(user_id))


@router.patch("", response_model=SuccessResponse[ProfileSchema])
async def update_me(data: ProfileUpdateSchema, user_id: CurrentUserId, db: DbSession):
    return SuccessResponse[ProfileSchema](data=await AuthService(db).update_profile(user_id, data))


@router.get("/leads", response_model=SuccessResponse[list[MyLeadSchema]])
async def my_leads(user_id: CurrentUserId, db: DbSession):
    """The student's own enquiries, newest first, each with the team's replies."""
    leads = await LeadRepository(db).list_for_user(user_id)
    return SuccessResponse[list[MyLeadSchema]](data=[
        MyLeadSchema(
            id=str(lead.id),
            type=_value(lead.type),
            status=_value(lead.status),
            collegeSlug=lead.college_slug,
            programName=lead.program_name,
            stream=lead.stream,
            city=lead.city,
            message=lead.message,
            source=lead.source,
            createdAt=_iso(lead.created_at),
            replies=[
                ReplySchema(
                    id=str(r.id),
                    authorName=r.author_name,
                    body=r.body,
                    createdAt=_iso(r.created_at),
                    read=r.read_at is not None,
                )
                for r in lead.replies
            ],
        )
        for lead in leads
    ])


@router.post("/replies/read", response_model=SuccessResponse[dict])
async def mark_replies_read(user_id: CurrentUserId, db: DbSession):
    """Called when the student opens their Replies tab."""
    await LeadRepository(db).mark_replies_read(user_id)
    return SuccessResponse[dict](data={"ok": True})


@router.get("/activity", response_model=SuccessResponse[list[ActivitySchema]])
async def my_activity(user_id: CurrentUserId, db: DbSession):
    """What the student has done on the site, newest first, built from the records we hold."""
    user = await UserRepository(db).find_by_id(user_id)
    leads = await LeadRepository(db).list_for_user(user_id)

    items: list[ActivitySchema] = []
    if user:
        provider = "Google" if user.auth_provider == "google" else "email"
        items.append(ActivitySchema(kind="account_created", title="Account created", detail=f"Signed up with {provider}.", at=_iso(user.created_at)))
        if user.last_login_at and user.last_login_at != user.created_at:
            items.append(ActivitySchema(kind="login", title="Last signed in", at=_iso(user.last_login_at)))
    for lead in leads:
        subject = lead.program_name or lead.college_slug or "TopCollegePath"
        items.append(ActivitySchema(
            kind="enquiry_sent",
            title=f"Sent an enquiry about {subject}",
            detail=lead.message,
            href=f"/college/{lead.college_slug}" if lead.college_slug else None,
            at=_iso(lead.created_at),
        ))
        for reply in lead.replies:
            items.append(ActivitySchema(
                kind="reply_received",
                title=f"{reply.author_name} replied",
                detail=reply.body,
                href="/account/replies",
                at=_iso(reply.created_at),
            ))

    # What they looked at and clicked, once they agreed to analytics. Pages about a college, exam or
    # programme and clicks on tracked buttons only; ordinary navigation would drown the rest.
    events = (await db.execute(
        select(Event)
        .where(Event.user_id == user_id, Event.name.in_(("page_view", "click_cta")))
        .order_by(Event.occurred_at.desc())
        .limit(200)
    )).scalars().all()
    last_page = None
    shown = 0
    for event in events:
        if shown >= 60:
            break
        if event.name == "page_view":
            slug = event.college_slug or event.exam_slug or event.program_slug
            if not slug or event.path == last_page:
                continue
            last_page = event.path
            kind = "College" if event.college_slug else "Exam" if event.exam_slug else "Programme"
            items.append(ActivitySchema(
                kind="page_view",
                title=f"Viewed {kind.lower()}: {_pretty(slug)}",
                href=event.path,
                at=_iso(event.occurred_at),
            ))
        else:
            props = event.properties or {}
            label = (props.get("label") or props.get("cta") or "a button")
            items.append(ActivitySchema(
                kind="click",
                title=f"Clicked “{str(label)[:60]}”",
                href=event.path,
                at=_iso(event.occurred_at),
            ))
        shown += 1

    items.sort(key=lambda i: i.at or "", reverse=True)
    return SuccessResponse[list[ActivitySchema]](data=items)
