from fastapi import APIRouter

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from services.collections import CollectionService

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/homepage", response_model=SuccessResponse[list])
async def homepage_bands(db: DbSession):
    return SuccessResponse[list](data=await CollectionService(db).homepage_bands())


@router.get("/footer", response_model=SuccessResponse[list])
async def footer_columns(db: DbSession):
    return SuccessResponse[list](data=await CollectionService(db).footer_columns())


@router.get("/slugs", response_model=SuccessResponse[list])
async def collection_slugs(db: DbSession):
    return SuccessResponse[list](data=await CollectionService(db).published_slugs())


@router.get("/{slug}/page", response_model=SuccessResponse[dict])
async def collection_page(slug: str, db: DbSession):
    return SuccessResponse[dict](data=await CollectionService(db).page(slug))
