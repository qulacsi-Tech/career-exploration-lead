"""Admin editor for study-abroad content. ADMIN role required on every route.

Each kind has its own body model, so a destination, a step, a test and a FAQ
are validated against the fields the page renders. A row's key is taken from
its identifying field (country slug, step title, test name, question) and must
be unique within its kind.
"""

import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Body
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.study_abroad import StudyAbroadItem
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/study-abroad", tags=["admin"])

Kind = Literal["destination", "step", "test", "faq"]


class DestinationBody(BaseModel):
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    country: str = Field(min_length=2, max_length=100)
    tagline: str = Field(min_length=1, max_length=300)
    universities: str = Field(min_length=1, max_length=50)
    tuition: str = Field(min_length=1, max_length=100)
    living: str = Field(min_length=1, max_length=100)
    postStudyWork: str = Field(min_length=1, max_length=300)
    intakes: str = Field(min_length=1, max_length=200)
    popularCourses: list[str] = Field(default_factory=list, max_length=20)
    model_config = ConfigDict(extra="forbid")


class StepBody(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    window: str = Field(min_length=1, max_length=100)
    detail: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")


class TestBody(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    purpose: str = Field(min_length=1, max_length=300)
    validity: str = Field(min_length=1, max_length=100)
    href: Optional[str] = Field(default=None, max_length=300, pattern=r"^/[^\s]*$")
    model_config = ConfigDict(extra="forbid")


class FaqBody(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    answer: str = Field(min_length=1, max_length=3000)
    model_config = ConfigDict(extra="forbid")


class FiguresReviewedBody(BaseModel):
    value: str = Field(min_length=1, max_length=100)
    model_config = ConfigDict(extra="forbid")


BODIES: dict[str, type[BaseModel]] = {
    "destination": DestinationBody,
    "step": StepBody,
    "test": TestBody,
    "faq": FaqBody,
}

KEY_FIELD = {"destination": "slug", "step": "title", "test": "name", "faq": "question"}


def _validated(kind: str, raw: dict) -> tuple[str, dict]:
    """Checks the body against its kind and returns (key, data)."""
    try:
        model = BODIES[kind].model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc
    data = model.model_dump()
    return data[KEY_FIELD[kind]], data


async def _key_taken(db, kind: str, key: str, except_id: Optional[uuid.UUID] = None) -> bool:
    stmt = select(StudyAbroadItem.id).where(StudyAbroadItem.kind == kind, StudyAbroadItem.key == key)
    if except_id is not None:
        stmt = stmt.where(StudyAbroadItem.id != except_id)
    return (await db.execute(stmt)).scalar_one_or_none() is not None


@router.get("", response_model=SuccessResponse[dict])
async def admin_get_study_abroad(_admin: AdminPayload, db: DbSession):
    """Every row with its id, which the editor needs to update or delete it."""
    rows = (await db.execute(
        select(StudyAbroadItem).order_by(StudyAbroadItem.kind, StudyAbroadItem.position, StudyAbroadItem.key)
    )).scalars().all()

    def items(kind: str) -> list[dict]:
        return [{"id": str(r.id), **r.data} for r in rows if r.kind == kind]

    reviewed = next((r for r in rows if r.kind == "meta" and r.key == "figures_reviewed"), None)
    return SuccessResponse[dict](data={
        "figuresReviewed": reviewed.data["value"] if reviewed else None,
        "destinations": items("destination"),
        "applicationSteps": items("step"),
        "admissionTests": items("test"),
        "faqs": items("faq"),
    })


@router.post("/{kind}", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_item(
    kind: Kind,
    _admin: AdminPayload,
    db: DbSession,
    body: dict = Body(...),
):
    key, data = _validated(kind, body)
    if await _key_taken(db, kind, key):
        raise ConflictError("STUDY_ABROAD_KEY_TAKEN", f"A {kind} named '{key}' already exists.")

    count = (await db.execute(
        select(func.count()).select_from(StudyAbroadItem).where(StudyAbroadItem.kind == kind)
    )).scalar_one()
    item = StudyAbroadItem(id=uuid.uuid4(), kind=kind, key=key, position=count, data=data)
    db.add(item)
    await db.commit()
    return SuccessResponse[dict](data={"id": str(item.id), **data})


@router.put("/{kind}/{item_id}", response_model=SuccessResponse[dict])
async def admin_update_item(
    kind: Kind,
    item_id: uuid.UUID,
    _admin: AdminPayload,
    db: DbSession,
    body: dict = Body(...),
):
    item = (await db.execute(
        select(StudyAbroadItem).where(StudyAbroadItem.id == item_id, StudyAbroadItem.kind == kind)
    )).scalar_one_or_none()
    if item is None:
        raise NotFoundError(f"Study abroad {kind}")

    key, data = _validated(kind, body)
    if key != item.key and await _key_taken(db, kind, key, except_id=item.id):
        raise ConflictError("STUDY_ABROAD_KEY_TAKEN", f"A {kind} named '{key}' already exists.")

    item.key = key
    item.data = data
    await db.commit()
    return SuccessResponse[dict](data={"id": str(item.id), **data})


@router.delete("/{kind}/{item_id}", response_model=SuccessResponse[dict])
async def admin_delete_item(kind: Kind, item_id: uuid.UUID, _admin: AdminPayload, db: DbSession):
    item = (await db.execute(
        select(StudyAbroadItem).where(StudyAbroadItem.id == item_id, StudyAbroadItem.kind == kind)
    )).scalar_one_or_none()
    if item is None:
        raise NotFoundError(f"Study abroad {kind}")
    await db.delete(item)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Deleted."})


@router.put("/figures-reviewed", response_model=SuccessResponse[dict])
async def admin_set_figures_reviewed(_admin: AdminPayload, db: DbSession, body: dict = Body(...)):
    """The "reviewed" date shown beside the indicative figures."""
    try:
        value = FiguresReviewedBody.model_validate(body).value
    except PydanticValidationError as exc:
        raise ValidationError(str(exc.errors()[0]["msg"])) from exc

    row = (await db.execute(
        select(StudyAbroadItem).where(StudyAbroadItem.kind == "meta", StudyAbroadItem.key == "figures_reviewed")
    )).scalar_one_or_none()
    if row is None:
        row = StudyAbroadItem(id=uuid.uuid4(), kind="meta", key="figures_reviewed", position=0, data={"value": value})
        db.add(row)
    else:
        row.data = {"value": value}
    await db.commit()
    return SuccessResponse[dict](data={"figuresReviewed": value})
