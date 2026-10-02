from typing import Annotated, Optional
from uuid import UUID

import jwt
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import UnauthorizedError, ForbiddenError
from core.security import decode_access_token


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


def require_admin(
    authorization: Annotated[Optional[str], Header()] = None,
) -> dict:
    """Dependency that requires an ADMIN-role token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
        if payload.get("role") != "ADMIN":
            raise ForbiddenError()
        return payload
    except (jwt.PyJWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired token.")


# Typed aliases for injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
OptionalUserId = Annotated[Optional[UUID], Depends(get_optional_user_id)]
AdminPayload = Annotated[dict, Depends(require_admin)]
