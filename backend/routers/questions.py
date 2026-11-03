"""Student questions to a college: asking, answering, approving for display, and "helpful" votes.

The flow:
  - A signed-in student asks a question or raises a concern on a college's page. The platform team and the
    college's own admin are both told.
  - Either can answer. The latest answer stands: a platform admin's shows as "Career Experts", a college
    admin's as the college. A college admin's answer has to be approved again before it is shown.
  - Only the platform team can approve a question and its answer for the college's Q&A page.
  - Any other signed-in student can mark a published answer helpful, once; the count is shown.
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated, Literal, Optional

import jwt
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, func, select

from core.dependencies import CurrentUserId, DbSession, OptionalUserId
from core.exceptions import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError
from core.security import decode_access_token
from models.college import College
from models.question import Question, QuestionHelpful
from models.user import ADMIN_ROLES, PANEL_ROLES, User, UserRole
from schemas.common import SuccessResponse

router = APIRouter(tags=["questions"])

QUESTION_MIN = 10
ROLE_LABEL = {"college": "College", "experts": "Career Experts"}


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _first_name(name: Optional[str]) -> str:
    return (name or "").strip().split(" ")[0] or "A student"


def _answer_out(q: Question) -> dict:
    return {
        "answer": q.answer,
        "answeredBy": ROLE_LABEL.get(q.answered_by_role or "", None),
        "answeredByRole": q.answered_by_role,
        "answeredAt": _iso(q.answered_at),
    }


# ── Students ────────────────────────────────────────────────────────────────

class AskBody(BaseModel):
    kind: Literal["question", "concern"] = "question"
    message: str = Field(min_length=QUESTION_MIN, max_length=900)
    model_config = ConfigDict(extra="forbid")

    @field_validator("message")
    @classmethod
    def _tidy(cls, value: str) -> str:
        value = value.strip()
        if len(value) < QUESTION_MIN:
            raise ValueError(f"Write at least {QUESTION_MIN} characters.")
        return value


@router.post("/colleges/{slug}/questions", response_model=SuccessResponse[dict], status_code=201)
async def ask_question(slug: str, data: AskBody, user_id: CurrentUserId, db: DbSession):
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotFoundError("Account")
    if user.role in PANEL_ROLES:
        raise ForbiddenError("Admin accounts cannot ask questions here. Use a student account.")

    question = Question(college_id=college.id, user_id=user_id, kind=data.kind, body=data.message)
    db.add(question)
    await db.commit()

    # The platform team and the college's own admin both see it. Never allowed to fail the question.
    try:
        from services.notify import college_admin_id, notify, platform_admin_ids

        recipients = set(await platform_admin_ids(db))
        owner = await college_admin_id(db, college.slug)
        if owner:
            recipients.add(owner)
        label = "concern" if data.kind == "concern" else "question"
        await notify(db, recipients, kind="question.new", title=f"New {label} for {college.name}", body=f"From {user.name}: {data.message[:160]}", link="/admin/questions")
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not notify about a new question")

    return SuccessResponse[dict](data={"id": str(question.id), "message": "Thank you! Our team will reply, and you will see it under your account."})


@router.get("/colleges/{slug}/questions", response_model=SuccessResponse[list])
async def college_questions(slug: str, db: DbSession, user_id: OptionalUserId):
    """The questions approved for this college's Q&A page, with how many found each helpful and whether the caller did."""
    college = (await db.execute(select(College.id).where(College.slug == slug))).first()
    if college is None:
        raise NotFoundError("College")
    rows = (
        await db.execute(
            select(Question, User.name)
            .outerjoin(User, User.id == Question.user_id)
            .where(Question.college_id == college[0], Question.is_published.is_(True), Question.answer.is_not(None))
            .order_by(Question.answered_at.desc().nullslast(), Question.created_at.desc())
        )
    ).all()
    ids = [q.id for q, _ in rows]
    counts: dict = {}
    mine: set = set()
    if ids:
        counts = dict((await db.execute(select(QuestionHelpful.question_id, func.count()).where(QuestionHelpful.question_id.in_(ids)).group_by(QuestionHelpful.question_id))).all())
        if user_id:
            mine = set((await db.execute(select(QuestionHelpful.question_id).where(QuestionHelpful.question_id.in_(ids), QuestionHelpful.user_id == user_id))).scalars().all())
    return SuccessResponse[list](
        data=[
            {
                "id": str(q.id),
                "kind": q.kind,
                "question": q.body,
                "askedBy": _first_name(name),
                "askedAt": _iso(q.created_at),
                **_answer_out(q),
                "helpful": int(counts.get(q.id, 0)),
                "helpfulByMe": q.id in mine,
            }
            for q, name in rows
        ]
    )


