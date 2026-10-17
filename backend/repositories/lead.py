import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.lead import Lead, LeadReply, LeadType, LeadStatus
from models.newsletter import NewsletterSubscriber


class LeadRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_recent_duplicate(
        self,
        phone: str,
        college_slug: Optional[str],
        lead_type: str,
        program_name: Optional[str],
    ) -> Optional[Lead]:
        """The same person asking the same thing (phone, college, type, programme) in the last 24 hours."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        stmt = (
            select(Lead)
            .where(Lead.phone == phone, Lead.type == lead_type, Lead.created_at >= cutoff)
            .order_by(Lead.created_at.desc())
            .limit(1)
        )
        stmt = stmt.where(Lead.college_slug == college_slug) if college_slug else stmt.where(Lead.college_slug.is_(None))
        stmt = stmt.where(Lead.program_name == program_name) if program_name else stmt.where(Lead.program_name.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, *, user_id: Optional[uuid.UUID], lead_type: str, **fields) -> Lead:
        lead = Lead(
            id=uuid.uuid4(),
            user_id=user_id,
            type=LeadType(lead_type),
            status=LeadStatus.NEW,
            **fields,
        )
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def record_repeat(self, lead: Lead, user_id: Optional[uuid.UUID]) -> Lead:
        lead.repeat_count = (lead.repeat_count or 0) + 1
        # A visitor who was anonymous the first time and signed in the second keeps the lead.
        if user_id and not lead.user_id:
            lead.user_id = user_id
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def claim_by_email(self, user_id: uuid.UUID, email: str) -> int:
        """Attach earlier anonymous leads sent with this (verified) email to the account."""
        result = await self.db.execute(
            update(Lead)
            .where(Lead.user_id.is_(None), func.lower(Lead.email) == email.lower())
            .values(user_id=user_id)
        )
        await self.db.commit()
        return result.rowcount or 0

    async def list_for_user(self, user_id: uuid.UUID) -> list[Lead]:
        result = await self.db.execute(
            select(Lead)
            .where(Lead.user_id == user_id)
            .options(selectinload(Lead.replies))
            .order_by(Lead.created_at.desc())
        )
        return list(result.scalars().all())

    async def mark_replies_read(self, user_id: uuid.UUID) -> None:
        lead_ids = select(Lead.id).where(Lead.user_id == user_id)
        await self.db.execute(
            update(LeadReply)
            .where(LeadReply.lead_id.in_(lead_ids), LeadReply.read_at.is_(None))
            .values(read_at=datetime.now(timezone.utc))
        )
        await self.db.commit()

    async def get(self, lead_id: uuid.UUID) -> Optional[Lead]:
        result = await self.db.execute(
            select(Lead).where(Lead.id == lead_id).options(selectinload(Lead.replies))
        )
        return result.scalar_one_or_none()

    async def add_reply(self, lead_id: uuid.UUID, author_name: str, body: str) -> LeadReply:
        reply = LeadReply(id=uuid.uuid4(), lead_id=lead_id, author_name=author_name, body=body)
        self.db.add(reply)
        await self.db.commit()
        await self.db.refresh(reply)
        return reply


class NewsletterRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_email(self, email: str) -> Optional[NewsletterSubscriber]:
        result = await self.db.execute(
            select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
        )
        return result.scalar_one_or_none()

    async def create(self, email: str) -> NewsletterSubscriber:
        sub = NewsletterSubscriber(id=uuid.uuid4(), email=email)
        self.db.add(sub)
        await self.db.commit()
        await self.db.refresh(sub)
        return sub
