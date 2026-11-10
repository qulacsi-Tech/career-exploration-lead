from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from repositories.lead import LeadRepository, NewsletterRepository
from repositories.user import UserRepository
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

    async def _tell_platform(self, lead, data: LeadCreateSchema) -> None:
        """The platform team hears of every new enquiry, application, callback and brochure request. Never fails the lead."""
        try:
            from sqlalchemy import select

            from models.college import College
            from services.notify import notify, platform_admin_ids

            label = {"callback": "callback request", "counselling": "counselling request", "brochure": "brochure request", "enquiry": "enquiry"}.get(str(data.type), "enquiry")
            if (data.source or "") == "college-apply":
                label = "application"
            elif (data.source or "") == "college-courses-explore":
                label = "course exploration"
            elif (data.source or "") == "college-reviews-explore":
                label = "review exploration"
            elif (data.source or "") == "college-replies-explore":
                label = "review replies exploration"
            college = None
            if lead.college_slug:
                college = (await self.repo.db.execute(select(College.name).where(College.slug == lead.college_slug))).scalar_one_or_none()
            await notify(
                self.repo.db,
                await platform_admin_ids(self.repo.db),
                kind="lead.new",
                title=f"New {label}" + (f" for {college}" if college else ""),
                body=f"From {lead.name}" + (f": {(data.programName or data.message or '')[:160]}" if (data.programName or data.message) else ""),
                link=f"/admin/leads?lead={lead.id}",
            )
        except Exception:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).exception("could not notify the platform team of a new lead")

    async def _tell_college(self, lead, data: LeadCreateSchema) -> None:
        """A new enquiry for a college goes to that college's admin, if it has one. Never allowed to fail the enquiry."""
        await self._tell_platform(lead, data)
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
                    link=f"/admin/leads?lead={lead.id}",
                )
        except Exception:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).exception("could not notify the college admin of a new lead")


class NewsletterService:
    def __init__(self, db: AsyncSession):
        self.repo = NewsletterRepository(db)
        self.users = UserRepository(db)

    async def subscribe(self, email: str) -> NewsletterResponseSchema:
        """Adds the address to the weekly updates and makes sure it has an account.

        Anyone can subscribe, signed in or not. An address with no account gets one, with no password: the owner
        sets one with "Forgot password" or by registering with the same email (see AuthService.register).
        """
        email = email.strip().lower()
        await self._ensure_account(email)
        existing = await self.repo.find_by_email(email)
        if existing:
            if existing.is_active:
                return NewsletterResponseSchema(message="You are already subscribed.")
            await self.repo.reactivate(existing)  # subscribed again after leaving
            return NewsletterResponseSchema(message="Subscribed successfully.")

        await self.repo.create(email=email)
        return NewsletterResponseSchema(message="Subscribed successfully.")

    async def _ensure_account(self, email: str) -> None:
        now = datetime.now(timezone.utc)
        user = await self.users.find_by_email(email)
        if user is None:
            await self.users.create(
                name=email.split("@")[0][:200] or "Subscriber",
                email=email,
                password_hash=None,
                marketing_consent=True,
                auth_provider="newsletter",
            )
            return
        # An existing account that subscribes has agreed to hear from us.
        if not user.marketing_consent:
            user.marketing_consent = True
            user.consent_at = now
            await self.users.save(user)

    async def unsubscribe(self, email: str) -> NewsletterResponseSchema:
        """Stops the weekly updates for the address. The record stays, marked unsubscribed, so the team can see it."""
        existing = await self.repo.find_by_email(email.strip().lower())
        if existing and existing.is_active:
            await self.repo.set_active(existing, False)
        # Said the same whether or not the address was on the list, so the endpoint cannot be used to find out.
        return NewsletterResponseSchema(message="You have been unsubscribed.")
