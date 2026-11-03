from fastapi import APIRouter

from core.dependencies import CurrentUserId, DbSession
from core.exceptions import ForbiddenError
from models.user import PANEL_ROLES, User
from schemas.common import SuccessResponse
from schemas.lead import (
    LeadCreateSchema,
    LeadResponseSchema,
    NewsletterResponseSchema,
    NewsletterSubscribeSchema,
)
from services.lead import LeadService, NewsletterService

router = APIRouter(tags=["leads"])


@router.post("/leads", response_model=SuccessResponse[LeadResponseSchema], status_code=201)
async def create_lead(data: LeadCreateSchema, db: DbSession, user_id: CurrentUserId):
    """From a signed-in student's account, which the lead is tied to. Admin accounts use the admin panel instead."""
    sender = await db.get(User, user_id)
    if sender is None or not sender.is_active:
        raise ForbiddenError("This account cannot send enquiries.")
    if sender.role in PANEL_ROLES:
        raise ForbiddenError("Admin accounts cannot send enquiries. Use a student account.")
    svc = LeadService(db)
    result = await svc.create_lead(data, user_id)
    return SuccessResponse[LeadResponseSchema](data=result)


@router.post(
    "/newsletter/subscribe",
    response_model=SuccessResponse[NewsletterResponseSchema],
    status_code=201,
)
async def newsletter_subscribe(data: NewsletterSubscribeSchema, db: DbSession, user_id: CurrentUserId):
    """Subscribing needs an account: the address is added for the person who is signed in."""
    svc = NewsletterService(db)
    result = await svc.subscribe(str(data.email))
    return SuccessResponse[NewsletterResponseSchema](data=result)
