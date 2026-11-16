"""Exam communities: starting one, joining, posting, replying, reacting, and the platform team's moderation.

The rules:
  - One community per exam. The first signed-in student who asks for it starts it and is its first member.
  - Members post: a discussion, a question, a suggestion, a banner (with an image) or an achievement.
  - Any signed-in student can reply and react. A student who has not joined can still read and reply.
  - A visitor who is not signed in sees the first GUEST_POSTS posts (and a few replies on each); the rest needs an
    account. The cut is made here, so the page cannot be asked for more.
  - The platform team sees everything in the admin. It can hide or delete a post or reply, restrict a whole
    community (hidden from the site, kept in the admin), and flag or block a student. A blocked student can read
    but cannot start a community, join, post, reply or react.
  - Admin accounts do not take part on the site; they moderate from the admin.
"""

import io
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, File, Query, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import and_, delete, func, or_, select

from core.config import settings
from core.dependencies import AdminPayload, CurrentUserId, DbSession, OptionalUserId
from core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from models.community import (
    Community,
    CommunityMember,
    CommunityPost,
    CommunityReaction,
    CommunityReply,
    CommunityUserStatus,
)
from models.exam import Exam
from models.user import PANEL_ROLES, User
from schemas.common import SuccessResponse

router = APIRouter(tags=["community"])

# What a visitor who is not signed in can read before the sign-in prompt.
GUEST_POSTS = 5
GUEST_REPLIES = 2
PAGE_SIZE = 10
MAX_REPLIES = 100

POST_KINDS = ("discussion", "question", "suggestion", "banner", "achievement")
REACTIONS = ("like", "love", "celebrate", "insightful")

# Enough for anyone taking part in earnest; stops a flood.
POSTS_PER_DAY = 15
REPLIES_PER_DAY = 100

UPLOAD_MAX_BYTES = 4 * 1024 * 1024
UPLOAD_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
UPLOAD_MIN = (300, 150)


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _display_name(name: Optional[str]) -> str:
    """ "Riya Sharma" is shown as "Riya S.": enough to recognise someone, without their full name."""
    parts = (name or "").strip().split()
    if not parts:
        return "A student"
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0].upper()}."


