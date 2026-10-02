from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ConflictError, UnauthorizedError
from core.security import create_access_token, hash_password, verify_password
from repositories.user import UserRepository
from schemas.auth import AuthResponseSchema, LoginSchema, RegisterSchema, UserSchema


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(self, data: RegisterSchema) -> AuthResponseSchema:
        existing = await self.repo.find_by_email(data.email)
        if existing:
            raise ConflictError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.")

        password_hash = hash_password(data.password)
        user = await self.repo.create(
            name=data.name,
            email=data.email,
            password_hash=password_hash,
        )

        token = create_access_token(
            subject=str(user.id),
            extra={"role": user.role.value, "email": user.email},
        )
        return AuthResponseSchema(
            accessToken=token,
            user=UserSchema(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role.value,
            ),
        )

    async def login(self, data: LoginSchema) -> AuthResponseSchema:
        user = await self.repo.find_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password.")

        token = create_access_token(
            subject=str(user.id),
            extra={"role": user.role.value, "email": user.email},
        )
        return AuthResponseSchema(
            accessToken=token,
            user=UserSchema(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role.value,
            ),
        )
