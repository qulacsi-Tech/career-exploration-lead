"""
Fixtures for tests that run against a real, migrated and seeded Postgres (see .github/workflows/ci.yml).

They go through the real app with real tokens, because what they protect is exactly the part a mock
would hide: who is allowed to see and change what. Everything a test creates is removed afterwards;
the seeded colleges are used as they are.
"""

import uuid
from dataclasses import dataclass

import httpx
import pytest_asyncio
from sqlalchemy import delete, select

from core.database import AsyncSessionLocal
from core.security import create_access_token, hash_password
from main import app
from models.collab import ChangeRequest, MessageThread
from models.college import College
from models.lead import Lead, LeadType
from models.user import User, UserRole

PASSWORD = "Test-pass-1234"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@dataclass
class Person:
    id: uuid.UUID
    email: str
    token: str

    @property
    def h(self) -> dict[str, str]:
        return bearer(self.token)


@dataclass
class World:
    college_a: College
    college_b: College
    super_admin: Person
    admin: Person
    admin_a: Person  # college admin of college A
    admin_b: Person  # college admin of college B
    student: Person
    lead_a: uuid.UUID  # sent to college A, consent given
    lead_a_private: uuid.UUID  # sent to college A, no consent
    lead_b: uuid.UUID  # sent to college B, consent given


@pytest_asyncio.fixture(scope="session")
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c


def _person(user: User) -> Person:
    token = create_access_token(subject=str(user.id), extra={"role": user.role.value, "email": user.email})
    return Person(id=user.id, email=user.email, token=token)


@pytest_asyncio.fixture(scope="session")
async def world():
    tag = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db:
        colleges = (await db.execute(select(College).order_by(College.slug).limit(2))).scalars().all()
        assert len(colleges) == 2, "the tests need the seeded colleges: run seed.py first"
        a, b = colleges

        def make(role: UserRole, label: str, college: College | None = None) -> User:
            return User(
                id=uuid.uuid4(),
                name=f"Test {label}",
                email=f"test-{label}-{tag}@example.com",
                password_hash=hash_password(PASSWORD),
                role=role,
                college_id=college.id if college else None,
                auth_provider="password",
                is_verified=True,
                is_active=True,
            )

        super_admin = make(UserRole.SUPER_ADMIN, "super")
        admin = make(UserRole.ADMIN, "admin")
        admin_a = make(UserRole.COLLEGE_ADMIN, "collegea", a)
        admin_b = make(UserRole.COLLEGE_ADMIN, "collegeb", b)
        student = make(UserRole.USER, "student")
        db.add_all([super_admin, admin, admin_a, admin_b, student])
        await db.flush()

        def lead(college: College, label: str, consent: bool) -> Lead:
            return Lead(
                id=uuid.uuid4(), name=f"Lead {label} {tag}", phone="9876543210", email=f"lead-{label}-{tag}@example.com",
                college_slug=college.slug, type=LeadType.ENQUIRY, user_id=student.id, consent=consent, visitor_id=uuid.uuid4(),
            )

        la, lap, lb = lead(a, "a", True), lead(a, "a-private", False), lead(b, "b", True)
        db.add_all([la, lap, lb])
        await db.commit()

        world = World(
            college_a=a, college_b=b,
            super_admin=_person(super_admin), admin=_person(admin), admin_a=_person(admin_a), admin_b=_person(admin_b),
            student=_person(student), lead_a=la.id, lead_a_private=lap.id, lead_b=lb.id,
        )

    yield world

    async with AsyncSessionLocal() as db:
        ids = [p.id for p in (world.super_admin, world.admin, world.admin_a, world.admin_b, world.student)]
        await db.execute(delete(ChangeRequest).where(ChangeRequest.college_id.in_([a.id, b.id]), ChangeRequest.requested_by.in_(ids)))
        await db.execute(delete(MessageThread).where(MessageThread.created_by.in_(ids)))
        await db.execute(delete(Lead).where(Lead.email.like(f"%-{tag}@example.com")))
        await db.execute(delete(User).where(User.email.like(f"test-%-{tag}@example.com")))
        await db.commit()


async def set_user(user_id: uuid.UUID, **fields) -> None:
    """Changes an account directly in the database, for tests that need it disabled, locked and so on."""
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        for key, value in fields.items():
            setattr(user, key, value)
        await db.commit()
