"""Students who sat practice tests, for the platform team (Leads, Exam leads). ADMIN role required.

One row for each student and exam, with how many attempts they made, their best and latest score, and whether they
agreed to be contacted. A row opens the student's attempts, test by test, with every score.
"""

import uuid

from fastapi import APIRouter, Query
from sqlalchemy import distinct, func, or_, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.practice_attempt import PracticeAttempt
from models.user import User
from schemas.common import Meta, SuccessResponse

router = APIRouter(prefix="/admin/exam-leads", tags=["admin"])


def _meta(total: int, page: int, limit: int) -> Meta:
    return Meta(total=int(total), page=page, limit=limit, pages=max(1, -(-int(total) // limit)))


def _attempt(a: PracticeAttempt) -> dict:
    return {
        "id": str(a.id),
        "testSlug": a.test_slug,
        "testTitle": a.test_title,
        "score": a.score,
        "maxScore": a.max_score,
        "correct": a.correct,
        "incorrect": a.incorrect,
        "skipped": a.skipped,
        "accuracy": a.accuracy,
        "totalSeconds": a.total_seconds,
        "sections": a.sections or [],
        "submittedAt": a.submitted_at.isoformat() if a.submitted_at else None,
    }


def _percent(a: PracticeAttempt) -> float:
    return (a.score / a.max_score) * 100 if a.max_score else 0


@router.get("", response_model=SuccessResponse[dict])
async def exam_leads(
    _admin: AdminPayload,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=100),
    exam: str = Query("", max_length=200),
):
    """A page of students who sat practice tests (one row for each student and exam), newest activity first."""
    conditions = []
    if q.strip():
        like = f"%{q.strip()}%"
        conditions.append(or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like), User.city.ilike(like), PracticeAttempt.exam_name.ilike(like)))
    if exam:
        conditions.append(PracticeAttempt.exam_slug == exam)

    pairs = (
        select(PracticeAttempt.user_id, PracticeAttempt.exam_slug)
        .join(User, User.id == PracticeAttempt.user_id)
        .where(*conditions)
        .group_by(PracticeAttempt.user_id, PracticeAttempt.exam_slug)
    )
    total = (await db.execute(select(func.count()).select_from(pairs.subquery()))).scalar_one()

    latest = func.max(PracticeAttempt.submitted_at)
    page_rows = (
        await db.execute(
            select(PracticeAttempt.user_id, PracticeAttempt.exam_slug, func.count(), func.count(distinct(PracticeAttempt.test_slug)), latest)
            .join(User, User.id == PracticeAttempt.user_id)
            .where(*conditions)
            .group_by(PracticeAttempt.user_id, PracticeAttempt.exam_slug)
            .order_by(latest.desc(), PracticeAttempt.user_id, PracticeAttempt.exam_slug)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()

    items: list[dict] = []
    if page_rows:
        keys = {(r[0], r[1]) for r in page_rows}
        attempts = (
            await db.execute(
                select(PracticeAttempt)
                .where(PracticeAttempt.user_id.in_({k[0] for k in keys}), PracticeAttempt.exam_slug.in_({k[1] for k in keys}))
                .order_by(PracticeAttempt.submitted_at.desc())
            )
        ).scalars().all()
        by_pair: dict[tuple, list[PracticeAttempt]] = {}
        for a in attempts:
            if (a.user_id, a.exam_slug) in keys:
                by_pair.setdefault((a.user_id, a.exam_slug), []).append(a)
        users = {u.id: u for u in (await db.execute(select(User).where(User.id.in_({k[0] for k in keys})))).scalars().all()}
        for user_id, exam_slug, count, tests, last_at in page_rows:
            rows = by_pair.get((user_id, exam_slug), [])
            user = users.get(user_id)
            if not rows or user is None:
                continue
            newest = rows[0]
            best = max(rows, key=_percent)
            items.append(
                {
                    "userId": str(user_id),
                    "name": user.name,
                    "email": user.email,
                    "phone": user.phone or "",
                    "city": user.city or "",
                    "contactOk": bool(user.marketing_consent),
                    "examSlug": exam_slug,
                    "examName": newest.exam_name,
                    "attempts": int(count),
                    "tests": int(tests),
                    "bestScore": best.score,
                    "bestMax": best.max_score,
                    "lastScore": newest.score,
                    "lastMax": newest.max_score,
                    "lastTest": newest.test_title,
                    "lastAt": last_at.isoformat() if last_at else None,
                }
            )

    exams = (await db.execute(select(PracticeAttempt.exam_slug, func.max(PracticeAttempt.exam_name)).group_by(PracticeAttempt.exam_slug).order_by(func.max(PracticeAttempt.exam_name)))).all()
    return SuccessResponse[dict](
        data={"items": items, "meta": _meta(total, page, limit).model_dump(), "exams": [{"slug": e[0], "name": e[1]} for e in exams]}
    )


@router.get("/{user_id}/{exam_slug}", response_model=SuccessResponse[dict])
async def exam_lead_detail(user_id: str, exam_slug: str, _admin: AdminPayload, db: DbSession):
    """One student's attempts on one exam, newest first, with each score and its sections."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError as exc:
        raise ValidationError("user_id: not a valid id.") from exc
    user = await db.get(User, uid)
    attempts = (
        await db.execute(
            select(PracticeAttempt)
            .where(PracticeAttempt.user_id == uid, PracticeAttempt.exam_slug == exam_slug)
            .order_by(PracticeAttempt.submitted_at.desc())
        )
    ).scalars().all()
    if user is None or not attempts:
        raise NotFoundError("Exam lead")
    return SuccessResponse[dict](
        data={
            "student": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "phone": user.phone or "",
                "city": user.city or "",
                "state": user.state or "",
                "contactOk": bool(user.marketing_consent),
            },
            "examSlug": exam_slug,
            "examName": attempts[0].exam_name,
            "attempts": [_attempt(a) for a in attempts],
        }
    )
