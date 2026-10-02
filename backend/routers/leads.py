from fastapi import APIRouter

from core.dependencies import DbSession
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
async def create_lead(data: LeadCreateSchema, db: DbSession):
    svc = LeadService(db)
    result = await svc.create_lead(data)
    return SuccessResponse[LeadResponseSchema](data=result)


@router.post(
    "/newsletter/subscribe",
    response_model=SuccessResponse[NewsletterResponseSchema],
    status_code=201,
)
async def newsletter_subscribe(data: NewsletterSubscribeSchema, db: DbSession):
    svc = NewsletterService(db)
    result = await svc.subscribe(str(data.email))
    return SuccessResponse[NewsletterResponseSchema](data=result)
