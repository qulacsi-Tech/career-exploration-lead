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
from models.review import Review
from models.user import User
from routers.questions import Staff
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
        data["ratings"] = await count(Review, Review.is_approved.is_(False))
    return SuccessResponse[dict](data=data)


def _iso(value) -> Optional[str]:
    return value.isoformat() if value else None


@router.get("/ratings", response_model=ListResponse[dict])
async def list_ratings(
    _admin: AdminPayload,
    db: DbSession,
    status: str = Query("pending", pattern="^(pending|approved|all)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    """Every review students have written, with its four ratings and the comment on each."""
    conds = []
    if status == "pending":
        conds.append(Review.is_approved.is_(False))
    elif status == "approved":
        conds.append(Review.is_approved.is_(True))
    total = int((await db.execute(select(func.count()).select_from(Review).where(*conds))).scalar_one())
    rows = (
        await db.execute(
            select(Review, College.name, College.slug, User.email)
            .join(College, College.id == Review.college_id)
            .outerjoin(User, User.id == Review.user_id)
            .where(*conds)
            .order_by(Review.is_approved.asc(), Review.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
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
            "createdAt": _iso(r.created_at),
        }
        for r, name, slug, email in rows
    ]
    return ListResponse[dict](meta=Meta(total=total, page=page, limit=limit, pages=max(1, -(-total // limit))), data=data)


class DecisionBody(BaseModel):
    approved: bool
    model_config = ConfigDict(extra="forbid")


@router.put("/ratings/{review_id}", response_model=SuccessResponse[dict])
async def decide_rating(review_id: str, body: DecisionBody, _admin: AdminPayload, db: DbSession):
    """Shows a review on its college's page (approve) or hides it (reject). The college's rating follows."""
    try:
        wanted = uuid.UUID(review_id)
    except ValueError:
        raise NotFoundError("Review") from None
    review = await db.get(Review, wanted)
    if review is None:
        raise NotFoundError("Review")
    review.is_approved = body.approved
    await db.flush()
    live = (await db.execute(select(Review.rating).where(Review.college_id == review.college_id, Review.is_approved.is_(True)))).scalars().all()
    college = await db.get(College, review.college_id)
    if college is not None and live:
        college.rating = round(sum(live) / len(live), 1)
        college.review_count = len(live)
    elif college is not None:
        college.review_count = 0
    await db.commit()
    return SuccessResponse[dict](data={"approved": body.approved})
