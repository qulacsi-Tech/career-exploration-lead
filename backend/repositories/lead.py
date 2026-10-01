import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.lead import Lead, LeadType, LeadStatus
from models.newsletter import NewsletterSubscriber


class LeadRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_recent_duplicate(
        self, phone: str, college_slug: Optional[str], lead_type: str
    ) -> Optional[Lead]:
        """Check for same phone+college+type submitted within 24 hours."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        stmt = select(Lead).where(
            Lead.phone == phone,
            Lead.type == lead_type,
            Lead.created_at >= cutoff,
        )
        if college_slug:
            stmt = stmt.where(Lead.college_slug == college_slug)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        phone: str,
        email: Optional[str],
        college_slug: Optional[str],
        lead_type: str,
    ) -> Lead:
        lead = Lead(
            id=uuid.uuid4(),
            name=name,
            phone=phone,
            email=email,
            college_slug=college_slug,
            type=LeadType(lead_type),
            status=LeadStatus.NEW,
        )
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead


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
