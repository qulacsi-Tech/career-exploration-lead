from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ArticleListSchema(BaseModel):
    slug: str
    title: str
    excerpt: str
    date: str          # formatted "D Mon YYYY"
    author: Optional[str] = "Editorial Desk"
    category: Optional[str] = None
    readMinutes: Optional[int] = 5

    model_config = ConfigDict(populate_by_name=True)


class ArticleDetailSchema(ArticleListSchema):
    body: Optional[str] = None
    relatedCollegeSlugs: List[str] = []

    model_config = ConfigDict(populate_by_name=True)
