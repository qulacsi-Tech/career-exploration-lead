from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ConflictError
from repositories.lead import LeadRepository, NewsletterRepository
from schemas.lead import LeadCreateSchema, LeadResponseSchema, NewsletterResponseSchema

THANKS = "Thank you! We will call you within 24 hours."


class LeadService:
    def __init__(self, db: AsyncSession):
        self.repo = LeadRepository(db)

    async def create_lead(self, data: LeadCreateSchema, user_id: Optional[UUID] = None) -> LeadResponseSchema:
        # The same person asking the same thing again within 24 hours is not an error:
        # nothing new is stored, the original is noted as repeated, and they get the same thanks.
        existing = await self.repo.find_recent_duplicate(
            phone=data.phone,
            college_slug=data.collegeSlug,
            lead_type=data.type,
            program_name=data.programName,
        )
        if existing:
            existing = await self.repo.record_repeat(existing, user_id)
            return LeadResponseSchema(id=str(existing.id), message=THANKS, repeat=True)

        lead = await self.repo.create(
            user_id=user_id,
            lead_type=data.type,
            name=data.name,
            phone=data.phone,
            email=str(data.email).lower() if data.email else None,
            college_slug=data.collegeSlug,
            stream=data.stream,
            city=data.city,
            message=data.message,
            program_name=data.programName,
            source=data.source,
            source_url=data.sourceUrl,
            consent=data.consent,
            consent_at=datetime.now(timezone.utc) if data.consent else None,
            visitor_id=UUID(data.visitorId) if data.visitorId else None,
        )
        await self._tell_college(lead, data)
        return LeadResponseSchema(id=str(lead.id), message=THANKS)

    async def _tell_college(self, lead, data: LeadCreateSchema) -> None:
        """A new enquiry for a college goes to that college's admin, if it has one. Never allowed to fail the enquiry."""
        if not (lead.college_slug and lead.consent):
            return  # only enquiries the sender agreed to share are shown to a college
        try:
            from services.notify import college_admin_id, notify

            admin_id = await college_admin_id(self.repo.db, lead.college_slug)
            if admin_id:
                await notify(
                    self.repo.db,
                    [admin_id],
                    kind="lead.new",
                    title=f"New enquiry from {lead.name}",
                    body=(data.programName or data.message or "")[:200] or None,
                    link="/admin/leads",
                )
        except Exception:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).exception("could not notify the college admin of a new lead")


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
