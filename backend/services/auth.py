import asyncio
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import AppException, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError
from data.india_districts import INDIA_DISTRICTS
from core.security import create_access_token, hash_password, verify_password
from models.college import College
from models.user import User
from repositories.lead import LeadRepository
from repositories.user import UserRepository
from schemas.auth import (
    AuthResponseSchema,
    GoogleLoginSchema,
    LoginSchema,
    PasswordChangeSchema,
    ProfileSchema,
    ProfileUpdateSchema,
    RegisterSchema,
    UserSchema,
)


def _auth_response(user: User, is_new: bool = False) -> AuthResponseSchema:
    token = create_access_token(
        subject=str(user.id),
        extra={"role": user.role.value, "email": user.email},
    )
    return AuthResponseSchema(
        accessToken=token,
        user=UserSchema(id=str(user.id), name=user.name, email=user.email, role=user.role.value),
        isNewUser=is_new,
        mustChangePassword=bool(user.must_change_password),
    )


def profile_of(user: User) -> ProfileSchema:
    return ProfileSchema(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role.value,
        phone=user.phone,
        avatarUrl=user.avatar_url,
        authProvider=user.auth_provider,
        city=user.city,
        state=user.state,
        preferredStream=user.preferred_stream,
        targetExam=user.target_exam,
        marketingConsent=bool(user.marketing_consent),
        collegeSlug=getattr(user, "_college_slug", None),
        mustChangePassword=bool(user.must_change_password),
    )


def _verify_google_token(token: str) -> dict:
    """Blocking call: checks the signature, audience, issuer and expiry of a Google ID token."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    return id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)
        self.leads = LeadRepository(db)

    async def register(self, data: RegisterSchema) -> AuthResponseSchema:
        email = str(data.email).lower()
        existing = await self.repo.find_by_email(email)
        if existing:
            raise ConflictError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.")

        user = await self.repo.create(
            name=data.name,
            email=email,
            password_hash=hash_password(data.password),
            phone=data.phone,
            marketing_consent=data.marketingConsent,
        )
        return _auth_response(user, is_new=True)

    async def login(self, data: LoginSchema) -> AuthResponseSchema:
        user = await self.repo.find_by_email(str(data.email).lower())
        if user and not user.password_hash:
            raise UnauthorizedError("This account uses Google sign-in. Choose “Continue with Google”.")
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password.")
        if not user.is_active:
            raise ForbiddenError("This account has been disabled.")

        user.last_login_at = datetime.now(timezone.utc)
        await self.repo.save(user)
        return _auth_response(user)

    async def login_with_google(self, data: GoogleLoginSchema) -> AuthResponseSchema:
        if not settings.GOOGLE_CLIENT_ID:
            raise AppException(503, "GOOGLE_NOT_CONFIGURED", "Sign-in with Google is not available yet.")
        try:
            claims = await asyncio.to_thread(_verify_google_token, data.idToken)
        except ValueError:
            raise UnauthorizedError("Google sign-in could not be verified. Please try again.")

        sub: str = claims["sub"]
        email: str = str(claims.get("email", "")).lower()
        # Never trust an email Google has not verified: it could be used to take over a password account.
        if not email or not claims.get("email_verified"):
            raise UnauthorizedError("Your Google account email is not verified.")

        created = False
        user = await self.repo.find_by_google_sub(sub)
        if not user:
            user = await self.repo.find_by_email(email)
            if user:
                # Same verified email as a password account: link, do not duplicate.
                user.google_sub = sub
                user.is_verified = True
                user.email_verified_at = user.email_verified_at or datetime.now(timezone.utc)
                user.avatar_url = user.avatar_url or claims.get("picture")
            else:
                user = await self.repo.create(
                    name=(claims.get("name") or email.split("@")[0])[:200],
                    email=email,
                    password_hash=None,
                    google_sub=sub,
                    avatar_url=claims.get("picture"),
                    email_verified=True,
                )
                created = True

        if not user.is_active:
            raise ForbiddenError("This account has been disabled.")
        user.last_login_at = datetime.now(timezone.utc)
        await self.repo.save(user)
        # Google has verified this email, so enquiries sent earlier with it are theirs.
        await self.leads.claim_by_email(user.id, email)
        return _auth_response(user, is_new=created)

    async def get_profile(self, user_id: UUID) -> ProfileSchema:
        user = await self._active_user(user_id)
        if user.college_id:
            college = await self.repo.db.get(College, user.college_id)
            user._college_slug = college.slug if college else None  # read by profile_of
        return profile_of(user)

    async def change_password(self, user_id: UUID, data: PasswordChangeSchema) -> None:
        """Replaces the password. Needs the current one, which for a new college admin is the temporary one."""
        user = await self._active_user(user_id)
        if not user.password_hash or not verify_password(data.currentPassword, user.password_hash):
            raise UnauthorizedError("The current password is not right.")
        if verify_password(data.newPassword, user.password_hash):
            raise ValidationError("Choose a password you have not used for this account just now.")
        user.password_hash = hash_password(data.newPassword)
        user.must_change_password = False
        await self.repo.save(user)

    async def update_profile(self, user_id: UUID, data: ProfileUpdateSchema) -> ProfileSchema:
        user = await self._active_user(user_id)
        fields = data.model_fields_set
        if "name" in fields and data.name:
            user.name = data.name
        if "phone" in fields:
            user.phone = data.phone
        if "city" in fields:
            user.city = data.city
        if "state" in fields:
            if data.state and data.state not in INDIA_DISTRICTS:
                raise ValidationError("Choose a state from the list.")
            user.state = data.state
        if "preferredStream" in fields:
            user.preferred_stream = data.preferredStream
        if "targetExam" in fields:
            user.target_exam = data.targetExam
        if "marketingConsent" in fields and data.marketingConsent is not None:
            if data.marketingConsent != user.marketing_consent:
                user.consent_at = datetime.now(timezone.utc)
            user.marketing_consent = data.marketingConsent
        await self.repo.save(user)
        return profile_of(user)

    async def _active_user(self, user_id: UUID) -> User:
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("Account")
        if not user.is_active:
            raise ForbiddenError("This account has been disabled.")
        return user
