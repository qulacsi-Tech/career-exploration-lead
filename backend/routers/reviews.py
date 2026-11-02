"""A signed-in student writes a review of a college.

The review is saved as waiting (`is_approved` false): the platform team approves or rejects it from the college
editor's Reviews tab, and only approved reviews are shown or counted. It never goes to the college's own admin.
One review per student per college, so a repeat is refused with a message rather than stored twice.
"""

from datetime import date
import uuid
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import case, delete, func, select

from core import college_rules as rules
from core.dependencies import CurrentUserId, DbSession, OptionalUserId
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.college import College
from models.review import Review, ReviewVote
from models.user import User
from schemas.common import SuccessResponse

router = APIRouter(tags=["reviews"])


class ReviewBody(BaseModel):
    course: str = Field(min_length=1, max_length=200)
    batch: str = Field(min_length=1, max_length=50)
    ratingPlacements: float = Field(ge=1, le=5)
    ratingFaculty: float = Field(ge=1, le=5)
    ratingInfrastructure: float = Field(ge=1, le=5)
    ratingCampusLife: float = Field(ge=1, le=5)
    body: str = Field(min_length=rules.REVIEW_MIN_CHARS, max_length=2000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("course")
    @classmethod
    def _course(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("batch")
    @classmethod
    def _batch(cls, value: str) -> str:
        return rules.check_batch(value)

    @field_validator("body")
    @classmethod
    def _body(cls, value: str) -> str:
        value = value.strip()
        if len(value) < rules.REVIEW_MIN_CHARS:
            raise ValueError(f"Write at least {rules.REVIEW_MIN_CHARS} characters.")
        return value


@router.post("/colleges/{slug}/reviews", response_model=SuccessResponse[dict], status_code=201)
async def submit_review(slug: str, data: ReviewBody, user_id: CurrentUserId, db: DbSession):
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotFoundError("Account")

    already = (
        await db.execute(select(Review.id).where(Review.college_id == college.id, Review.user_id == user_id).limit(1))
    ).first()
    if already:
        raise ConflictError("ALREADY_REVIEWED", "You have already reviewed this college. Your review is with our team.")

    overall = round((data.ratingPlacements + data.ratingFaculty + data.ratingInfrastructure + data.ratingCampusLife) / 4, 1)
    db.add(
        Review(
            college_id=college.id,
            user_id=user_id,
            author_name=user.name,
            course=data.course,
            batch=data.batch,
            verified=False,
            review_date=date.today(),
            rating=overall,
            body=data.body,
            rating_placements=data.ratingPlacements,
            rating_faculty=data.ratingFaculty,
            rating_infrastructure=data.ratingInfrastructure,
            rating_campus_life=data.ratingCampusLife,
            is_approved=False,
        )
    )
    await db.commit()
    await _tell_platform(db, college, user)
    return SuccessResponse[dict](data={"message": "Thank you! Your review is with our team and will appear once it is approved."})


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
                "body": r.body,
                "approved": bool(r.is_approved),
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r, name, slug in rows
        ]
    )


async def _tell_platform(db, college: College, user: User, note: Optional[str] = None) -> None:
    """The platform team is told a review is waiting. Never allowed to fail the review."""
    try:
        from services.notify import notify, platform_admin_ids

        await notify(
            db,
            await platform_admin_ids(db),
            kind="review.new",
            title=f"New review for {college.name}",
            body=note or f"From {user.name}. Approve or reject it on the college's Reviews tab.",
            link="/admin/colleges",
        )
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not notify the platform team of a new review")
