from fastapi import APIRouter, Query

from core.dependencies import DbSession
from schemas.article import ArticleDetailSchema, ArticleListSchema
from schemas.common import ListResponse, SuccessResponse
from services.article import ArticleService

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=ListResponse[ArticleListSchema])
async def list_articles(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    svc = ArticleService(db)
    articles, meta = await svc.list_articles(page=page, limit=limit)
    return ListResponse[ArticleListSchema](data=articles, meta=meta)


@router.get("/{slug}", response_model=SuccessResponse[ArticleDetailSchema])
async def get_article(slug: str, db: DbSession):
    svc = ArticleService(db)
    article = await svc.get_article(slug)
    return SuccessResponse[ArticleDetailSchema](data=article)
