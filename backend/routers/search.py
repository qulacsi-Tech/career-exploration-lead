from fastapi import APIRouter, Query

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from schemas.search import SearchResultsSchema
from services.search import search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SuccessResponse[SearchResultsSchema])
async def search_all(
    db: DbSession,
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
):
    results = await search(db, q=q, limit=limit)
    return SuccessResponse[SearchResultsSchema](data=results)
