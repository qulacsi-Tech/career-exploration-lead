"""A signed-in student writes a review of a college.

The review is saved as waiting (`is_approved` false): the platform team approves or rejects it from the college
editor's Reviews tab, and only approved reviews are shown or counted. It never goes to the college's own admin.
One review per student per college, so a repeat is refused with a message rather than stored twice.
"""

from datetime import date, datetime, timezone
from urllib.parse import quote
import uuid
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import case, delete, func, select

from core import college_rules as rules
from core.dependencies import CurrentUserId, DbSession, OptionalUserId
from core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from models.college import College
from models.review import Review, ReviewReply, ReviewReplyVote, ReviewVote
from models.user import PANEL_ROLES, User
from schemas.common import SuccessResponse

router = APIRouter(tags=["reviews"])


class ReviewBody(BaseModel):
    course: str = Field(min_length=1, max_length=200)
    batch: str = Field(min_length=1, max_length=50)
    # Any of the four may be left out; at least one is needed.
    ratingPlacements: Optional[float] = Field(default=None, ge=1, le=5)
    ratingFaculty: Optional[float] = Field(default=None, ge=1, le=5)
    ratingInfrastructure: Optional[float] = Field(default=None, ge=1, le=5)
    ratingCampusLife: Optional[float] = Field(default=None, ge=1, le=5)
    # The overall review. It may be left empty when at least one of the comments on the ratings is written.
    body: str = Field(default="", max_length=2000)
    # An optional word on each rating.
    commentPlacements: str = Field(default="", max_length=500)
    commentFaculty: str = Field(default="", max_length=500)
    commentInfrastructure: str = Field(default="", max_length=500)
    commentCampusLife: str = Field(default="", max_length=500)
    model_config = ConfigDict(extra="forbid")

    @field_validator("course")
    @classmethod
    def _course(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("batch")
    @classmethod
    def _batch(cls, value: str) -> str:
        return rules.check_batch(value)

    @field_validator("commentPlacements", "commentFaculty", "commentInfrastructure", "commentCampusLife")
    @classmethod
    def _comment(cls, value: str) -> str:
        return " ".join(value.split())

    @model_validator(mode="after")
    def _one_rating(self):
        if all(v is None for v in (self.ratingPlacements, self.ratingFaculty, self.ratingInfrastructure, self.ratingCampusLife)):
            raise ValueError("Rate at least one area.")
        return self

    @field_validator("body")
    @classmethod
    def _body(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def _a_comment(self):
        written = [self.body, self.commentPlacements, self.commentFaculty, self.commentInfrastructure, self.commentCampusLife]
        if not any(len(t.strip()) >= 3 for t in written):
            raise ValueError("Write a comment: add some text in at least one box.")
        return self


@router.post("/colleges/{slug}/reviews", response_model=SuccessResponse[dict], status_code=201)
async def submit_review(slug: str, data: ReviewBody, user_id: CurrentUserId, db: DbSession):
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotFoundError("Account")
    _students_only(user)

    already = (
        await db.execute(select(Review.id).where(Review.college_id == college.id, Review.user_id == user_id).limit(1))
    ).first()
    if already:
        raise ConflictError("ALREADY_REVIEWED", "You have already reviewed this college.")

    db.add(
        Review(
            college_id=college.id,
            user_id=user_id,
            author_name=user.name,
            verified=False,
            review_date=date.today(),
            **_values(data),
            # Live at once; the team is told and can check, hide or remove it afterwards.
            is_approved=True,
            checked=False,
        )
    )
    await db.flush()
    await refresh_college_rating(db, college.id)
    await db.commit()
    await _tell_platform(db, college, user)
    return SuccessResponse[dict](data={"message": "Thank you! Your review is live on the college's page."})


def _values(data: ReviewBody) -> dict:
    """The columns a review's own fields fill in: the overall rating, its text, the ratings and the comments."""
    given = [v for v in (data.ratingPlacements, data.ratingFaculty, data.ratingInfrastructure, data.ratingCampusLife) if v is not None]
    # With no overall review, the comments on the ratings stand in as its text.
    labelled = [("Placements", data.commentPlacements), ("Faculty", data.commentFaculty), ("Infrastructure", data.commentInfrastructure), ("Campus life", data.commentCampusLife)]
    return dict(
        course=data.course,
        batch=data.batch,
        rating=round(sum(given) / len(given), 1),
        body=data.body or " ".join(f"{label}: {note}" for label, note in labelled if note.strip()),
        rating_placements=data.ratingPlacements,
        rating_faculty=data.ratingFaculty,
        rating_infrastructure=data.ratingInfrastructure,
        rating_campus_life=data.ratingCampusLife,
        comment_placements=data.commentPlacements or None,
        comment_faculty=data.commentFaculty or None,
        comment_infrastructure=data.commentInfrastructure or None,
        comment_campus_life=data.commentCampusLife or None,
    )


@router.put("/reviews/{review_id}", response_model=SuccessResponse[dict])
async def edit_review(review_id: str, data: ReviewBody, user_id: CurrentUserId, db: DbSession):
    """The student who wrote a review changes it. It stays live, is marked as edited, and the team is told."""
    try:
        wanted = uuid.UUID(review_id)
    except ValueError:
        raise NotFoundError("Review") from None
    review = await db.get(Review, wanted)
    user = await db.get(User, user_id)
    if review is None or review.user_id != user_id or user is None:
        raise NotFoundError("Review")
    _students_only(user)
    for key, value in _values(data).items():
        setattr(review, key, value)
    review.edited_at = datetime.now(timezone.utc)
    review.checked = False
    await db.flush()
    await refresh_college_rating(db, review.college_id)
    college = await db.get(College, review.college_id)
    await db.commit()
    await _tell_platform(db, college, user, title=f"Review edited for {college.name}", note=f"{user.name} changed their review. It is live on the site. Check it again if you like.")
    return SuccessResponse[dict](data={"message": "Your review has been updated."})


async def refresh_college_rating(db, college_id) -> None:
    """The college's rating and review count follow the reviews that are showing."""
    live = (await db.execute(select(Review.rating).where(Review.college_id == college_id, Review.is_approved.is_(True)))).scalars().all()
    college = await db.get(College, college_id)
    if college is None:
        return
    college.review_count = len(live)
    if live:
        college.rating = round(sum(live) / len(live), 1)


def _students_only(user: Optional[User]) -> None:
    """Reviews and their votes belong to students. The platform team and college admins use the admin panel."""
    if user is not None and user.role in PANEL_ROLES:
        raise ForbiddenError("Admin accounts cannot do this. Use a student account.")


async def _counts(db, review_ids: list) -> dict:
    """{review id: (likes, dislikes)} for the reviews given."""
    if not review_ids:
        return {}
    rows = (
        await db.execute(
            select(
                ReviewVote.review_id,
                func.coalesce(func.sum(case((ReviewVote.vote == 1, 1), else_=0)), 0),
                func.coalesce(func.sum(case((ReviewVote.vote == -1, 1), else_=0)), 0),
            )
            .where(ReviewVote.review_id.in_(review_ids))
            .group_by(ReviewVote.review_id)
        )
    ).all()
    return {rid: (int(likes), int(dislikes)) for rid, likes, dislikes in rows}


@router.get("/colleges/{slug}/review-votes", response_model=SuccessResponse[dict])
async def review_votes(slug: str, db: DbSession, user_id: OptionalUserId):
    """Likes and dislikes on each approved review of a college, and what the caller (if signed in) chose."""
    college = (await db.execute(select(College.id).where(College.slug == slug))).first()
    if college is None:
        raise NotFoundError("College")
    ids = list((await db.execute(select(Review.id).where(Review.college_id == college[0], Review.is_approved.is_(True)))).scalars().all())
    counts = await _counts(db, ids)
    mine: dict = {}
    if user_id and ids:
        mine = dict((await db.execute(select(ReviewVote.review_id, ReviewVote.vote).where(ReviewVote.review_id.in_(ids), ReviewVote.user_id == user_id))).all())
    return SuccessResponse[dict](
        data={
            str(rid): {"likes": counts.get(rid, (0, 0))[0], "dislikes": counts.get(rid, (0, 0))[1], "mine": {1: "like", -1: "dislike"}.get(mine.get(rid))}
            for rid in ids
        }
    )


class VoteBody(BaseModel):
    vote: Literal["like", "dislike"]
    model_config = ConfigDict(extra="forbid")


@router.post("/reviews/{review_id}/vote", response_model=SuccessResponse[dict])
async def vote_review(review_id: str, data: VoteBody, user_id: CurrentUserId, db: DbSession):
    """Likes or dislikes a review. The same choice again takes it back; the other one switches. Not your own review."""
    try:
        wanted = uuid.UUID(review_id)
    except ValueError:
        raise NotFoundError("Review") from None
    review = await db.get(Review, wanted)
    if review is None or not review.is_approved:
        raise NotFoundError("Review")
    _students_only(await db.get(User, user_id))
    if review.user_id == user_id:
        raise ValidationError("This is your own review, so it is for others to like or dislike.")

    value = 1 if data.vote == "like" else -1
    existing = (await db.execute(select(ReviewVote).where(ReviewVote.review_id == wanted, ReviewVote.user_id == user_id))).scalar_one_or_none()
    if existing is None:
        db.add(ReviewVote(review_id=wanted, user_id=user_id, vote=value))
        mine: Optional[str] = data.vote
    elif existing.vote == value:
        await db.execute(delete(ReviewVote).where(ReviewVote.review_id == wanted, ReviewVote.user_id == user_id))
        mine = None
    else:
        existing.vote = value
        mine = data.vote
    await db.commit()
    likes, dislikes = (await _counts(db, [wanted])).get(wanted, (0, 0))
    return SuccessResponse[dict](data={"likes": likes, "dislikes": dislikes, "mine": mine})


@router.get("/me/reviews", response_model=SuccessResponse[list])
async def my_reviews(user_id: CurrentUserId, db: DbSession):
    """The signed-in student's own reviews, and whether each one is live or still waiting for the team."""
    rows = (
        await db.execute(
            select(Review, College.name, College.slug)
            .join(College, College.id == Review.college_id)
            .where(Review.user_id == user_id)
            .order_by(Review.created_at.desc())
        )
    ).all()
    return SuccessResponse[list](
        data=[
            {
                "id": str(r.id),
                "collegeName": name,
                "collegeSlug": slug,
                "course": r.course,
                "batch": r.batch,
                "rating": r.rating,
                "ratingPlacements": r.rating_placements,
                "ratingFaculty": r.rating_faculty,
                "ratingInfrastructure": r.rating_infrastructure,
                "ratingCampusLife": r.rating_campus_life,
                "commentPlacements": r.comment_placements or "",
                "commentFaculty": r.comment_faculty or "",
                "commentInfrastructure": r.comment_infrastructure or "",
                "commentCampusLife": r.comment_campus_life or "",
                "body": r.body,
                "approved": bool(r.is_approved),
                "edited": bool(r.edited_at),
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r, name, slug in rows
        ]
    )


async def _tell_platform(db, college: College, user: User, note: Optional[str] = None, title: Optional[str] = None) -> None:
    """The platform team is told a review is waiting. Never allowed to fail the review."""
    try:
        from services.notify import notify, platform_admin_ids

        await notify(
            db,
            await platform_admin_ids(db),
            kind="review.new",
            title=title or f"New review for {college.name}",
            body=note or f"From {user.name}. It is live on the site. Check it, and hide or remove it if needed.",
            link=f"/admin/ratings?status=all&college={quote(college.name)}",
        )
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not notify the platform team of a new review")


# ── Replies ─────────────────────────────────────────────────────────────────


class ReplyBody(BaseModel):
    body: str = Field(min_length=2, max_length=1000)
    # The reply this one answers; empty when it answers the review itself.
    parentId: Optional[str] = None
    model_config = ConfigDict(extra="forbid")

    @field_validator("body")
    @classmethod
    def _tidy(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Write a reply.")
        return value


def _reply_out(x: ReviewReply, mine: bool, likes: int = 0, dislikes: int = 0, my_vote: Optional[str] = None) -> dict:
    return {
        "id": str(x.id),
        "parentId": str(x.parent_id) if x.parent_id else None,
        "author": x.author_name,
        "body": x.body,
        "createdAt": x.created_at.isoformat() if x.created_at else None,
        "mine": mine,
        "likes": likes,
        "dislikes": dislikes,
        "myVote": my_vote,
    }


@router.get("/colleges/{slug}/review-replies", response_model=SuccessResponse[dict])
async def review_replies(slug: str, db: DbSession, user_id: OptionalUserId):
    """Every reply under a college's showing reviews, oldest first, grouped by the review they belong to."""
    college = (await db.execute(select(College.id).where(College.slug == slug))).first()
    if college is None:
        raise NotFoundError("College")
    rows = (
        await db.execute(
            select(ReviewReply)
            .join(Review, Review.id == ReviewReply.review_id)
            .where(Review.college_id == college[0], Review.is_approved.is_(True))
            .order_by(ReviewReply.created_at.asc())
        )
    ).scalars().all()
    ids = [x.id for x in rows]
    counts: dict = {}
    mine_votes: dict = {}
    if ids:
        for rid, vote, n in (
            await db.execute(select(ReviewReplyVote.reply_id, ReviewReplyVote.vote, func.count()).where(ReviewReplyVote.reply_id.in_(ids)).group_by(ReviewReplyVote.reply_id, ReviewReplyVote.vote))
        ).all():
            counts.setdefault(rid, {1: 0, -1: 0})[int(vote)] = int(n)
        if user_id:
            mine_votes = dict((await db.execute(select(ReviewReplyVote.reply_id, ReviewReplyVote.vote).where(ReviewReplyVote.reply_id.in_(ids), ReviewReplyVote.user_id == user_id))).all())
    grouped: dict[str, list] = {}
    for x in rows:
        c = counts.get(x.id, {1: 0, -1: 0})
        grouped.setdefault(str(x.review_id), []).append(
            _reply_out(x, bool(user_id) and x.user_id == user_id, c[1], c[-1], {1: "like", -1: "dislike"}.get(mine_votes.get(x.id)))
        )
    return SuccessResponse[dict](data=grouped)


@router.post("/reviews/{review_id}/replies", response_model=SuccessResponse[dict], status_code=201)
async def post_reply(review_id: str, data: ReplyBody, user_id: CurrentUserId, db: DbSession):
    """A signed-in student replies to a review, or to a reply under it. The people being answered are told."""
    try:
        wanted = uuid.UUID(review_id)
    except ValueError:
        raise NotFoundError("Review") from None
    review = await db.get(Review, wanted)
    if review is None or not review.is_approved:
        raise NotFoundError("Review")
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotFoundError("Account")
    _students_only(user)

    parent: Optional[ReviewReply] = None
    if data.parentId:
        try:
            parent = await db.get(ReviewReply, uuid.UUID(data.parentId))
        except ValueError:
            parent = None
        if parent is None or parent.review_id != review.id:
            raise ValidationError("That reply is no longer there.")

    reply = ReviewReply(review_id=review.id, parent_id=parent.id if parent else None, user_id=user_id, author_name=user.name, body=data.body)
    db.add(reply)
    await db.commit()
    await db.refresh(reply)

    # Whoever wrote the review, and whoever wrote the reply being answered, hear of it. Never allowed to fail the reply.
    try:
        from services.notify import notify

        college = await db.get(College, review.college_id)
        people = [p for p in (review.user_id, parent.user_id if parent else None) if p]
        await notify(
            db,
            people,
            kind="review.reply",
            title=f"{user.name} replied on a review of {college.name}" if college else f"{user.name} replied to you",
            body=data.body[:160],
            link=f"/college/{college.slug}/reviews" if college else None,
            exclude=user_id,
        )
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not notify about a reply")
    return SuccessResponse[dict](data=_reply_out(reply, True))


@router.delete("/replies/{reply_id}", response_model=SuccessResponse[dict])
async def delete_reply(reply_id: str, user_id: CurrentUserId, db: DbSession):
    """A student takes back their own reply (and the replies under it)."""
    try:
        wanted = uuid.UUID(reply_id)
    except ValueError:
        raise NotFoundError("Reply") from None
    reply = await db.get(ReviewReply, wanted)
    if reply is None or reply.user_id != user_id:
        raise NotFoundError("Reply")
    await db.delete(reply)
    await db.commit()
    return SuccessResponse[dict](data={"deleted": True})


@router.post("/replies/{reply_id}/vote", response_model=SuccessResponse[dict])
async def vote_reply(reply_id: str, data: VoteBody, user_id: CurrentUserId, db: DbSession):
    """Likes or dislikes a reply. The same choice again takes it back; the other one switches. Not your own reply."""
    try:
        wanted = uuid.UUID(reply_id)
    except ValueError:
        raise NotFoundError("Reply") from None
    reply = await db.get(ReviewReply, wanted)
    if reply is None:
        raise NotFoundError("Reply")
    _students_only(await db.get(User, user_id))
    if reply.user_id == user_id:
        raise ValidationError("This is your own reply, so it is for others to like or dislike.")

    value = 1 if data.vote == "like" else -1
    existing = (await db.execute(select(ReviewReplyVote).where(ReviewReplyVote.reply_id == wanted, ReviewReplyVote.user_id == user_id))).scalar_one_or_none()
    if existing is None:
        db.add(ReviewReplyVote(reply_id=wanted, user_id=user_id, vote=value))
        mine: Optional[str] = data.vote
    elif existing.vote == value:
        await db.execute(delete(ReviewReplyVote).where(ReviewReplyVote.reply_id == wanted, ReviewReplyVote.user_id == user_id))
        mine = None
    else:
        existing.vote = value
        mine = data.vote
    await db.commit()
    likes, dislikes = (
        int((await db.execute(select(func.count()).select_from(ReviewReplyVote).where(ReviewReplyVote.reply_id == wanted, ReviewReplyVote.vote == v))).scalar_one()) for v in (1, -1)
    )
    return SuccessResponse[dict](data={"likes": likes, "dislikes": dislikes, "mine": mine})
