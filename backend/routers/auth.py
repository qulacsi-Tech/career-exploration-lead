from typing import Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel, ConfigDict

from core.dependencies import DbSession
from core.exceptions import UnauthorizedError
from core.security import create_access_token, decode_access_token
from schemas.auth import AuthResponseSchema, ForgotPasswordSchema, GoogleLoginSchema, LoginSchema, RegisterSchema, ResetPasswordSchema, UserSchema
from schemas.common import SuccessResponse
from services import password_reset
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


@router.post("/google", response_model=SuccessResponse[AuthResponseSchema])
async def login_with_google(data: GoogleLoginSchema, db: DbSession):
    """Exchange a Google ID token for our own access token, creating the account on first use."""
    svc = AuthService(db)
    result = await svc.login_with_google(data)
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
    if not user or not user.is_active:
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


@router.post("/forgot-password", response_model=SuccessResponse[dict])
async def forgot_password(data: ForgotPasswordSchema, db: DbSession):
    """Emails a six-digit code to the account, if there is one. The answer is the same either way."""
    code = await password_reset.request_code(db, data.identifier)
    body: dict = {"message": "If there is an account for that, we have emailed a six-digit code. It works for 10 minutes."}
    if code:
        body["devCode"] = code  # only while RESET_CODE_IN_RESPONSE is on, for local testing
    return SuccessResponse[dict](data=body)


@router.post("/reset-password", response_model=SuccessResponse[dict])
async def reset_password(data: ResetPasswordSchema, db: DbSession):
    """Sets a new password when the code is right. It does not sign anyone in: they log in with the new password."""
    await password_reset.reset_password(db, data.identifier, data.code, data.newPassword)
    return SuccessResponse[dict](data={"message": "Your password has been changed. Log in with the new one."})
