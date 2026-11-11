"""Keeping a student's practice attempts, and the lead each one feeds.

Every submitted paper is saved as an attempt. The student's attempts at an exam are summed up in one lead
(type "practice") for that student and exam, which the platform team can share with a sponsored college like any other
lead. The lead carries the student's contact details only as far as they agreed to be contacted: it is shareable only
when they did (see routers/admin_lead_sharing.py).
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.exam import Exam
from models.lead import Lead, LeadStatus, LeadType
from models.practice_attempt import PracticeAttempt
from models.user import User
from services.notify import notify, platform_admin_ids


def _num(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:.1f}"


async def attempts_status(db: AsyncSession, user_id: UUID, test: dict) -> dict:
    """How many times the student may sit this test, how many they have, and how many are left. `None`: no limit."""
    allowed = test.get("attemptsAllowed")
    used = int((await db.execute(select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.user_id == user_id, PracticeAttempt.test_slug == test["slug"]))).scalar_one())
    return {"allowed": allowed, "used": used, "left": None if allowed is None else max(0, int(allowed) - used)}


def _left_text(status: dict) -> str:
    if status["left"] is None:
        return "You can take this test as many times as you like."
    if status["left"] == 0:
        return "That was your last attempt. You have no attempts left on this test."
    return f"You have {status['left']} {'attempt' if status['left'] == 1 else 'attempts'} left on this test."


async def record_attempt(db: AsyncSession, user_id: UUID, test: dict, result: dict) -> dict:
    """Saves the scored attempt, brings the student's lead for this exam up to date, and tells the student how many attempts are left.

    Returns the attempts status after this attempt.
    """
    exam = (await db.execute(select(Exam).where(Exam.slug == test["examSlug"]))).scalar_one_or_none()
    attempt = PracticeAttempt(
        user_id=user_id,
        test_slug=test["slug"],
        exam_slug=test["examSlug"],
        test_title=test["title"][:200],
        exam_name=(exam.name if exam else test["examSlug"])[:500],
        score=float(result["score"]),
        max_score=float(result["maxScore"]),
        correct=int(result["correct"]),
        incorrect=int(result["incorrect"]),
        skipped=int(result["skipped"]),
        accuracy=float(result["accuracy"]),
        total_seconds=int(round(result["totalSeconds"])),
        sections=[
            {"label": s["label"], "score": s["score"], "maxScore": s["maxScore"], "correct": s["correct"], "incorrect": s["incorrect"], "skipped": s["skipped"]}
            for s in result["sections"]
        ],
    )
    db.add(attempt)
    await db.flush()
    await _update_lead(db, user_id, exam, attempt)
    await db.commit()
    status = await attempts_status(db, user_id, test)
    await notify(
        db,
        [user_id],
        kind="practice.attempt",
        title=f"{attempt.test_title}: you scored {_num(attempt.score)}/{_num(attempt.max_score)}",
        body=_left_text(status),
        link="/account/activity",
    )
    # The platform team hears about every attempt too, and finds the student in Leads, Exam leads.
    try:
        student = await db.get(User, user_id)
        admins = await platform_admin_ids(db)
        if student is not None and admins:
            await notify(
                db,
                admins,
                kind="practice.attempt.admin",
                title=f"{student.name} sat {attempt.test_title}",
                body=f"Scored {_num(attempt.score)}/{_num(attempt.max_score)} ({attempt.accuracy:.0f}% accuracy) on {attempt.exam_name}. Attempt {status['used']}.",
                link=f"/admin/leads/exams/{user_id}/{attempt.exam_slug}",
            )
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not tell the platform team about a practice attempt")
    return status


async def _update_lead(db: AsyncSession, user_id: UUID, exam: Exam | None, attempt: PracticeAttempt) -> None:
    user = await db.get(User, user_id)
    if user is None:
        return
    stats = (
        await db.execute(
            select(func.count(), func.max(PracticeAttempt.score))
            .where(PracticeAttempt.user_id == user_id, PracticeAttempt.exam_slug == attempt.exam_slug)
        )
    ).one()
    count, best = int(stats[0]), float(stats[1] or 0)
    exam_name = attempt.exam_name
    message = (
        f"Practice test: {attempt.test_title}. Scored {_num(attempt.score)}/{_num(attempt.max_score)} "
        f"({attempt.accuracy:.0f}% accuracy). {count} {'attempt' if count == 1 else 'attempts'} on {exam_name}, best score {_num(best)}."
    )[:2000]
    url = f"/exams/{attempt.exam_slug}"
    lead = (
        await db.execute(select(Lead).where(Lead.user_id == user_id, Lead.type == LeadType.PRACTICE, Lead.source_url == url))
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    consent = bool(user.marketing_consent)
    if lead is None:
        db.add(
            Lead(
                name=user.name[:200],
                phone=(user.phone or "")[:20],
                email=user.email,
                type=LeadType.PRACTICE,
                status=LeadStatus.NEW,
                user_id=user_id,
                stream=(exam.stream if exam and exam.stream else None),
                city=user.city,
                message=message,
                program_name=exam_name[:200],
                source="practice",
                source_url=url,
                consent=consent,
                consent_at=now if consent else None,
            )
        )
        return
    # The same student and exam again: one lead, kept current with the latest sitting.
    lead.message = message
    lead.name = user.name[:200]
    lead.phone = (user.phone or lead.phone or "")[:20]
    lead.email = user.email
    lead.city = user.city or lead.city
    if consent and not lead.consent:
        lead.consent = True
        lead.consent_at = now
