import math
from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.article import Article
from repositories.article import ArticleRepository
from schemas.article import ArticleDetailSchema, ArticleListSchema
from schemas.common import Meta


def _fmt_date(d) -> str:
    if d is None:
        return ""
    try:
        return d.strftime("%-d %b %Y")
    except ValueError:
        return d.strftime("%d %b %Y").lstrip("0")


def _to_list_schema(article: Article) -> ArticleListSchema:
    return ArticleListSchema(
        slug=article.slug,
        title=article.title,
        excerpt=article.excerpt,
        date=_fmt_date(article.published_at),
    )


def _to_detail_schema(article: Article) -> ArticleDetailSchema:
    return ArticleDetailSchema(
        slug=article.slug,
        title=article.title,
        excerpt=article.excerpt,
        date=_fmt_date(article.published_at),
        body=article.body,
    )


class ArticleService:
    def __init__(self, db: AsyncSession):
        self.repo = ArticleRepository(db)

    async def list_articles(self, page: int = 1, limit: int = 10) -> Tuple[List[ArticleListSchema], Meta]:
        articles, total = await self.repo.list(page=page, limit=limit)
        pages = math.ceil(total / limit) if limit else 1
        return [_to_list_schema(a) for a in articles], Meta(total=total, page=page, limit=limit, pages=pages)

    async def get_article(self, slug: str) -> ArticleDetailSchema:
        article = await self.repo.get_by_slug(slug)
        if not article:
            raise NotFoundError("Article")
        return _to_detail_schema(article)

    async def get_recent(self, limit: int = 3) -> List[ArticleListSchema]:
        articles = await self.repo.get_recent(limit=limit)
        return [_to_list_schema(a) for a in articles]