@router.post("/questions/{question_id}/helpful", response_model=SuccessResponse[dict])
async def toggle_helpful(question_id: str, user_id: CurrentUserId, db: DbSession):
    """Marks a published answer helpful, or takes the mark back. A student cannot vote on their own question."""
    try:
        wanted = uuid.UUID(question_id)
    except ValueError:
        raise NotFoundError("Question") from None
    question = await db.get(Question, wanted)
    if question is None or not question.is_published:
        raise NotFoundError("Question")
    voter = await db.get(User, user_id)
    if voter is not None and voter.role in PANEL_ROLES:
        raise ForbiddenError("Admin accounts cannot do this. Use a student account.")
    if question.user_id == user_id:
        raise ValidationError("You asked this one, so it is for others to say if it helped.")

    existing = (await db.execute(select(QuestionHelpful).where(QuestionHelpful.question_id == wanted, QuestionHelpful.user_id == user_id))).scalar_one_or_none()
    if existing:
        await db.execute(delete(QuestionHelpful).where(QuestionHelpful.question_id == wanted, QuestionHelpful.user_id == user_id))
        liked = False
    else:
        db.add(QuestionHelpful(question_id=wanted, user_id=user_id))
        liked = True
    await db.commit()
    count = (await db.execute(select(func.count()).select_from(QuestionHelpful).where(QuestionHelpful.question_id == wanted))).scalar_one()
    return SuccessResponse[dict](data={"helpful": int(count), "helpfulByMe": liked})


@router.get("/me/questions", response_model=SuccessResponse[list])
async def my_questions(user_id: CurrentUserId, db: DbSession):
    """The signed-in student's own questions, with any answer and whether it is on the college's page."""
    rows = (
        await db.execute(
            select(Question, College.name, College.slug)
            .join(College, College.id == Question.college_id)
            .where(Question.user_id == user_id)
            .order_by(Question.created_at.desc())
        )
    ).all()
    return SuccessResponse[list](
        data=[
            {
                "id": str(q.id),
                "kind": q.kind,
                "question": q.body,
                "collegeName": name,
                "collegeSlug": slug,
                "createdAt": _iso(q.created_at),
                "published": bool(q.is_published),
                **_answer_out(q),
            }
            for q, name, slug in rows
        ]
    )


# ── The team ────────────────────────────────────────────────────────────────

