"""A student's own practice-test history, for My account (Activity, Practice tests)."""

from fastapi import APIRouter
from sqlalchemy import select

from core.dependencies import CurrentUserId, DbSession
from models.practice_attempt import PracticeAttempt
from services.practice import load_content
from schemas.common import SuccessResponse

router = APIRouter(prefix="/me/practice-attempts", tags=["me"])

MAX_ATTEMPTS = 500


@router.get("", response_model=SuccessResponse[list])
async def my_attempts(user_id: CurrentUserId, db: DbSession):
    """Every practice test this student finished, newest first, with its score. The page groups them by exam."""
    rows = (
        await db.execute(
            select(PracticeAttempt)
            .where(PracticeAttempt.user_id == user_id)
            .order_by(PracticeAttempt.submitted_at.desc())
            .limit(MAX_ATTEMPTS)
        )
    ).scalars().all()
    # The limit an admin has set on each test now, so the page can say how many attempts are left.
    tests = (await load_content(db)).tests
    return SuccessResponse[list](
        data=[
            {
                "attemptsAllowed": (tests.get(a.test_slug) or {}).get("attemptsAllowed"),
                "id": str(a.id),
                "testSlug": a.test_slug,
                "examSlug": a.exam_slug,
                "testTitle": a.test_title,
                "examName": a.exam_name,
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
            for a in rows
        ]
    )
