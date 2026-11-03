"""One college's activity in one place: its page views, the leads that came to it, the questions students asked
and the reviews they wrote. ADMIN role required.

It backs the Analytics button on the admin college list. Everything is a read of records the site already keeps,
so nothing here changes anything.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter
from sqlalchemy import distinct, func, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError
from models.college import College
from models.lead import Lead, LeadStatus
from models.question import Question, QuestionHelpful
from models.review import Review, ReviewVote
from models.tracking import Event
from models.user import User
from routers.reviews import _counts
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/colleges", tags=["admin"])

RECENT = 60  # the newest of each, so the dialog stays quick however busy a college is
DAYS = 14


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _value(x) -> str:
    return x.value if hasattr(x, "value") else str(x)


@router.get("/{slug}/analytics", response_model=SuccessResponse[dict])
async def college_analytics(slug: str, _admin: AdminPayload, db: DbSession):
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)

    # ── Page views ──────────────────────────────────────────────────────────
    views_filter = (Event.college_slug == slug, Event.name == "page_view")
    views30, visitors30 = (
        await db.execute(select(func.count(), func.count(distinct(Event.visitor_id))).where(*views_filter, Event.occurred_at >= since))
    ).one()
    per_day = {
        str(day): int(count)
        for day, count in (
            await db.execute(
                select(func.date(Event.occurred_at), func.count())
                .where(*views_filter, Event.occurred_at >= now - timedelta(days=DAYS - 1))
                .group_by(func.date(Event.occurred_at))
            )
        ).all()
    }
    daily = []
    for back in range(DAYS - 1, -1, -1):
        day = (now - timedelta(days=back)).date().isoformat()
        daily.append({"date": day, "views": per_day.get(day, 0)})

    # ── Leads (enquiries, counselling requests, callbacks, brochure downloads) ──
    leads = (await db.execute(select(Lead).where(Lead.college_slug == slug).order_by(Lead.created_at.desc()).limit(RECENT))).scalars().all()
    leads_total = (await db.execute(select(func.count()).select_from(Lead).where(Lead.college_slug == slug))).scalar_one()
    leads_new = (await db.execute(select(func.count()).select_from(Lead).where(Lead.college_slug == slug, Lead.status == LeadStatus.NEW))).scalar_one()
    leads30 = (await db.execute(select(func.count()).select_from(Lead).where(Lead.college_slug == slug, Lead.created_at >= since))).scalar_one()

    # ── Questions ───────────────────────────────────────────────────────────
    qrows = (
        await db.execute(
            select(Question, User.name)
            .outerjoin(User, User.id == Question.user_id)
            .where(Question.college_id == college.id)
            .order_by(Question.answer.is_(None).desc(), Question.created_at.desc())
            .limit(RECENT)
        )
    ).all()
    q_total = (await db.execute(select(func.count()).select_from(Question).where(Question.college_id == college.id))).scalar_one()
    q_waiting = (await db.execute(select(func.count()).select_from(Question).where(Question.college_id == college.id, Question.answer.is_(None)))).scalar_one()
    q_shown = (await db.execute(select(func.count()).select_from(Question).where(Question.college_id == college.id, Question.is_published.is_(True)))).scalar_one()
    q_ids = [q.id for q, _ in qrows]
    helpful = (
        dict((await db.execute(select(QuestionHelpful.question_id, func.count()).where(QuestionHelpful.question_id.in_(q_ids)).group_by(QuestionHelpful.question_id))).all())
        if q_ids
        else {}
    )

    # ── Reviews ─────────────────────────────────────────────────────────────
    reviews = (await db.execute(select(Review).where(Review.college_id == college.id).order_by(Review.is_approved.asc(), Review.created_at.desc()).limit(RECENT))).scalars().all()
    r_total = (await db.execute(select(func.count()).select_from(Review).where(Review.college_id == college.id))).scalar_one()
    r_pending = (await db.execute(select(func.count()).select_from(Review).where(Review.college_id == college.id, Review.is_approved.is_(False)))).scalar_one()
    r_avg = (await db.execute(select(func.avg(Review.rating)).where(Review.college_id == college.id, Review.is_approved.is_(True)))).scalar_one()
    votes = await _counts(db, [r.id for r in reviews])
    # Who reacted, so the team can see the names behind each count.
    reactions: dict = {}
    if reviews:
        voters = (
            await db.execute(
                select(ReviewVote.review_id, ReviewVote.vote, User.name, User.email)
                .join(User, User.id == ReviewVote.user_id)
                .where(ReviewVote.review_id.in_([r.id for r in reviews]))
                .order_by(ReviewVote.created_at.desc())
            )
        ).all()
        for review_id, vote, voter_name, voter_email in voters:
            reactions.setdefault(review_id, {"like": [], "dislike": []})["like" if vote == 1 else "dislike"].append({"name": voter_name, "email": voter_email})

    return SuccessResponse[dict](
        data={
            "college": {"name": college.name, "slug": college.slug},
            "summary": {
                "views30": int(views30),
                "visitors30": int(visitors30),
                "leads": int(leads_total),
                "leadsNew": int(leads_new),
                "leads30": int(leads30),
                "questions": int(q_total),
                "questionsWaiting": int(q_waiting),
                "questionsShown": int(q_shown),
                "reviews": int(r_total),
                "reviewsPending": int(r_pending),
                "rating": round(float(r_avg), 1) if r_avg is not None else None,
            },
            "daily": daily,
            "leads": [
                {
                    "id": str(l.id),
                    "name": l.name,
                    "phone": l.phone,
                    "email": l.email or "",
                    "type": _value(l.type),
                    "status": _value(l.status),
                    "message": l.message or "",
                    "programName": l.program_name or "",
                    "city": l.city or "",
                    "repeats": l.repeat_count or 0,
                    "createdAt": _iso(l.created_at),
                }
                for l in leads
            ],
            "questions": [
                {
                    "id": str(q.id),
                    "kind": q.kind,
                    "question": q.body,
                    "askedBy": name or "A student",
                    "answer": q.answer or "",
                    "answeredBy": {"college": "College", "experts": "Career Experts"}.get(q.answered_by_role or "", ""),
                    "published": bool(q.is_published),
                    "helpful": int(helpful.get(q.id, 0)),
                    "createdAt": _iso(q.created_at),
                }
                for q, name in qrows
            ],
            "reviews": [
                {
                    "id": str(r.id),
                    "author": r.author_name,
                    "course": r.course,
                    "batch": r.batch,
                    "rating": r.rating,
                    "body": r.body,
                    "approved": bool(r.is_approved),
                    "likes": votes.get(r.id, (0, 0))[0],
                    "dislikes": votes.get(r.id, (0, 0))[1],
                    "likedBy": reactions.get(r.id, {}).get("like", []),
                    "dislikedBy": reactions.get(r.id, {}).get("dislike", []),
                    "createdAt": _iso(r.created_at),
                }
                for r in reviews
            ],
        }
    )
