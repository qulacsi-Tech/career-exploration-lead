"""The pool of recruiting companies: the list the college editor searches, with each company's logo. ADMIN only.

A company is one row however many colleges list it. A new one is added from the editor when a search finds
nothing; adding a name that already exists (ignoring case and spacing) returns the existing company instead of a
second one. Colleges keep the company's name on their placement record; the logo and whether to show the name
beside it live here, so changing a logo changes it everywhere.
"""

import uuid

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.recruiter import Recruiter
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/recruiters", tags=["admin"])


def recruiter_key(name: str) -> str:
    return " ".join(name.split()).lower()


def _out(r: Recruiter) -> dict:
    return {"id": str(r.id), "name": r.name, "logo": r.logo or "", "showName": bool(r.show_name)}


class CreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    model_config = ConfigDict(extra="forbid")

    @field_validator("name")
    @classmethod
    def _tidy(cls, value: str) -> str:
        return " ".join(value.split())


class UpdateBody(BaseModel):
    logo: str | None = Field(default=None, max_length=200)
    showName: bool | None = None
    model_config = ConfigDict(extra="forbid")

    @field_validator("logo")
    @classmethod
    def _upload_path(cls, value):
        """Empty, or a path to one of our own uploads. Never an external address."""
        if value is None:
            return value
        value = value.strip()
        if value and not (value.startswith("/api/uploads/") and ".." not in value):
            raise ValueError("must be an image uploaded through the admin")
        return value


def _parse(model, body: dict):
    try:
        return model.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


@router.get("", response_model=SuccessResponse[list])
async def list_recruiters(_admin: AdminPayload, db: DbSession):
    rows = (await db.execute(select(Recruiter).order_by(Recruiter.name_key))).scalars().all()
    return SuccessResponse[list](data=[_out(r) for r in rows])


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def create_recruiter(_admin: AdminPayload, db: DbSession, body: dict):
    """Adds a company, or returns the one that already has this name (`existing` true)."""
    data = _parse(CreateBody, body)
    key = recruiter_key(data.name)
    found = (await db.execute(select(Recruiter).where(Recruiter.name_key == key))).scalar_one_or_none()
    if found is not None:
        return SuccessResponse[dict](data={**_out(found), "existing": True})
    row = Recruiter(name=data.name, name_key=key)
    db.add(row)
    await db.commit()
    return SuccessResponse[dict](data={**_out(row), "existing": False})


@router.patch("/{recruiter_id}", response_model=SuccessResponse[dict])
async def update_recruiter(recruiter_id: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(UpdateBody, body)
    try:
        wanted = uuid.UUID(recruiter_id)
    except ValueError:
        raise NotFoundError("Recruiter") from None
    row = (await db.execute(select(Recruiter).where(Recruiter.id == wanted))).scalar_one_or_none()
    if row is None:
        raise NotFoundError("Recruiter")
    if data.logo is not None:
        row.logo = data.logo
    if data.showName is not None:
        row.show_name = data.showName
    await db.commit()
    return SuccessResponse[dict](data=_out(row))
