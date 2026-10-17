from typing import Annotated, Optional
from uuid import UUID

import jwt
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import UnauthorizedError, ForbiddenError
from core.security import decode_access_token
from models.user import ADMIN_ROLES, User


async def get_current_user_id(authorization: Annotated[Optional[str], Header()] = None) -> UUID:
    """Extract and validate Bearer token; return user id. Raises 401 if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired token.")


async def get_optional_user_id(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Optional[UUID]:
    """Like get_current_user_id but returns None instead of raising for anonymous users."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


async def require_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[Optional[str], Header()] = None,
) -> dict:
    """
    Dependency that requires an Admin or Super Admin.

    The token proves who the caller is; the database says what they may do right now. That way an
    account that has been disabled, demoted or promoted takes effect on its next request, not when
    its token expires. The returned payload's `role` is the current one.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
        user_id = UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired token.")

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Invalid or expired token.")
    if user.role not in ADMIN_ROLES:
        raise ForbiddenError()

    return {**payload, "role": user.role.value, "email": user.email}


# Typed aliases for injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
OptionalUserId = Annotated[Optional[UUID], Depends(get_optional_user_id)]
AdminPayload = Annotated[dict, Depends(require_admin)]
