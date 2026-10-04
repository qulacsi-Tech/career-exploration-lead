from typing import Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel, ConfigDict

from core.dependencies import DbSession
from core.exceptions import UnauthorizedError
from core.security import create_access_token, decode_access_token
from schemas.auth import AuthResponseSchema, LoginSchema, RegisterSchema, UserSchema
from schemas.common import SuccessResponse
from services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


class RefreshRequest(BaseModel):
    """Body-based refresh token (simpler than cookie for this client)."""
    refreshToken: str
    model_config = ConfigDict(populate_by_name=True)


class RefreshResponse(BaseModel):
    accessToken: str
    model_config = ConfigDict(populate_by_name=True)


@router.post("/register", response_model=SuccessResponse[AuthResponseSchema], status_code=201)
async def register(data: RegisterSchema, db: DbSession):
    svc = AuthService(db)
    result = await svc.register(data)
    return SuccessResponse[AuthResponseSchema](data=result)


@router.post("/login", response_model=SuccessResponse[AuthResponseSchema])
async def login(data: LoginSchema, db: DbSession):
    svc = AuthService(db)
    result = await svc.login(data)
    return SuccessResponse[AuthResponseSchema](data=result)


@router.post("/refresh", response_model=SuccessResponse[RefreshResponse])
async def refresh(body: RefreshRequest, db: DbSession):
    """
    Exchange a still-valid access token for a fresh one.

    We re-use the same JWT as a refresh token here (single-token model).
    When the project adds a proper refresh-token table (longer-lived, one-time
    use, rotated on every call) this endpoint stays unchanged externally.
    """
    import jwt
    try:
        payload = decode_access_token(body.refreshToken)
    except jwt.PyJWTError:
        raise UnauthorizedError("Invalid or expired refresh token.")

    # Fetch the user to make sure the account still exists / isn't deleted
    from repositories.user import UserRepository
    import uuid as _uuid
    repo = UserRepository(db)
    user = await repo.find_by_id(_uuid.UUID(payload["sub"]))
    if not user:
        raise UnauthorizedError("Account not found.")

    new_token = create_access_token(
        subject=str(user.id),
        extra={"role": user.role.value, "email": user.email},
    )
    return SuccessResponse[RefreshResponse](data=RefreshResponse(accessToken=new_token))


@router.post("/logout", response_model=SuccessResponse[dict])
async def logout():
    """
    Stateless JWT — the client drops the token. This endpoint exists so
    the frontend has a consistent pattern to call on sign-out; future
    token-blocklist logic slots in here without changing the route.
    """
    return SuccessResponse[dict](data={"message": "Logged out successfully."})