def _uuid(value: str, entity: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise NotFoundError(entity) from None


async def _status_of(db, user_id) -> Optional[CommunityUserStatus]:
    return await db.get(CommunityUserStatus, user_id) if user_id else None


async def _participant(db, user_id) -> User:
    """The signed-in student, if they may take part. Blocked students and admin accounts may not."""
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotFoundError("Account")
    if user.role in PANEL_ROLES:
        raise ForbiddenError("Admin accounts cannot post in communities. Use a student account, or moderate from the admin.")
    status = await _status_of(db, user_id)
    if status and status.is_blocked:
        raise ForbiddenError("Your account has been restricted from taking part in communities. You can still read them.")
    return user


async def _exam_by_slug(db, slug: str) -> Exam:
    exam = (await db.execute(select(Exam).where(Exam.slug == slug, Exam.archived.is_(False)))).scalar_one_or_none()
    if exam is None:
        raise NotFoundError("Exam")
    return exam


async def _open_community(db, community_id: str) -> Community:
    community = await db.get(Community, _uuid(community_id, "Community"))
    if community is None or community.is_restricted:
        raise NotFoundError("Community")
    return community


async def _visible_post(db, post_id: str) -> tuple[CommunityPost, Community]:
    post = await db.get(CommunityPost, _uuid(post_id, "Post"))
    if post is None or post.is_hidden:
        raise NotFoundError("Post")
    community = await db.get(Community, post.community_id)
    if community is None or community.is_restricted:
        raise NotFoundError("Post")
    return post, community


async def _counts(db, community_ids: list) -> tuple[dict, dict]:
    if not community_ids:
        return {}, {}
    members = dict(
        (await db.execute(select(CommunityMember.community_id, func.count()).where(CommunityMember.community_id.in_(community_ids)).group_by(CommunityMember.community_id))).all()
    )
    posts = dict(
        (
            await db.execute(
                select(CommunityPost.community_id, func.count())
                .where(CommunityPost.community_id.in_(community_ids), CommunityPost.is_hidden.is_(False))
                .group_by(CommunityPost.community_id)
            )
        ).all()
    )
    return members, posts


async def _within_limit(db, model, user_id, limit: int, what: str) -> None:
    since = datetime.now(timezone.utc) - timedelta(days=1)
    count = (await db.execute(select(func.count()).select_from(model).where(model.user_id == user_id, model.created_at >= since))).scalar_one()
    if count >= limit:
        raise ValidationError(f"You have reached today's limit of {limit} {what}. Please try again tomorrow.")


# ── Reading ─────────────────────────────────────────────────────────────────


@router.get("/communities", response_model=SuccessResponse[list])
async def list_communities(db: DbSession):
    """Every open community, by exam, with its member and post counts. The exams listing reads this."""
    rows = (
        await db.execute(
            select(Community, Exam.slug, Exam.name)
            .join(Exam, Exam.id == Community.exam_id)
            .where(Community.is_restricted.is_(False), Exam.archived.is_(False))
        )
    ).all()
    members, posts = await _counts(db, [c.id for c, _, _ in rows])
    return SuccessResponse[list](
        data=[
            {
                "id": str(c.id),
                "examSlug": slug,
                "examName": name,
                "members": int(members.get(c.id, 0)),
                "posts": int(posts.get(c.id, 0)),
                "createdAt": _iso(c.created_at),
            }
            for c, slug, name in rows
        ]
    )


@router.get("/exams/{slug}/community", response_model=SuccessResponse[dict])
async def exam_community(slug: str, db: DbSession, user_id: OptionalUserId):
    """The exam's community (null when nobody has started it yet), and what the caller can do there."""
    exam = await _exam_by_slug(db, slug)
    community = (await db.execute(select(Community).where(Community.exam_id == exam.id))).scalar_one_or_none()
    status = await _status_of(db, user_id)
    blocked = bool(status and status.is_blocked)
    admin = False
    if user_id:
        user = await db.get(User, user_id)
        admin = bool(user and user.role in PANEL_ROLES)
    viewer = {"signedIn": bool(user_id), "blocked": blocked, "adminAccount": admin, "member": False}

    if community is None:
        return SuccessResponse[dict](data={"exam": {"slug": exam.slug, "name": exam.name}, "community": None, "restricted": False, "viewer": viewer})
    if community.is_restricted:
        return SuccessResponse[dict](data={"exam": {"slug": exam.slug, "name": exam.name}, "community": None, "restricted": True, "viewer": viewer})

    members, posts = await _counts(db, [community.id])
    if user_id:
        viewer["member"] = (await db.get(CommunityMember, (community.id, user_id))) is not None
    founder = await db.get(User, community.created_by) if community.created_by else None
    return SuccessResponse[dict](
        data={
            "exam": {"slug": exam.slug, "name": exam.name},
            "community": {
                "id": str(community.id),
                "description": community.description,
                "members": int(members.get(community.id, 0)),
                "posts": int(posts.get(community.id, 0)),
                "startedBy": _display_name(founder.name) if founder else None,
                "createdAt": _iso(community.created_at),
            },
            "restricted": False,
            "viewer": viewer,
        }
    )


def _post_out(post: CommunityPost, author: Optional[User], replies: list, reply_total: int, reactions: dict, mine: Optional[str], user_id) -> dict:
    return {
        "id": str(post.id),
        "kind": post.kind,
        "title": post.title,
        "body": post.body,
        "image": post.image,
        "author": _display_name(author.name if author else None),
        "authorAvatar": (author.avatar_url or "") if author else "",
        "createdAt": _iso(post.created_at),
        "replies": replies,
        "replyCount": reply_total,
        "reactions": {r: int(reactions.get(r, 0)) for r in REACTIONS},
        "myReaction": mine,
        "mine": bool(user_id and post.user_id == user_id),
    }


@router.get("/communities/{community_id}/posts", response_model=SuccessResponse[dict])
async def community_posts(
    community_id: str,
    db: DbSession,
    user_id: OptionalUserId,
    offset: int = Query(0, ge=0),
    limit: int = Query(PAGE_SIZE, ge=1, le=30),
    kind: Optional[str] = Query(None),
):
    """A page of posts, newest first. Without a sign-in only the first GUEST_POSTS are given, and `locked` says more exist."""
    community = await _open_community(db, community_id)
    where = [CommunityPost.community_id == community.id, CommunityPost.is_hidden.is_(False)]
    if kind in POST_KINDS:
        where.append(CommunityPost.kind == kind)
    total = (await db.execute(select(func.count()).select_from(CommunityPost).where(*where))).scalar_one()

    signed_in = user_id is not None
    if not signed_in:
        offset, limit = 0, min(limit, GUEST_POSTS)

    rows = (
        await db.execute(
            select(CommunityPost, User)
            .outerjoin(User, User.id == CommunityPost.user_id)
            .where(*where)
            .order_by(CommunityPost.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).all()
    ids = [p.id for p, _ in rows]

    replies_by: dict = {i: [] for i in ids}
    reply_totals: dict = {}
    reactions: dict = {i: {} for i in ids}
    mine: dict = {}
    if ids:
        reply_rows = (
            await db.execute(
                select(CommunityReply, User)
                .outerjoin(User, User.id == CommunityReply.user_id)
                .where(CommunityReply.post_id.in_(ids), CommunityReply.is_hidden.is_(False))
                .order_by(CommunityReply.created_at.asc())
            )
        ).all()
        per_post = GUEST_REPLIES if not signed_in else MAX_REPLIES
        for reply, author in reply_rows:
            reply_totals[reply.post_id] = reply_totals.get(reply.post_id, 0) + 1
            if len(replies_by[reply.post_id]) < per_post:
                replies_by[reply.post_id].append(
                    {
                        "id": str(reply.id),
                        "body": reply.body,
                        "author": _display_name(author.name if author else None),
                        "authorAvatar": (author.avatar_url or "") if author else "",
                        "createdAt": _iso(reply.created_at),
                        "mine": bool(user_id and reply.user_id == user_id),
                    }
                )
        for post_id, reaction, count in (
            await db.execute(
                select(CommunityReaction.post_id, CommunityReaction.reaction, func.count())
                .where(CommunityReaction.post_id.in_(ids))
                .group_by(CommunityReaction.post_id, CommunityReaction.reaction)
            )
        ).all():
            reactions[post_id][reaction] = count
        if user_id:
            mine = dict(
                (await db.execute(select(CommunityReaction.post_id, CommunityReaction.reaction).where(CommunityReaction.post_id.in_(ids), CommunityReaction.user_id == user_id))).all()
            )

    return SuccessResponse[dict](
        data={
            "items": [_post_out(p, a, replies_by[p.id], reply_totals.get(p.id, 0), reactions[p.id], mine.get(p.id), user_id) for p, a in rows],
            "total": total,
            "offset": offset,
            "hasMore": signed_in and offset + len(rows) < total,
            # Signed out, with more to read than a visitor is given.
            "locked": not signed_in and total > len(rows),
        }
    )


# ── Taking part ─────────────────────────────────────────────────────────────


class StartBody(BaseModel):
    description: str = Field(default="", max_length=600)
    model_config = ConfigDict(extra="forbid")


@router.post("/exams/{slug}/community", response_model=SuccessResponse[dict], status_code=201)
async def start_community(slug: str, data: StartBody, user_id: CurrentUserId, db: DbSession):
    """Starts the exam's community. Only the first ask succeeds; after that it exists and the student joins it instead."""
    await _participant(db, user_id)
    exam = await _exam_by_slug(db, slug)
    existing = (await db.execute(select(Community).where(Community.exam_id == exam.id))).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("COMMUNITY_EXISTS", "This exam already has a community. Join it instead.")
    community = Community(exam_id=exam.id, description=data.description.strip(), created_by=user_id)
    db.add(community)
    try:
        await db.flush()
    except Exception:  # noqa: BLE001  Two students at the same moment: the unique index keeps one.
        await db.rollback()
        raise ConflictError("COMMUNITY_EXISTS", "This exam already has a community. Join it instead.")
    db.add(CommunityMember(community_id=community.id, user_id=user_id))
    await db.commit()
    return SuccessResponse[dict](data={"id": str(community.id), "message": f"The {exam.name} community is open. You are its first member."})


@router.post("/communities/{community_id}/join", response_model=SuccessResponse[dict])
async def join_community(community_id: str, user_id: CurrentUserId, db: DbSession):
    await _participant(db, user_id)
    community = await _open_community(db, community_id)
    if await db.get(CommunityMember, (community.id, user_id)) is None:
        db.add(CommunityMember(community_id=community.id, user_id=user_id))
        await db.commit()
    return SuccessResponse[dict](data={"member": True})


@router.delete("/communities/{community_id}/join", response_model=SuccessResponse[dict])
async def leave_community(community_id: str, user_id: CurrentUserId, db: DbSession):
    community = await _open_community(db, community_id)
    await db.execute(delete(CommunityMember).where(CommunityMember.community_id == community.id, CommunityMember.user_id == user_id))
    await db.commit()
    return SuccessResponse[dict](data={"member": False})


def _clean(value: str) -> str:
    return "\n".join(line.rstrip() for line in value.strip().splitlines())


class PostBody(BaseModel):
    kind: Literal["discussion", "question", "suggestion", "banner", "achievement"] = "discussion"
    title: str = Field(default="", max_length=200)
    body: str = Field(min_length=1, max_length=4000)
    image: str = Field(default="", max_length=200)
    model_config = ConfigDict(extra="forbid")

    @field_validator("body")
    @classmethod
    def _body(cls, value: str) -> str:
        value = _clean(value)
        if len(value) < 5:
            raise ValueError("Write at least 5 characters.")
        return value

    @field_validator("image")
    @classmethod
    def _image(cls, value: str) -> str:
        value = value.strip()
        # Only a picture uploaded through /community/uploads: nothing from another site.
        if value and not (value.startswith("/api/uploads/community-") and "/" not in value.removeprefix("/api/uploads/")):
            raise ValueError("Upload the picture again.")
        return value


@router.post("/communities/{community_id}/posts", response_model=SuccessResponse[dict], status_code=201)
async def create_post(community_id: str, data: PostBody, user_id: CurrentUserId, db: DbSession):
    await _participant(db, user_id)
    community = await _open_community(db, community_id)
    if await db.get(CommunityMember, (community.id, user_id)) is None:
        raise ForbiddenError("Join the community to post in it.")
    if data.kind == "banner" and not data.image:
        raise ValidationError("A banner needs a picture.")
    await _within_limit(db, CommunityPost, user_id, POSTS_PER_DAY, "posts")
    post = CommunityPost(community_id=community.id, user_id=user_id, kind=data.kind, title=data.title.strip(), body=data.body, image=data.image)
    db.add(post)
    await db.commit()
    return SuccessResponse[dict](data={"id": str(post.id), "message": "Posted."})


@router.delete("/community/posts/{post_id}", response_model=SuccessResponse[dict])
async def delete_own_post(post_id: str, user_id: CurrentUserId, db: DbSession):
    post = await db.get(CommunityPost, _uuid(post_id, "Post"))
    if post is None or post.user_id != user_id:
        raise NotFoundError("Post")
    await db.delete(post)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Post deleted."})


class ReplyBody(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("body")
    @classmethod
    def _body(cls, value: str) -> str:
        value = _clean(value)
        if len(value) < 2:
            raise ValueError("Write a reply first.")
        return value


@router.post("/community/posts/{post_id}/replies", response_model=SuccessResponse[dict], status_code=201)
async def reply_to_post(post_id: str, data: ReplyBody, user_id: CurrentUserId, db: DbSession):
    user = await _participant(db, user_id)
    post, _ = await _visible_post(db, post_id)
    await _within_limit(db, CommunityReply, user_id, REPLIES_PER_DAY, "replies")
    reply = CommunityReply(post_id=post.id, user_id=user_id, body=data.body)
    db.add(reply)
    await db.commit()
    return SuccessResponse[dict](
        data={
            "id": str(reply.id),
            "body": reply.body,
            "author": _display_name(user.name),
            "authorAvatar": user.avatar_url or "",
            "createdAt": _iso(reply.created_at or datetime.now(timezone.utc)),
            "mine": True,
        }
    )


@router.delete("/community/replies/{reply_id}", response_model=SuccessResponse[dict])
async def delete_own_reply(reply_id: str, user_id: CurrentUserId, db: DbSession):
    reply = await db.get(CommunityReply, _uuid(reply_id, "Reply"))
    if reply is None or reply.user_id != user_id:
        raise NotFoundError("Reply")
    await db.delete(reply)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Reply deleted."})


class ReactBody(BaseModel):
    # None takes the reaction back.
    reaction: Optional[Literal["like", "love", "celebrate", "insightful"]] = None
    model_config = ConfigDict(extra="forbid")


@router.put("/community/posts/{post_id}/reaction", response_model=SuccessResponse[dict])
async def react_to_post(post_id: str, data: ReactBody, user_id: CurrentUserId, db: DbSession):
    await _participant(db, user_id)
    post, _ = await _visible_post(db, post_id)
    existing = await db.get(CommunityReaction, (post.id, user_id))
    if data.reaction is None:
        if existing is not None:
            await db.delete(existing)
    elif existing is None:
        db.add(CommunityReaction(post_id=post.id, user_id=user_id, reaction=data.reaction))
    else:
        existing.reaction = data.reaction
    await db.commit()
    counts = dict(
        (await db.execute(select(CommunityReaction.reaction, func.count()).where(CommunityReaction.post_id == post.id).group_by(CommunityReaction.reaction))).all()
    )
    return SuccessResponse[dict](data={"reactions": {r: int(counts.get(r, 0)) for r in REACTIONS}, "myReaction": data.reaction})


@router.post("/community/uploads", response_model=SuccessResponse[dict], status_code=201)
async def upload_community_image(user_id: CurrentUserId, db: DbSession, file: UploadFile = File(...)):
    """A picture for a post (a banner, an achievement). Decoded with Pillow, never trusted by its name, and saved under a random one."""
    await _participant(db, user_id)
    raw = await file.read(UPLOAD_MAX_BYTES + 1)
    if len(raw) > UPLOAD_MAX_BYTES:
        raise ValidationError("The picture is larger than 4 MB. Choose a smaller one.")
    if not raw:
        raise ValidationError("The file is empty.")
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.verify()
        with Image.open(io.BytesIO(raw)) as img:
            fmt, width, height = img.format, img.width, img.height
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValidationError("That file is not a picture. Use JPG, PNG or WebP.")
    if fmt not in UPLOAD_FORMATS:
        raise ValidationError("Use a JPG, PNG or WebP picture.")
    min_w, min_h = UPLOAD_MIN
    if width < min_w or height < min_h:
        raise ValidationError(f"The picture is {width} × {height} px. It needs to be at least {min_w} × {min_h} px.")
    folder = Path(settings.UPLOAD_DIR)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"community-{uuid.uuid4().hex}.{UPLOAD_FORMATS[fmt]}"
    (folder / name).write_bytes(raw)
    return SuccessResponse[dict](data={"url": f"/api/uploads/{name}", "width": width, "height": height})


# ── The platform team ───────────────────────────────────────────────────────


def _person(user: Optional[User], status: Optional[CommunityUserStatus]) -> dict:
    return {
        "id": str(user.id) if user else None,
        "name": user.name if user else "Deleted account",
        "email": user.email if user else "",
        "flagged": bool(status and status.is_flagged),
        "blocked": bool(status and status.is_blocked),
    }


@router.get("/admin/community/overview", response_model=SuccessResponse[dict])
async def admin_overview(_admin: AdminPayload, db: DbSession):
    """Every community (restricted ones too) with its numbers, and the totals for the top of the page."""
    rows = (await db.execute(select(Community, Exam.slug, Exam.name, User.name).join(Exam, Exam.id == Community.exam_id).outerjoin(User, User.id == Community.created_by).order_by(Community.created_at.desc()))).all()
    ids = [c.id for c, *_ in rows]
    members, posts = await _counts(db, ids)
    hidden = dict(
        (await db.execute(select(CommunityPost.community_id, func.count()).where(CommunityPost.community_id.in_(ids), CommunityPost.is_hidden.is_(True)).group_by(CommunityPost.community_id))).all()
    ) if ids else {}
    since = datetime.now(timezone.utc) - timedelta(days=1)
    totals = {
        "communities": len(rows),
        "posts": (await db.execute(select(func.count()).select_from(CommunityPost))).scalar_one(),
        "postsToday": (await db.execute(select(func.count()).select_from(CommunityPost).where(CommunityPost.created_at >= since))).scalar_one(),
        "replies": (await db.execute(select(func.count()).select_from(CommunityReply))).scalar_one(),
        "hidden": (await db.execute(select(func.count()).select_from(CommunityPost).where(CommunityPost.is_hidden.is_(True)))).scalar_one(),
        "flagged": (await db.execute(select(func.count()).select_from(CommunityUserStatus).where(CommunityUserStatus.is_flagged.is_(True)))).scalar_one(),
        "blocked": (await db.execute(select(func.count()).select_from(CommunityUserStatus).where(CommunityUserStatus.is_blocked.is_(True)))).scalar_one(),
    }
    return SuccessResponse[dict](
        data={
            "totals": totals,
            "communities": [
                {
                    "id": str(c.id),
                    "examSlug": slug,
                    "examName": name,
                    "description": c.description,
                    "startedBy": founder or "",
                    "restricted": bool(c.is_restricted),
                    "members": int(members.get(c.id, 0)),
                    "posts": int(posts.get(c.id, 0)),
                    "hiddenPosts": int(hidden.get(c.id, 0)),
                    "createdAt": _iso(c.created_at),
                }
                for c, slug, name, founder in rows
            ],
        }
    )


@router.get("/admin/community/posts", response_model=SuccessResponse[dict])
async def admin_posts(
    _admin: AdminPayload,
    db: DbSession,
    community: Optional[str] = Query(None),
    status: Literal["all", "visible", "hidden"] = Query("all"),
    kind: Optional[str] = Query(None),
    q: Optional[str] = Query(None, max_length=100),
    user: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Every post, newest first, with its replies (hidden ones too) and its author's standing."""
    where = []
    if community:
        where.append(CommunityPost.community_id == _uuid(community, "Community"))
    if status == "visible":
        where.append(CommunityPost.is_hidden.is_(False))
    elif status == "hidden":
        where.append(CommunityPost.is_hidden.is_(True))
    if kind in POST_KINDS:
        where.append(CommunityPost.kind == kind)
    if user:
        where.append(CommunityPost.user_id == _uuid(user, "User"))
    if q and q.strip():
        like = f"%{q.strip()}%"
        where.append(or_(CommunityPost.body.ilike(like), CommunityPost.title.ilike(like)))

    total = (await db.execute(select(func.count()).select_from(CommunityPost).where(*where))).scalar_one()
    rows = (
        await db.execute(
            select(CommunityPost, User, CommunityUserStatus, Exam.name)
            .outerjoin(User, User.id == CommunityPost.user_id)
            .outerjoin(CommunityUserStatus, CommunityUserStatus.user_id == CommunityPost.user_id)
            .join(Community, Community.id == CommunityPost.community_id)
            .join(Exam, Exam.id == Community.exam_id)
            .where(*where)
            .order_by(CommunityPost.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    ids = [p.id for p, *_ in rows]
    replies: dict = {i: [] for i in ids}
    reaction_totals: dict = {}
    if ids:
        for reply, author, st in (
            await db.execute(
                select(CommunityReply, User, CommunityUserStatus)
                .outerjoin(User, User.id == CommunityReply.user_id)
                .outerjoin(CommunityUserStatus, CommunityUserStatus.user_id == CommunityReply.user_id)
                .where(CommunityReply.post_id.in_(ids))
                .order_by(CommunityReply.created_at.asc())
            )
        ).all():
            replies[reply.post_id].append(
                {"id": str(reply.id), "body": reply.body, "hidden": bool(reply.is_hidden), "hiddenReason": reply.hidden_reason, "createdAt": _iso(reply.created_at), "author": _person(author, st)}
            )
        reaction_totals = dict((await db.execute(select(CommunityReaction.post_id, func.count()).where(CommunityReaction.post_id.in_(ids)).group_by(CommunityReaction.post_id))).all())
    return SuccessResponse[dict](
        data={
            "items": [
                {
                    "id": str(p.id),
                    "communityId": str(p.community_id),
                    "examName": exam_name,
                    "kind": p.kind,
                    "title": p.title,
                    "body": p.body,
                    "image": p.image,
                    "hidden": bool(p.is_hidden),
                    "hiddenReason": p.hidden_reason,
                    "createdAt": _iso(p.created_at),
                    "author": _person(author, st),
                    "reactions": int(reaction_totals.get(p.id, 0)),
                    "replies": replies[p.id],
                }
                for p, author, st, exam_name in rows
            ],
            "total": total,
            "page": page,
            "pages": max(1, -(-total // limit)),
        }
    )


class HideBody(BaseModel):
    hidden: bool
    reason: str = Field(default="", max_length=300)
    model_config = ConfigDict(extra="forbid")


@router.put("/admin/community/posts/{post_id}/hidden", response_model=SuccessResponse[dict])
async def admin_hide_post(post_id: str, data: HideBody, _admin: AdminPayload, db: DbSession):
    post = await db.get(CommunityPost, _uuid(post_id, "Post"))
    if post is None:
        raise NotFoundError("Post")
    post.is_hidden = data.hidden
    post.hidden_reason = data.reason.strip() if data.hidden else ""
    await db.commit()
    return SuccessResponse[dict](data={"message": "Post hidden from the site." if data.hidden else "Post shown on the site again."})


@router.delete("/admin/community/posts/{post_id}", response_model=SuccessResponse[dict])
async def admin_delete_post(post_id: str, _admin: AdminPayload, db: DbSession):
    post = await db.get(CommunityPost, _uuid(post_id, "Post"))
    if post is None:
        raise NotFoundError("Post")
    await db.delete(post)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Post deleted, with its replies and reactions."})


@router.put("/admin/community/replies/{reply_id}/hidden", response_model=SuccessResponse[dict])
async def admin_hide_reply(reply_id: str, data: HideBody, _admin: AdminPayload, db: DbSession):
    reply = await db.get(CommunityReply, _uuid(reply_id, "Reply"))
    if reply is None:
        raise NotFoundError("Reply")
    reply.is_hidden = data.hidden
    reply.hidden_reason = data.reason.strip() if data.hidden else ""
    await db.commit()
    return SuccessResponse[dict](data={"message": "Reply hidden from the site." if data.hidden else "Reply shown on the site again."})


@router.delete("/admin/community/replies/{reply_id}", response_model=SuccessResponse[dict])
async def admin_delete_reply(reply_id: str, _admin: AdminPayload, db: DbSession):
    reply = await db.get(CommunityReply, _uuid(reply_id, "Reply"))
    if reply is None:
        raise NotFoundError("Reply")
    await db.delete(reply)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Reply deleted."})


class RestrictBody(BaseModel):
    restricted: bool
    model_config = ConfigDict(extra="forbid")


@router.put("/admin/community/communities/{community_id}", response_model=SuccessResponse[dict])
async def admin_restrict_community(community_id: str, data: RestrictBody, _admin: AdminPayload, db: DbSession):
    community = await db.get(Community, _uuid(community_id, "Community"))
    if community is None:
        raise NotFoundError("Community")
    community.is_restricted = data.restricted
    await db.commit()
    return SuccessResponse[dict](data={"message": "Community restricted: hidden from the site." if data.restricted else "Community open on the site again."})


@router.delete("/admin/community/communities/{community_id}", response_model=SuccessResponse[dict])
async def admin_delete_community(community_id: str, _admin: AdminPayload, db: DbSession):
    """Deletes the community with every post, reply, reaction and membership. The next student can start it afresh."""
    community = await db.get(Community, _uuid(community_id, "Community"))
    if community is None:
        raise NotFoundError("Community")
    await db.delete(community)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Community deleted."})


@router.get("/admin/community/users", response_model=SuccessResponse[dict])
async def admin_users(
    _admin: AdminPayload,
    db: DbSession,
    status: Literal["all", "flagged", "blocked"] = Query("all"),
    q: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    """Everyone who has joined, posted or replied in a community, with what they did and their standing."""
    posts = select(CommunityPost.user_id.label("uid"), func.count().label("n")).group_by(CommunityPost.user_id).subquery()
    replies = select(CommunityReply.user_id.label("uid"), func.count().label("n")).group_by(CommunityReply.user_id).subquery()
    joined = select(CommunityMember.user_id.label("uid"), func.count().label("n")).group_by(CommunityMember.user_id).subquery()

    where = [or_(posts.c.uid.is_not(None), replies.c.uid.is_not(None), joined.c.uid.is_not(None), CommunityUserStatus.user_id.is_not(None))]
    if status == "flagged":
        where.append(CommunityUserStatus.is_flagged.is_(True))
    elif status == "blocked":
        where.append(CommunityUserStatus.is_blocked.is_(True))
    if q and q.strip():
        like = f"%{q.strip()}%"
        where.append(or_(User.name.ilike(like), User.email.ilike(like)))

    base = (
        select(User, CommunityUserStatus, func.coalesce(posts.c.n, 0), func.coalesce(replies.c.n, 0), func.coalesce(joined.c.n, 0))
        .outerjoin(posts, posts.c.uid == User.id)
        .outerjoin(replies, replies.c.uid == User.id)
        .outerjoin(joined, joined.c.uid == User.id)
        .outerjoin(CommunityUserStatus, CommunityUserStatus.user_id == User.id)
        .where(and_(*where))
    )
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (await db.execute(base.order_by(func.coalesce(posts.c.n, 0).desc(), User.name).offset((page - 1) * limit).limit(limit))).all()
    return SuccessResponse[dict](
        data={
            "items": [
                {
                    **_person(u, st),
                    "note": st.note if st else "",
                    "posts": int(p),
                    "replies": int(r),
                    "communities": int(j),
                    "updatedAt": _iso(st.updated_at) if st else None,
                }
                for u, st, p, r, j in rows
            ],
            "total": total,
            "page": page,
            "pages": max(1, -(-total // limit)),
        }
    )


class StandingBody(BaseModel):
    flagged: Optional[bool] = None
    blocked: Optional[bool] = None
    note: Optional[str] = Field(default=None, max_length=300)
    model_config = ConfigDict(extra="forbid")


@router.put("/admin/community/users/{user_id}", response_model=SuccessResponse[dict])
async def admin_set_standing(user_id: str, data: StandingBody, admin: AdminPayload, db: DbSession):
    """Flags or blocks a student (or lifts it). A blocked student keeps reading but cannot take part."""
    target = await db.get(User, _uuid(user_id, "User"))
    if target is None:
        raise NotFoundError("User")
    if target.role in PANEL_ROLES:
        raise ValidationError("Admin accounts cannot be flagged or blocked here.")
    status = await db.get(CommunityUserStatus, target.id)
    if status is None:
        status = CommunityUserStatus(user_id=target.id, is_flagged=False, is_blocked=False, note="")
        db.add(status)
    if data.flagged is not None:
        status.is_flagged = data.flagged
    if data.blocked is not None:
        status.is_blocked = data.blocked
    if data.note is not None:
        status.note = data.note.strip()
    status.updated_by = _uuid(admin["sub"], "User")
    await db.commit()
    if status.is_blocked:
        message = f"{target.name} is blocked: they can read communities but not take part."
    elif status.is_flagged:
        message = f"{target.name} is flagged."
    else:
        message = f"{target.name} is in good standing."
    return SuccessResponse[dict](data={"message": message, "flagged": status.is_flagged, "blocked": status.is_blocked})
