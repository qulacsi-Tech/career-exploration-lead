"""How students do on an exam's practice tests, for the exam pages. Public; a signed-in student also sees where they stand.

Each student counts once, by their best attempt across the exam's tests (as a percentage of that test's marks), so a
student who retakes a test does not crowd the picture. Nothing here names anyone.
"""

from typing import Optional

from fastapi import APIRouter
from sqlalchemy import func, select

from core.dependencies import DbSession, OptionalUserId
from models.practice_attempt import PracticeAttempt
from schemas.common import SuccessResponse

router = APIRouter(prefix="/practice", tags=["practice"])

BANDS = 10  # 0-10%, 10-20%, ... 90-100%


def _percent_expr():
    return func.coalesce(PracticeAttempt.score * 100.0 / func.nullif(PracticeAttempt.max_score, 0), 0)


@router.get("/exam-counts", response_model=SuccessResponse[dict])
async def exam_counts(db: DbSession):
    """For the exam listing: how many students practised for each exam, and how many attempts they made."""
    rows = (
        await db.execute(
            select(PracticeAttempt.exam_slug, func.count(func.distinct(PracticeAttempt.user_id)), func.count())
            .group_by(PracticeAttempt.exam_slug)
        )
    ).all()
    return SuccessResponse[dict](data={slug: {"students": int(students), "attempts": int(attempts)} for slug, students, attempts in rows})


@router.get("/exams/{exam_slug}/stats", response_model=SuccessResponse[dict])
async def exam_stats(exam_slug: str, db: DbSession, user_id: OptionalUserId):
    """The crowd on this exam's practice tests and, for a signed-in student who has sat one, where they stand in it."""
    best_rows = (
        await db.execute(
            select(PracticeAttempt.user_id, func.max(_percent_expr()), func.count())
            .where(PracticeAttempt.exam_slug == exam_slug)
            .group_by(PracticeAttempt.user_id)
        )
    ).all()
    students = len(best_rows)
    attempts = sum(int(r[2]) for r in best_rows)
    if students == 0:
        return SuccessResponse[dict](data={"students": 0, "attempts": 0, "averagePercent": 0, "topPercent": 0, "bands": [0] * BANDS, "you": None})

    bests = [float(r[1] or 0) for r in best_rows]
    bands = [0] * BANDS
    for p in bests:
        bands[min(BANDS - 1, max(0, int(p // (100 / BANDS))))] += 1

    you: Optional[dict] = None
    if user_id is not None:
        mine = next((r for r in best_rows if r[0] == user_id), None)
        if mine is not None:
            my_best = float(mine[1] or 0)
            others = list(bests)
            others.remove(my_best)  # everyone but this student
            below = sum(1 for p in others if p < my_best)
            above = sum(1 for p in others if p > my_best)
            latest = (
                await db.execute(
                    select(PracticeAttempt.score, PracticeAttempt.max_score, PracticeAttempt.test_title)
                    .where(PracticeAttempt.exam_slug == exam_slug, PracticeAttempt.user_id == user_id)
                    .order_by(PracticeAttempt.submitted_at.desc())
                    .limit(1)
                )
            ).first()
            you = {
                "attempts": int(mine[2]),
                "bestPercent": round(my_best, 1),
                "rank": above + 1,
                # The share of the other students this student scored above. With nobody else yet, they lead.
                "percentile": round(below * 100 / len(others), 1) if others else 100.0,
                "band": min(BANDS - 1, max(0, int(my_best // (100 / BANDS)))),
                "latestScore": float(latest[0]) if latest else 0,
                "latestMax": float(latest[1]) if latest else 0,
                "latestTest": latest[2] if latest else "",
            }

    return SuccessResponse[dict](
        data={
            "students": students,
            "attempts": attempts,
            "averagePercent": round(sum(bests) / students, 1),
            "topPercent": round(max(bests), 1),
            "bands": bands,
            "you": you,
        }
    )


def _short_name(full: str) -> str:
    """"Sibaprasad Mishra" -> "Sibaprasad M." A leaderboard needs a name, not a full one."""
    parts = [p for p in (full or "").split() if p]
    if not parts:
        return "A student"
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0].upper()}."


@router.get("/exams/{exam_slug}/leaderboard", response_model=SuccessResponse[dict])
async def exam_leaderboard(exam_slug: str, db: DbSession, user_id: OptionalUserId):
    """The top ten on this exam's practice tests by best score, and the signed-in student's own row when they are lower."""
    from models.user import User

    rows = (
        await db.execute(
            select(PracticeAttempt.user_id, func.max(_percent_expr()).label("best"), func.count(), User.name)
            .join(User, User.id == PracticeAttempt.user_id)
            .where(PracticeAttempt.exam_slug == exam_slug)
            .group_by(PracticeAttempt.user_id, User.name)
            .order_by(func.max(_percent_expr()).desc(), func.min(PracticeAttempt.submitted_at))
        )
    ).all()
    entries = []
    rank = 0
    previous = None
    for i, (uid, best, count, name) in enumerate(rows):
        best = round(float(best or 0), 1)
        if best != previous:  # equal scores share a rank
            rank = i + 1
            previous = best
        entries.append({"rank": rank, "name": _short_name(name), "bestPercent": best, "attempts": int(count), "isYou": uid == user_id})
    top = entries[:10]
    mine = next((e for e in entries if e["isYou"]), None)
    return SuccessResponse[dict](data={"total": len(entries), "top": top, "you": mine if mine and mine not in top else None})


@router.get("/exams/{exam_slug}/cutoffs", response_model=SuccessResponse[list])
async def exam_cutoffs(exam_slug: str, db: DbSession):
    """The cut-offs published colleges list for this exam, with the number in each read out, so a result can be matched to them."""
    import re

    from models.college import College
    from models.cutoff import Cutoff
    from models.exam import Exam

    exam = (await db.execute(select(Exam).where(Exam.slug == exam_slug))).scalar_one_or_none()
    if exam is None:
        return SuccessResponse[list](data=[])
    # Colleges write the exam the way they know it: "CAT", or the full name.
    codes = {exam.name.strip().lower()}
    if exam.short_name:
        codes.add(exam.short_name.strip().lower())
    bracket = re.search(r"\(([^)]+)\)", exam.name)
    if bracket:
        codes.add(bracket.group(1).strip().lower())
    codes.add(re.sub(r"\s*\(.*\)\s*", "", exam.name).strip().lower())

    rows = (
        await db.execute(
            select(Cutoff, College)
            .join(College, College.id == Cutoff.college_id)
            .where(func.lower(func.trim(Cutoff.exam)).in_(codes), College.status == "published")
        )
    ).all()
    number = re.compile(r"\d+(?:\.\d+)?")
    out = []
    for cutoff, college in rows:
        found = number.search(cutoff.score or "")
        value = float(found.group(0)) if found else None
        out.append(
            {
                "slug": college.slug,
                "name": college.name,
                "city": college.city or "",
                "image": college.image or "",
                "category": cutoff.category,
                "course": " · ".join(x for x in (cutoff.course, cutoff.specialisation) if x),
                "score": cutoff.score,
                # Read as a percentile only when it can be one.
                "percentile": value if value is not None and 0 <= value <= 100 else None,
            }
        )
    return SuccessResponse[list](data=out)
