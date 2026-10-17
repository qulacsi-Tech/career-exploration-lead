import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserRole


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def find_by_id(self, user_id: UUID) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def find_by_google_sub(self, sub: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.google_sub == sub))
        return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        email: str,
        password_hash: Optional[str],
        phone: Optional[str] = None,
        marketing_consent: bool = False,
        google_sub: Optional[str] = None,
        avatar_url: Optional[str] = None,
        email_verified: bool = False,
    ) -> User:
        now = datetime.now(timezone.utc)
        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            password_hash=password_hash,
            phone=phone,
            role=UserRole.USER,
            auth_provider="google" if google_sub else "password",
            google_sub=google_sub,
            avatar_url=avatar_url,
            is_verified=email_verified,
            email_verified_at=now if email_verified else None,
            marketing_consent=marketing_consent,
            consent_at=now if marketing_consent else None,
            last_login_at=now,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def save(self, user: User) -> User:
        await self.db.commit()
        await self.db.refresh(user)
        return user
