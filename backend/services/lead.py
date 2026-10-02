from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ConflictError
from repositories.lead import LeadRepository, NewsletterRepository
from schemas.lead import LeadCreateSchema, LeadResponseSchema, NewsletterResponseSchema


class LeadService:
    def __init__(self, db: AsyncSession):
        self.repo = LeadRepository(db)

    async def create_lead(self, data: LeadCreateSchema) -> LeadResponseSchema:
        # Duplicate check: same phone + college + type within 24 h
        existing = await self.repo.find_recent_duplicate(
            phone=data.phone,
            college_slug=data.collegeSlug,
            lead_type=data.type,
        )
        if existing:
            raise ConflictError(
                "LEAD_DUPLICATE",
                "A request with these details was already submitted within 24 hours.",
            )

        lead = await self.repo.create(
            name=data.name,
            phone=data.phone,
            email=str(data.email) if data.email else None,
            college_slug=data.collegeSlug,
            lead_type=data.type,
        )
        return LeadResponseSchema(
            id=str(lead.id),
            message="Thank you! We will call you within 24 hours.",
        )


class NewsletterService:
    def __init__(self, db: AsyncSession):
        self.repo = NewsletterRepository(db)

    async def subscribe(self, email: str) -> NewsletterResponseSchema:
        existing = await self.repo.find_by_email(email)
        if existing:
            if existing.is_active:
                raise ConflictError("ALREADY_SUBSCRIBED", "This email is already subscribed.")
            # Reactivate silently
            existing.is_active = True
            from core.database import AsyncSessionLocal  # avoid circular at module level
            return NewsletterResponseSchema(message="Subscribed successfully.")

        await self.repo.create(email=email)
        return NewsletterResponseSchema(message="Subscribed successfully.")