async def staff(db: DbSession, authorization: Annotated[Optional[str], Header()] = None) -> dict:
    """The platform team (all colleges) or a college admin (their own college). Read from the database each time."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    try:
        payload = decode_access_token(authorization.removeprefix("Bearer ").strip())
        user = await db.get(User, uuid.UUID(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired token.") from None
    if user is None or not user.is_active:
        raise UnauthorizedError("Invalid or expired token.")
    if user.role in ADMIN_ROLES:
        return {"user": user, "role": "experts", "college_id": None}
    if user.role == UserRole.COLLEGE_ADMIN and user.college_id and not user.must_change_password:
        return {"user": user, "role": "college", "college_id": user.college_id}
    raise ForbiddenError()


Staff = Annotated[dict, Depends(staff)]


def _admin_row(q: Question, college_name: str, college_slug: str, asker: Optional[User], helpful: int) -> dict:
    return {
        "id": str(q.id),
        "kind": q.kind,
        "question": q.body,
        "collegeName": college_name,
        "collegeSlug": college_slug,
        "askedBy": asker.name if asker else "A student",
        "askedByEmail": asker.email if asker else "",
        "createdAt": _iso(q.created_at),
        "published": bool(q.is_published),
        "helpful": helpful,
        **_answer_out(q),
        "answeredByName": q.answered_by_name,
    }


@router.get("/admin/questions", response_model=SuccessResponse[dict])
async def admin_questions(who: Staff, db: DbSession):
    stmt = (
        select(Question, College.name, College.slug, User)
        .join(College, College.id == Question.college_id)
        .outerjoin(User, User.id == Question.user_id)
        .order_by(Question.answer.is_(None).desc(), Question.created_at.desc())
        .limit(500)
    )
    if who["college_id"]:
        stmt = stmt.where(Question.college_id == who["college_id"])
    rows = (await db.execute(stmt)).all()
    ids = [q.id for q, *_ in rows]
    counts = dict((await db.execute(select(QuestionHelpful.question_id, func.count()).where(QuestionHelpful.question_id.in_(ids)).group_by(QuestionHelpful.question_id))).all()) if ids else {}
    return SuccessResponse[dict](
        data={
            # Who is asking decides what the screen offers: the platform team approves for display, a college admin cannot.
            "role": who["role"],
            "items": [_admin_row(q, name, slug, asker, int(counts.get(q.id, 0))) for q, name, slug, asker in rows],
        }
    )


class AnswerBody(BaseModel):
    answer: str = Field(min_length=2, max_length=2000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("answer")
    @classmethod
    def _tidy(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Write an answer.")
        return value


async def _load_for(who: dict, db, question_id: str) -> Question:
    try:
        wanted = uuid.UUID(question_id)
    except ValueError:
        raise NotFoundError("Question") from None
    question = await db.get(Question, wanted)
    if question is None or (who["college_id"] and question.college_id != who["college_id"]):
        raise NotFoundError("Question")
    return question


@router.put("/admin/questions/{question_id}/answer", response_model=SuccessResponse[dict])
async def answer_question(question_id: str, data: AnswerBody, who: Staff, db: DbSession):
    """Sets the answer. Whoever answers last replaces the earlier answer, and is the one it is credited to."""
    question = await _load_for(who, db, question_id)
    question.answer = data.answer
    question.answered_by_role = who["role"]
    question.answered_by_name = who["user"].name
    question.answered_at = datetime.now(timezone.utc)
    if who["role"] == "college":
        # A college's own words go live only after the platform team has looked at them again.
        question.is_published = False
    await db.commit()

    try:
        from services.notify import notify

        if question.user_id:
            college = await db.get(College, question.college_id)
            await notify(
                db,
                [question.user_id],
                kind="question.answered",
                title=f"Your question about {college.name if college else 'a college'} was answered",
                body=f"{ROLE_LABEL[who['role']]}: {data.answer[:160]}",
                link="/account/questions",
            )
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not tell the student their question was answered")
    return SuccessResponse[dict](data={"message": "Answer saved."})


class PublishBody(BaseModel):
    published: bool
    model_config = ConfigDict(extra="forbid")


@router.put("/admin/questions/{question_id}/publish", response_model=SuccessResponse[dict])
async def publish_question(question_id: str, data: PublishBody, who: Staff, db: DbSession):
    """Approves the question and its answer for the college's Q&A page, or takes it down. The platform team only."""
    if who["role"] != "experts":
        raise ForbiddenError("Only the platform team can decide what shows on the Q&A page.")
    question = await _load_for(who, db, question_id)
    if data.published and not question.answer:
        raise ConflictError("NOT_ANSWERED", "Answer the question before showing it on the Q&A page.")
    question.is_published = data.published
    await db.commit()
    return SuccessResponse[dict](data={"message": "Shown on the Q&A page." if data.published else "Hidden from the Q&A page."})
