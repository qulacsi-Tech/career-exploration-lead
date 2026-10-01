import uuid
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

    async def create(self, name: str, email: str, password_hash: str) -> User:
        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            password_hash=password_hash,
            role=UserRole.USER,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
