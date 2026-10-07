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
        # Windows does not support %-d
        return d.strftime("%d %b %Y").lstrip("0")


def _related_slugs(article: Article) -> List[str]:
    raw = article.related_college_slugs or ""
    return [s.strip() for s in raw.split(",") if s.strip()]


def _to_list_schema(article: Article) -> ArticleListSchema:
    return ArticleListSchema(
        slug=article.slug,
        title=article.title,
        excerpt=article.excerpt,
        date=_fmt_date(article.published_at),
        author=article.author or "Editorial Desk",
        category=article.category,
        readMinutes=article.read_minutes or 5,
        image=article.image or "",
    )


def _to_detail_schema(article: Article) -> ArticleDetailSchema:
    return ArticleDetailSchema(
        slug=article.slug,
        title=article.title,
        excerpt=article.excerpt,
        date=_fmt_date(article.published_at),
        author=article.author or "Editorial Desk",
        category=article.category,
        readMinutes=article.read_minutes or 5,
        image=article.image or "",
        body=article.body,
        relatedCollegeSlugs=_related_slugs(article),
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

    async def get_for_home(self, limit: int = 3) -> List[ArticleListSchema]:
        """The articles pinned to the homepage, in the admin's order, or the most recent when none is pinned.
        A pinned article that is unpublished or deleted is skipped."""
        from sqlalchemy import select
        from models.article import Article
        from models.site_content import SiteContent

        db = self.repo.db
        row = (await db.execute(select(SiteContent).where(SiteContent.key == "home.articles"))).scalar_one_or_none()
        slugs = list(row.data)[:limit] if row and isinstance(row.data, list) else []
        if slugs:
            rows = (await db.execute(select(Article).where(Article.slug.in_(slugs), Article.is_published.is_(True)))).scalars().all()
            by_slug = {a.slug: a for a in rows}
            pinned = [_to_list_schema(by_slug[s]) for s in slugs if s in by_slug]
            if pinned:
                return pinned
        return await self.get_recent(limit=limit)

    async def get_recent(self, limit: int = 3) -> List[ArticleListSchema]:
        articles = await self.repo.get_recent(limit=limit)
        return [_to_list_schema(a) for a in articles]
