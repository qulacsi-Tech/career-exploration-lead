import time
from collections import defaultdict, deque

from fastapi import APIRouter, Request

from core.dependencies import CurrentUserId, DbSession
from core.exceptions import AppException, ForbiddenError
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

# Subscribing needs no sign-in and creates an account, so each address may try only a few times in a while.
_WINDOW, _MAX_TRIES = 600, 8
_tries: dict[str, deque] = defaultdict(deque)


def _too_many(key: str) -> bool:
    now = time.monotonic()
    hits = _tries[key]
    while hits and now - hits[0] > _WINDOW:
        hits.popleft()
    if len(hits) >= _MAX_TRIES:
        return True
    hits.append(now)
    return False


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
async def newsletter_subscribe(data: NewsletterSubscribeSchema, request: Request, db: DbSession):
    """Anyone can subscribe. The address gets an account if it has none."""
    if _too_many(request.client.host if request.client else "unknown"):
        raise AppException(429, "TOO_MANY_REQUESTS", "Too many attempts. Please try again in a few minutes.")
    svc = NewsletterService(db)
    result = await svc.subscribe(str(data.email))
    return SuccessResponse[NewsletterResponseSchema](data=result)


@router.post(
    "/newsletter/unsubscribe",
    response_model=SuccessResponse[NewsletterResponseSchema],
)
async def newsletter_unsubscribe(data: NewsletterSubscribeSchema, request: Request, db: DbSession):
    """Stops the weekly updates for an address. The footer offers it to the browser that subscribed."""
    if _too_many(request.client.host if request.client else "unknown"):
        raise AppException(429, "TOO_MANY_REQUESTS", "Too many attempts. Please try again in a few minutes.")
    result = await NewsletterService(db).unsubscribe(str(data.email))
    return SuccessResponse[NewsletterResponseSchema](data=result)


@router.get("/newsletter/me", response_model=SuccessResponse[dict])
async def newsletter_me(db: DbSession, user_id: CurrentUserId):
    """Whether the signed-in account's own email is subscribed, so the footer can say so on any browser."""
    user = await db.get(User, user_id)
    if user is None:
        return SuccessResponse[dict](data={"email": "", "subscribed": False})
    found = await NewsletterService(db).repo.find_by_email(user.email.lower())
    return SuccessResponse[dict](data={"email": user.email, "subscribed": bool(found and found.is_active)})
