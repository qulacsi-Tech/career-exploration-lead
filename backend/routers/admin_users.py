"""Accounts, for the admin's Users page.

Two groups, each paginated here: administrative (Admin and Super Admin) and general (students).

Who may do what:
- A Super Admin creates administrators and can turn any account on or off, except their own.
- An Admin can turn general accounts on or off, and can look at the administrative list but not change it.

The caller's role is read from the database on every request (see core.dependencies.require_admin),
so a change of role or a disabled account applies at once. The rules are enforced here, not in the
page: the buttons the frontend hides are only a courtesy.
"""

import re
import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy import func, or_, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from core.security import hash_password
from models.college import College
from models.lead import Lead
from models.tracking import Event, VisitSession
from models.user import ADMIN_ROLES, User, UserRole
from schemas.common import ListResponse, Meta, SuccessResponse

router = APIRouter(prefix="/admin", tags=["admin"])

Group = Literal["general", "administrative", "college"]


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _role(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _can_manage(actor_role: str, target: User) -> bool:
    """Super admins manage everyone; admins manage general and college accounts, not other administrators."""
    if actor_role == UserRole.SUPER_ADMIN.value:
        return True
    return target.role in (UserRole.USER, UserRole.COLLEGE_ADMIN)


def _user_json(user: User, actor_role: str, lead_count: int = 0, college: Optional[tuple] = None) -> dict:
    return {
        "collegeSlug": college[0] if college else None,
        "collegeName": college[1] if college else None,
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": _role(user.role),
        "phone": user.phone,
        "city": user.city,
        "state": user.state,
        "authProvider": user.auth_provider,
        "isActive": bool(user.is_active),
        "createdAt": _iso(user.created_at),
        "lastLoginAt": _iso(user.last_login_at),
        "leadCount": lead_count,
        "canManage": _can_manage(actor_role, user),
    }


def _parse_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise ValidationError("user_id: not a valid id.") from exc


def _in_group(group: Group):
    if group == "administrative":
        return User.role.in_(ADMIN_ROLES)
    if group == "college":
        return User.role == UserRole.COLLEGE_ADMIN
    return User.role == UserRole.USER


@router.get("/users/counts", response_model=SuccessResponse[dict])
async def user_counts(_admin: AdminPayload, db: DbSession):
    """How many accounts are in each group, for the tab labels."""
    general = (await db.execute(select(func.count()).select_from(User).where(_in_group("general")))).scalar_one()
    administrative = (await db.execute(select(func.count()).select_from(User).where(_in_group("administrative")))).scalar_one()
    college = (await db.execute(select(func.count()).select_from(User).where(_in_group("college")))).scalar_one()
    return SuccessResponse[dict](data={"general": general, "administrative": administrative, "college": college})


@router.get("/users", response_model=ListResponse[dict])
async def list_users(
    admin: AdminPayload,
    db: DbSession,
    group: Group = Query("general"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=100),
):
    lead_counts = (
        select(Lead.user_id.label("uid"), func.count().label("n"))
        .where(Lead.user_id.is_not(None))
        .group_by(Lead.user_id)
        .subquery()
    )
    stmt = (
        select(User, func.coalesce(lead_counts.c.n, 0), College.slug, College.name)
        .outerjoin(lead_counts, lead_counts.c.uid == User.id)
        .outerjoin(College, College.id == User.college_id)
        .where(_in_group(group))
    )
    count = select(func.count()).select_from(User).where(_in_group(group))
    if q:
        like = f"%{q.strip()}%"
        search = or_(User.name.ilike(like), User.email.ilike(like))
        stmt = stmt.where(search)
        count = count.where(search)

    total = (await db.execute(count)).scalar_one()
    rows = (await db.execute(
        stmt.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )).all()
    pages = max(1, -(-total // limit))
    return ListResponse[dict](
        meta=Meta(total=total, page=page, limit=limit, pages=pages),
        data=[_user_json(user, admin["role"], n, (slug, name) if slug else None) for user, n, slug, name in rows],
    )


class CreateAdministratorBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["ADMIN", "SUPER_ADMIN"] = "ADMIN"
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
        if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must be at least 8 characters with a letter and a number.")
        return v


@router.post("/users", response_model=SuccessResponse[dict], status_code=201)
async def create_administrator(body: CreateAdministratorBody, admin: AdminPayload, db: DbSession):
    """Creates an Admin or Super Admin account. Super admins only."""
    if admin["role"] != UserRole.SUPER_ADMIN.value:
        raise ForbiddenError("Only a super admin can create administrator accounts.")

    email = str(body.email).lower()
    if (await db.execute(select(User.id).where(User.email == email))).first():
        raise ConflictError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.")

    user = User(
        id=uuid.uuid4(),
        name=body.name,
        email=email,
        password_hash=hash_password(body.password),
        role=UserRole(body.role),
        auth_provider="password",
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return SuccessResponse[dict](data=_user_json(user, admin["role"]))


@router.get("/users/{user_id}", response_model=SuccessResponse[dict])
async def get_user(user_id: str, admin: AdminPayload, db: DbSession):
    try:
        uid = uuid.UUID(user_id)
    except ValueError as exc:
        raise ValidationError("user_id: not a valid id.") from exc
    user = await db.get(User, uid)
    if not user:
        raise NotFoundError("User")

    leads = (await db.execute(
        select(Lead).where(Lead.user_id == uid).order_by(Lead.created_at.desc()).limit(50)
    )).scalars().all()
    events = (await db.execute(
        select(Event).where(Event.user_id == uid).order_by(Event.occurred_at.desc()).limit(100)
    )).scalars().all()
    sessions = (await db.execute(
        select(func.count()).select_from(VisitSession).where(VisitSession.user_id == uid)
    )).scalar_one()

    return SuccessResponse[dict](data={
        **_user_json(user, admin["role"], len(leads)),
        "preferredStream": user.preferred_stream,
        "targetExam": user.target_exam,
        "marketingConsent": bool(user.marketing_consent),
        "sessions": sessions,
        "leads": [
            {
                "id": str(l.id),
                "type": _role(l.type),
                "status": _role(l.status),
                "collegeSlug": l.college_slug,
                "programName": l.program_name,
                "createdAt": _iso(l.created_at),
            }
            for l in leads
        ],
        "events": [
            {"id": e.id, "name": e.name, "path": e.path, "properties": e.properties or {}, "at": _iso(e.occurred_at)}
            for e in events
        ],
    })


class UserUpdateBody(BaseModel):
    isActive: bool
    model_config = ConfigDict(populate_by_name=True)


@router.patch("/users/{user_id}", response_model=SuccessResponse[dict])
async def update_user(user_id: str, body: UserUpdateBody, admin: AdminPayload, db: DbSession):
    """Turns an account on or off. Nobody can switch off their own."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError as exc:
        raise ValidationError("user_id: not a valid id.") from exc
    if str(uid) == admin.get("sub") and not body.isActive:
        raise ForbiddenError("You cannot disable your own account.")

    user = await db.get(User, uid)
    if not user:
        raise NotFoundError("User")
    if not _can_manage(admin["role"], user):
        raise ForbiddenError("Only a super admin can change an administrator account.")

    user.is_active = body.isActive
    await db.commit()
    return SuccessResponse[dict](data=_user_json(user, admin["role"]))


class ResetPasswordBody(BaseModel):
    password: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("The password needs at least 8 characters, with a letter and a number.")
        return v


@router.post("/users/{user_id}/reset-password", response_model=SuccessResponse[dict])
async def reset_user_password(user_id: str, body: ResetPasswordBody, admin: AdminPayload, db: DbSession):
    """
    Sets a temporary password for someone who cannot sign in. There is no reset by email yet, so the
    team does it here and passes the password on. The person must choose their own at next sign-in.
    Same rule as enabling or disabling: a super admin for anyone, an admin for students and college
    admins. Nobody resets their own here (they change it from My account).
    """
    uid = _parse_id(user_id)
    if str(uid) == admin.get("sub"):
        raise ForbiddenError("Change your own password from My account.")
    user = await db.get(User, uid)
    if not user:
        raise NotFoundError("User")
    if not _can_manage(admin["role"], user):
        raise ForbiddenError("Only a super admin can reset an administrator's password.")

    user.password_hash = hash_password(body.password)
    user.must_change_password = True
    # A reset is also how someone locked out for too many attempts gets back in.
    user.failed_logins = 0
    user.locked_until = None
    await db.commit()
    return SuccessResponse[dict](data=_user_json(user, admin["role"]))
