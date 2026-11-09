"""The Activity section of the admin: the numbers on the sidebar, and the ratings (student reviews) table.

Ratings are moderated by the platform team only: a review never goes to the college's own admin.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError
from models.collab import ChangeRequest, MessageThread
from models.college import College
from models.lead import Lead, LeadShare, LeadStatus
from models.question import Question
from models.review import Review, ReviewReply
from models.user import User
from routers.questions import Staff
from routers.reviews import refresh_college_rating
from schemas.common import ListResponse, Meta, SuccessResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/activity/counts", response_model=SuccessResponse[dict])
async def activity_counts(who: Staff, db: DbSession):
    """What is waiting, for the badges beside Questions, Approvals, Messages and Ratings in the sidebar."""
    college_id = who["college_id"]

    async def count(model, *conds) -> int:
        stmt = select(func.count()).select_from(model).where(*conds)
        return int((await db.execute(stmt)).scalar_one())

    q_conds = [Question.answer.is_(None)]
    m_conds = [MessageThread.status == "open"]
    if college_id:
        q_conds.append(Question.college_id == college_id)
        m_conds.append(MessageThread.college_id == college_id)
    data = {"questions": await count(Question, *q_conds), "messages": await count(MessageThread, *m_conds)}
    # New leads in the Inbox: all of them for the platform team; a college admin's own (and shared) ones.
    lead_conds = [Lead.status == LeadStatus.NEW]
    if college_id:
        slug = (await db.execute(select(College.slug).where(College.id == college_id))).scalar_one_or_none()
        shared = select(LeadShare.lead_id).where(LeadShare.college_id == college_id)
        lead_conds += [or_(Lead.college_slug == slug, Lead.id.in_(shared)), Lead.consent.is_(True)]
    data["leads"] = await count(Lead, *lead_conds)
    if not college_id:
        data["approvals"] = await count(ChangeRequest, ChangeRequest.status == "pending")
        data["ratings"] = await count(Review, Review.checked.is_(False))
    return SuccessResponse[dict](data=data)


def _iso(value) -> Optional[str]:
    return value.isoformat() if value else None


@router.get("/ratings", response_model=ListResponse[dict])
async def list_ratings(
    _admin: AdminPayload,
    db: DbSession,
    status: str = Query("tocheck", pattern="^(tocheck|shown|hidden|all)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    """Every review students have written, with its four ratings and the comment on each."""
    conds = []
    if status == "tocheck":
        conds.append(Review.checked.is_(False))
    elif status == "shown":
        conds.append(Review.is_approved.is_(True))
    elif status == "hidden":
        conds.append(Review.is_approved.is_(False))
    total = int((await db.execute(select(func.count()).select_from(Review).where(*conds))).scalar_one())
    rows = (
        await db.execute(
            select(Review, College.name, College.slug, User.email)
            .join(College, College.id == Review.college_id)
            .outerjoin(User, User.id == Review.user_id)
            .where(*conds)
            .order_by(Review.checked.asc(), Review.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    ids = [r.id for r, *_ in rows]
    reply_counts = dict((await db.execute(select(ReviewReply.review_id, func.count()).where(ReviewReply.review_id.in_(ids)).group_by(ReviewReply.review_id))).all()) if ids else {}
    data = [
        {
            "id": str(r.id),
            "collegeName": name,
            "collegeSlug": slug,
            "author": r.author_name,
            "email": email or "",
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
            "checked": bool(r.checked),
            "replyCount": reply_counts.get(r.id, 0),
            "createdAt": _iso(r.created_at),
        }
        for r, name, slug, email in rows
    ]
    return ListResponse[dict](meta=Meta(total=total, page=page, limit=limit, pages=max(1, -(-total // limit))), data=data)


class DecisionBody(BaseModel):
    approved: bool
    model_config = ConfigDict(extra="forbid")


async def _review(db, review_id: str) -> Review:
    try:
        wanted = uuid.UUID(review_id)
    except ValueError:
        raise NotFoundError("Review") from None
    review = await db.get(Review, wanted)
    if review is None:
        raise NotFoundError("Review")
    return review


@router.put("/ratings/{review_id}", response_model=SuccessResponse[dict])
async def decide_rating(review_id: str, body: DecisionBody, _admin: AdminPayload, db: DbSession):
    """Shows a review on its college's page, or hides it. Either way it counts as checked. The rating follows."""
    review = await _review(db, review_id)
    review.is_approved = body.approved
    review.checked = True
    await db.flush()
    await refresh_college_rating(db, review.college_id)
    await db.commit()
    return SuccessResponse[dict](data={"approved": body.approved})


@router.put("/ratings/{review_id}/checked", response_model=SuccessResponse[dict])
async def mark_checked(review_id: str, _admin: AdminPayload, db: DbSession):
    """The team has looked at a review and is happy for it to stay."""
    review = await _review(db, review_id)
    review.checked = True
    await db.commit()
    return SuccessResponse[dict](data={"checked": True})


@router.delete("/ratings/{review_id}", response_model=SuccessResponse[dict])
async def delete_rating(review_id: str, _admin: AdminPayload, db: DbSession):
    """Removes a review for good. The college's rating and count follow."""
    review = await _review(db, review_id)
    college_id = review.college_id
    await db.delete(review)
    await db.flush()
    await refresh_college_rating(db, college_id)
    await db.commit()
    return SuccessResponse[dict](data={"deleted": True})


@router.get("/ratings/{review_id}/replies", response_model=SuccessResponse[list])
async def rating_replies(review_id: str, _admin: AdminPayload, db: DbSession):
    """The replies under one review, oldest first, for the team to read and remove."""
    review = await _review(db, review_id)
    rows = (await db.execute(select(ReviewReply).where(ReviewReply.review_id == review.id).order_by(ReviewReply.created_at.asc()))).scalars().all()
    return SuccessResponse[list](
        data=[
            {"id": str(x.id), "parentId": str(x.parent_id) if x.parent_id else None, "author": x.author_name, "body": x.body, "createdAt": _iso(x.created_at)}
            for x in rows
        ]
    )


@router.delete("/review-replies/{reply_id}", response_model=SuccessResponse[dict])
async def delete_review_reply(reply_id: str, _admin: AdminPayload, db: DbSession):
    """Removes a reply (and the replies under it)."""
    try:
        wanted = uuid.UUID(reply_id)
    except ValueError:
        raise NotFoundError("Reply") from None
    reply = await db.get(ReviewReply, wanted)
    if reply is None:
        raise NotFoundError("Reply")
    await db.delete(reply)
    await db.commit()
    return SuccessResponse[dict](data={"deleted": True})
