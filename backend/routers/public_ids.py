"""Public ids to slugs, for page addresses like /college/29-iit-bombay.

The site looks a page up by the number in its address, so a college, exam or news item can have its slug
reworded without breaking links. This only says which slug the number belongs to; whether that record is
public is decided by its own endpoint, so a draft is still a 404 there.
"""

from typing import Literal

from fastapi import APIRouter, Path
from sqlalchemy import select

from core.dependencies import DbSession
from core.exceptions import NotFoundError
from models.article import Article
from models.college import College
from models.exam import Exam
from schemas.common import SuccessResponse

router = APIRouter(prefix="/public-ids", tags=["public ids"])

MODELS = {"college": College, "exam": Exam, "article": Article}


@router.get("/{kind}/{public_id}", response_model=SuccessResponse[dict])
async def slug_for(kind: Literal["college", "exam", "article"], db: DbSession, public_id: int = Path(ge=1, le=999_999_999)):
    model = MODELS[kind]
    slug = (await db.execute(select(model.slug).where(model.public_id == public_id))).scalar_one_or_none()
    if slug is None:
        raise NotFoundError(kind.title())
    return SuccessResponse[dict](data={"slug": slug})
