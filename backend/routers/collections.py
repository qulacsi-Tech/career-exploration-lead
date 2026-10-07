from typing import Optional

from fastapi import APIRouter, Query

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from services.collections import CollectionService

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/homepage", response_model=SuccessResponse[list])
async def homepage_bands(db: DbSession):
    return SuccessResponse[list](data=await CollectionService(db).homepage_bands())


@router.get("/{slug}/homepage-colleges", response_model=SuccessResponse[dict])
async def homepage_band_page(
    slug: str,
    db: DbSession,
    stream: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1, le=100),
):
    """The next page of a homepage section's colleges, for the slider. A section that is not on the homepage is a 404."""
    return SuccessResponse[dict](data=await CollectionService(db).band_page(slug, stream, page))


@router.get("/footer", response_model=SuccessResponse[list])
async def footer_columns(db: DbSession):
    return SuccessResponse[list](data=await CollectionService(db).footer_columns())


@router.get("/slugs", response_model=SuccessResponse[list])
async def collection_slugs(db: DbSession):
    return SuccessResponse[list](data=await CollectionService(db).published_slugs())


@router.get("/{slug}/page", response_model=SuccessResponse[dict])
async def collection_page(slug: str, db: DbSession):
    return SuccessResponse[dict](data=await CollectionService(db).page(slug))
