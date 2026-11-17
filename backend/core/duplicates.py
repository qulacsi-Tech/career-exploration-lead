"""No two colleges with the same name in the same city, and no two exams or news items with the same name.

Names are compared the way a person reads them: case and extra spaces do not count, so "IIM  Ahmedabad" and
"iim ahmedabad" are the same. The check runs when a record is added and when its name (or a college's city) is
changed. A record that already shares its name with another is left alone until its name is edited, so an old
duplicate does not stop anyone saving other fields.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select

from core.exceptions import ConflictError
from models.article import Article
from models.college import College
from models.exam import Exam


def same(text: Optional[str]) -> str:
    """The form names are compared in: trimmed, inner spaces collapsed, lower case."""
    return " ".join((text or "").split()).lower()


def _normalised(column):
    return func.lower(func.regexp_replace(func.trim(column), r"\s+", " ", "g"))


async def ensure_unique_college(db, name: str, city: str, exclude: Optional[UUID] = None) -> None:
    where = [_normalised(College.name) == same(name), _normalised(College.city) == same(city)]
    if exclude is not None:
        where.append(College.id != exclude)
    twin = (await db.execute(select(College.slug).where(*where).limit(1))).scalar_one_or_none()
    if twin is not None:
        raise ConflictError(
            "COLLEGE_NAME_TAKEN",
            f"A college named '{' '.join(name.split())}' in {' '.join(city.split())} already exists ({twin}). Use a different name, or edit that college instead.",
        )


async def ensure_unique_exam(db, name: str, exclude: Optional[UUID] = None) -> None:
    where = [_normalised(Exam.name) == same(name)]
    if exclude is not None:
        where.append(Exam.id != exclude)
    twin = (await db.execute(select(Exam.slug).where(*where).limit(1))).scalar_one_or_none()
    if twin is not None:
        raise ConflictError("EXAM_NAME_TAKEN", f"An exam named '{' '.join(name.split())}' already exists ({twin}). Use a different name, or edit that exam instead.")


async def ensure_unique_article(db, title: str, exclude: Optional[UUID] = None) -> None:
    where = [_normalised(Article.title) == same(title)]
    if exclude is not None:
        where.append(Article.id != exclude)
    twin = (await db.execute(select(Article.slug).where(*where).limit(1))).scalar_one_or_none()
    if twin is not None:
        raise ConflictError("ARTICLE_TITLE_TAKEN", f"A news item titled '{' '.join(title.split())}' already exists ({twin}). Use a different title, or edit that one instead.")
