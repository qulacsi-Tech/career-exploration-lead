"""The College Admin of a college: create, reset, enable or disable, remove. Admin or Super Admin only.

One account per college, enforced by a unique index on the database as well as the check here. The
password handed out is temporary: the person must replace it at their first sign-in (see
core.dependencies.require_college_admin).
"""

import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, NotFoundError
from core.security import hash_password
from models.college import College
from models.user import User, UserRole
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/colleges", tags=["admin"])


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _json(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "isActive": bool(user.is_active),
        "mustChangePassword": bool(user.must_change_password),
        "createdAt": _iso(user.created_at),
        "lastLoginAt": _iso(user.last_login_at),
    }


def _check_password(v: str) -> str:
    if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("The password needs at least 8 characters, with a letter and a number.")
    return v


class CreateBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 100:
            raise ValueError("Name must be between 2 and 100 characters.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _check_password(v)


class ResetBody(BaseModel):
    password: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _check_password(v)


class ActiveBody(BaseModel):
    isActive: bool
    model_config = ConfigDict(populate_by_name=True)


async def _college(db, slug: str) -> College:
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    return college


async def _college_admin(db, college: College) -> Optional[User]:
    return (await db.execute(
        select(User).where(User.college_id == college.id, User.role == UserRole.COLLEGE_ADMIN)
    )).scalar_one_or_none()


@router.get("/{slug}/admin", response_model=SuccessResponse[dict])
async def get_college_admin(slug: str, _admin: AdminPayload, db: DbSession):
    """The college's admin account, or null when it has none yet."""
    user = await _college_admin(db, await _college(db, slug))
    return SuccessResponse[dict](data={"admin": _json(user) if user else None})


@router.post("/{slug}/admin", response_model=SuccessResponse[dict], status_code=201)
async def create_college_admin(slug: str, body: CreateBody, _admin: AdminPayload, db: DbSession):
    college = await _college(db, slug)
    if await _college_admin(db, college):
        raise ConflictError("COLLEGE_ADMIN_EXISTS", "This college already has an admin. Remove them first to add someone else.")

    email = str(body.email).lower()
    if (await db.execute(select(User.id).where(User.email == email))).first():
        raise ConflictError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.")

    user = User(
        id=uuid.uuid4(),
        name=body.name,
        email=email,
        password_hash=hash_password(body.password),
        role=UserRole.COLLEGE_ADMIN,
        college_id=college.id,
        auth_provider="password",
        is_verified=True,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return SuccessResponse[dict](data={"admin": _json(user)})


@router.post("/{slug}/admin/reset-password", response_model=SuccessResponse[dict])
async def reset_college_admin_password(slug: str, body: ResetBody, _admin: AdminPayload, db: DbSession):
    """Sets a new temporary password. They must replace it when they next sign in."""
    user = await _college_admin(db, await _college(db, slug))
    if user is None:
        raise NotFoundError("College admin")
    user.password_hash = hash_password(body.password)
    user.must_change_password = True
    await db.commit()
    return SuccessResponse[dict](data={"admin": _json(user)})


@router.patch("/{slug}/admin", response_model=SuccessResponse[dict])
async def set_college_admin_active(slug: str, body: ActiveBody, _admin: AdminPayload, db: DbSession):
    user = await _college_admin(db, await _college(db, slug))
    if user is None:
        raise NotFoundError("College admin")
    user.is_active = body.isActive
    await db.commit()
    return SuccessResponse[dict](data={"admin": _json(user)})


@router.delete("/{slug}/admin", response_model=SuccessResponse[dict])
async def remove_college_admin(slug: str, _admin: AdminPayload, db: DbSession):
    """Removes the account, so the college can be given to someone else."""
    user = await _college_admin(db, await _college(db, slug))
    if user is None:
        raise NotFoundError("College admin")
    await db.delete(user)
    await db.commit()
    return SuccessResponse[dict](data={"admin": None})
