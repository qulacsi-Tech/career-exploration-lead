"""Practice tests. Public: the test list, a test to sit, and submitting an attempt.

A test is served without its correct answers. Submitting an attempt returns the
score and, only then, each question's correct answer and solution.
"""

from typing import Literal, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError

from core.dependencies import DbSession
from core.exceptions import ValidationError
from schemas.common import SuccessResponse
from services.practice import load_content, published_tests, require_published, score

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
async def submit_test(slug: str, db: DbSession, body: dict):
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
    responses = {qid: r.model_dump() for qid, r in data.responses.items()}
    return SuccessResponse[dict](data=score(content, test, responses))
