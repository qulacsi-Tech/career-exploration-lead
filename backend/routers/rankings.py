from fastapi import APIRouter

from core.dependencies import DbSession
from schemas.common import SuccessResponse
from schemas.ranking import RankingListSchema
from services.ranking import RankingService

router = APIRouter(prefix="/rankings", tags=["rankings"])


@router.get("", response_model=SuccessResponse[list])
async def list_rankings(db: DbSession):
    svc = RankingService(db)
    rankings = await svc.list_rankings()
    return SuccessResponse[list](data=rankings)


@router.get("/{slug}", response_model=SuccessResponse[RankingListSchema])
async def get_ranking(slug: str, db: DbSession):
    svc = RankingService(db)
    ranking = await svc.get_ranking(slug)
    return SuccessResponse[RankingListSchema](data=ranking)
