"""Practice tests. Public: the test list, a test to sit, and submitting an attempt.

A test is served without its correct answers. Submitting an attempt returns the
score and, only then, each question's correct answer and solution.
"""

from typing import Literal, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError

from core.dependencies import CurrentUserId, DbSession
from core.exceptions import ConflictError, ValidationError
from schemas.common import SuccessResponse
from services.practice import load_content, published_tests, require_published, score
from services.practice_attempts import attempts_status, human_wait, record_attempt

router = APIRouter(prefix="/practice", tags=["practice"])

MAX_RESPONSES = 500


class SavedBody(BaseModel):
    optionIds: Optional[list[str]] = Field(default=None, max_length=20)
    value: Optional[str] = Field(default=None, max_length=50)
    model_config = ConfigDict(extra="forbid")


class ResponseBody(BaseModel):
    status: Literal["not-visited", "not-answered", "answered", "marked", "answered-marked"]
    saved: Optional[SavedBody] = None
    secondsSpent: float = Field(default=0, ge=0, le=86400)
    model_config = ConfigDict(extra="forbid")


class SubmitBody(BaseModel):
    responses: dict[str, ResponseBody] = Field(default_factory=dict)
    model_config = ConfigDict(extra="forbid")


@router.get("/tests", response_model=SuccessResponse[list])
async def list_tests(db: DbSession, exam: Optional[str] = Query(None, max_length=100)):
    content = await load_content(db)
    return SuccessResponse[list](data=published_tests(content, exam))


@router.get("/tests/{slug}", response_model=SuccessResponse[dict])
async def get_test(slug: str, db: DbSession):
    content = await load_content(db)
    return SuccessResponse[dict](data=content.public_test(require_published(content, slug)))


@router.post("/tests/{slug}/submit", response_model=SuccessResponse[dict])
async def submit_test(slug: str, db: DbSession, body: dict, user_id: CurrentUserId):
    """Scores a finished paper. From a signed-in account only."""
    try:
        data = SubmitBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    if len(data.responses) > MAX_RESPONSES:
        raise ValidationError(f"responses: at most {MAX_RESPONSES} allowed.")

    content = await load_content(db)
    test = require_published(content, slug)
    # The limit an admin set for this test is enforced here, so a second tab or an old link cannot get around it.
    before = await attempts_status(db, user_id, test)
    if before["left"] == 0:
        raise ConflictError("NO_ATTEMPTS_LEFT", f"You have used all {before['allowed']} attempts allowed on this test.")
    # The gap an admin set between attempts: a paper opened too early (an old tab) is not counted.
    if before["waitSeconds"] > 0:
        raise ConflictError("RETAKE_TOO_SOON", f"You can re-attempt this test after {human_wait(before['waitSeconds'])}.")
    responses = {qid: r.model_dump() for qid, r in data.responses.items()}
    result = score(content, test, responses)
    # Kept on the student's profile, and counted in the lead made for them and this exam.
    result["attempts"] = await record_attempt(db, user_id, test, result)
    return SuccessResponse[dict](data=result)


@router.get("/tests/{slug}/attempts", response_model=SuccessResponse[dict])
async def my_attempts_on_test(slug: str, db: DbSession, user_id: CurrentUserId):
    """For the signed-in student: how many attempts this test allows, how many they have used, how many are left."""
    content = await load_content(db)
    test = require_published(content, slug)
    return SuccessResponse[dict](data=await attempts_status(db, user_id, test))
