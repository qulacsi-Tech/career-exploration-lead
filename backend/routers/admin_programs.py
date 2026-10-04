"""Admin programmes: the programme records, and which three the homepage recommends.
ADMIN role required on every route.

The homepage's recommended row is an ordered list of programme slugs stored as
site content, so its order is the editor's order. A programme that the homepage
recommends cannot be deleted until it is removed from the row.
"""

import uuid
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError, ValidationError
from models.program import Program
from models.site_content import SiteContent
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/programs", tags=["admin"])

SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"
ROW_KEY = "home.recommendedPrograms"
ROW_LIMIT = 3  # the homepage row shows three


class ProgramBody(BaseModel):
    name: str = Field(min_length=2, max_length=500)
    universityName: str = Field(min_length=2, max_length=500)
    universitySlug: str = Field(min_length=2, max_length=200, pattern=SLUG)
    onlineDuration: Optional[str] = Field(default=None, max_length=100)
    onlineFees: Optional[str] = Field(default=None, max_length=200)
    onlineFeesNote: Optional[str] = Field(default=None, max_length=200)
    onCampusDuration: Optional[str] = Field(default=None, max_length=100)
    onCampusFees: Optional[str] = Field(default=None, max_length=200)
    model_config = ConfigDict(extra="forbid")


class ProgramCreateBody(ProgramBody):
    slug: str = Field(min_length=2, max_length=200, pattern=SLUG)


class RowBody(BaseModel):
    slugs: list[str] = Field(default_factory=list, max_length=ROW_LIMIT)
    model_config = ConfigDict(extra="forbid")


def _validate(model: type[BaseModel], raw: dict) -> BaseModel:
    try:
        return model.model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


def _out(p: Program) -> dict:
    return {
        "id": str(p.id),
        "slug": p.slug,
        "name": p.name,
        "universityName": p.university_name,
        "universitySlug": p.university_slug,
        "onlineDuration": p.online_duration,
        "onlineFees": p.online_fees,
        "onlineFeesNote": p.online_fees_note,
        "onCampusDuration": p.on_campus_duration,
        "onCampusFees": p.on_campus_fees,
    }


def _fields(data: ProgramBody) -> dict:
    return {
        "name": data.name,
        "university_name": data.universityName,
        "university_slug": data.universitySlug,
        "online_duration": data.onlineDuration,
        "online_fees": data.onlineFees,
        "online_fees_note": data.onlineFeesNote,
        "on_campus_duration": data.onCampusDuration,
        "on_campus_fees": data.onCampusFees,
    }


async def _row_slugs(db) -> list[str]:
    row = (await db.execute(select(SiteContent).where(SiteContent.key == ROW_KEY))).scalar_one_or_none()
    return list(row.data) if row and isinstance(row.data, list) else []


@router.get("", response_model=SuccessResponse[dict])
async def admin_list_programs(_admin: AdminPayload, db: DbSession):
    programs = (await db.execute(select(Program).order_by(Program.name))).scalars().all()
    return SuccessResponse[dict](data={
        "programs": [_out(p) for p in programs],
        "recommended": await _row_slugs(db),
    })


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def admin_create_program(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(ProgramCreateBody, body)
    taken = (await db.execute(select(Program.id).where(Program.slug == data.slug))).scalar_one_or_none()
    if taken is not None:
        raise ConflictError("PROGRAM_SLUG_TAKEN", f"A programme with slug '{data.slug}' already exists.")
    db.add(Program(id=uuid.uuid4(), slug=data.slug, is_recommended=False, **_fields(data)))
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Programme '{data.slug}' created."})


@router.put("/recommended", response_model=SuccessResponse[dict])
async def admin_set_recommended(_admin: AdminPayload, db: DbSession, body: dict):
    data = _validate(RowBody, body)
    if len(set(data.slugs)) != len(data.slugs):
        raise ValidationError("slugs: a programme appears more than once.")
    known = set((await db.execute(select(Program.slug).where(Program.slug.in_(data.slugs)))).scalars().all())
    missing = [s for s in data.slugs if s not in known]
    if missing:
        raise ValidationError(f"slugs: unknown programme '{missing[0]}'.")

    row = (await db.execute(select(SiteContent).where(SiteContent.key == ROW_KEY))).scalar_one_or_none()
    if row is None:
        db.add(SiteContent(key=ROW_KEY, data=data.slugs))
    else:
        row.data = data.slugs
    await db.commit()
    return SuccessResponse[dict](data={"message": "Recommended programmes saved."})


@router.put("/{slug}", response_model=SuccessResponse[dict])
async def admin_update_program(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    """Replaces the programme's details. The slug is its address, so it cannot change here."""
    data = _validate(ProgramBody, body)
    program = (await db.execute(select(Program).where(Program.slug == slug))).scalar_one_or_none()
    if program is None:
        raise NotFoundError("Programme")
    for column, value in _fields(data).items():
        setattr(program, column, value)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Programme '{slug}' saved."})


@router.delete("/{slug}", response_model=SuccessResponse[dict])
async def admin_delete_program(slug: str, _admin: AdminPayload, db: DbSession):
    program = (await db.execute(select(Program).where(Program.slug == slug))).scalar_one_or_none()
    if program is None:
        raise NotFoundError("Programme")
    if slug in await _row_slugs(db):
        raise ConflictError("PROGRAM_IN_HOMEPAGE_ROW", "This programme is in the homepage row. Remove it there first.")
    await db.delete(program)
    await db.commit()
    return SuccessResponse[dict](data={"message": f"Programme '{slug}' deleted."})
