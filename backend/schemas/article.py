from typing import Optional
from pydantic import BaseModel, ConfigDict


class ArticleListSchema(BaseModel):
    slug: str
    title: str
    excerpt: str
    date: str  # formatted "D Mon YYYY" to match frontend mock

    model_config = ConfigDict(populate_by_name=True)


class ArticleDetailSchema(ArticleListSchema):
    body: Optional[str]

    model_config = ConfigDict(populate_by_name=True)
