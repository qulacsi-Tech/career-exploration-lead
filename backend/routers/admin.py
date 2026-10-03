"""
Admin CRUD endpoints — all require ADMIN role JWT.

Pattern: thin routers that call the same services as the public endpoints,
but with write operations (create / update / delete) added.  The ADMIN
dependency is injected at router level so every endpoint in this file is
automatically protected.
"""

import uuid
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, ConfigDict

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError
from schemas.college import CollegeFilterParams
from schemas.common import ListResponse, SuccessResponse
from services.college import CollegeService
from services.exam import ExamService
from services.article import ArticleService

router = APIRouter(prefix="/admin", tags=["admin"])

# ── Shared response ───────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    model_config = ConfigDict(populate_by_name=True)


# ─────────────────────────────────────────────────────────────────────────────
# COLLEGES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/colleges", response_model=ListResponse[Any])
async def admin_list_colleges(
    _admin: AdminPayload,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    stream: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort: str = Query("popularity"),
):
    """Full college list for the admin table — no featured filter."""
    params = CollegeFilterParams(page=page, limit=limit, stream=stream, q=q, sort=sort)
    svc = CollegeService(db)
    colleges, meta = await svc.list_colleges(params)
    return ListResponse[Any](data=colleges, meta=meta)


class CollegeUpdateBody(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    ownership: Optional[str] = None
    stream: Optional[str] = None
    feesRange: Optional[str] = None
    about: Optional[str] = None
    isFeature: Optional[bool] = None
    rankingRank: Optional[int] = None
    rankingAuthority: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)


@router.patch("/colleges/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_update_college(
    slug: str,
    body: CollegeUpdateBody,
    _admin: AdminPayload,
    db: DbSession,
):
    """Partial update of a college record."""
    from sqlalchemy import update as sql_update
    from models.college import College

    values: dict = {}
    if body.name is not None:         values["name"] = body.name
    if body.city is not None:         values["city"] = body.city
    if body.state is not None:        values["state"] = body.state
    if body.ownership is not None:    values["ownership"] = body.ownership
    if body.stream is not None:       values["stream"] = body.stream
    if body.feesRange is not None:    values["fees_range"] = body.feesRange
    if body.about is not None:        values["about"] = body.about
    if body.isFeature is not None:    values["is_featured"] = body.isFeature
    if body.rankingRank is not None:  values["ranking_rank"] = body.rankingRank
    if body.rankingAuthority is not None: values["ranking_authority"] = body.rankingAuthority

    if not values:
        return SuccessResponse[MessageResponse](data=MessageResponse(message="Nothing to update."))

    stmt = sql_update(College).where(College.slug == slug).values(**values)
    await db.execute(stmt)
    await db.commit()
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"College '{slug}' updated."))


@router.delete("/colleges/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_delete_college(slug: str, _admin: AdminPayload, db: DbSession):
    from sqlalchemy import delete as sql_delete
    from models.college import College

    result = await db.execute(sql_delete(College).where(College.slug == slug))
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("College")
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"College '{slug}' deleted."))


# ─────────────────────────────────────────────────────────────────────────────
# EXAMS
# ─────────────────────────────────────────────────────────────────────────────

class ExamUpdateBody(BaseModel):
    name: Optional[str] = None
    conductingBody: Optional[str] = None
    description: Optional[str] = None
    registrationCloses: Optional[str] = None
    examDate: Optional[str] = None
    mode: Optional[str] = None
    frequency: Optional[str] = None
    applicationFee: Optional[str] = None
    officialSite: Optional[str] = None
    isFeatured: Optional[bool] = None
    model_config = ConfigDict(populate_by_name=True)


@router.patch("/exams/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_update_exam(slug: str, body: ExamUpdateBody, _admin: AdminPayload, db: DbSession):
    from sqlalchemy import update as sql_update
    from models.exam import Exam

    values: dict = {}
    if body.name is not None:                values["name"] = body.name
    if body.conductingBody is not None:      values["conducting_body"] = body.conductingBody
    if body.description is not None:         values["description"] = body.description
    if body.registrationCloses is not None:  values["registration_closes"] = body.registrationCloses
    if body.examDate is not None:            values["exam_date"] = body.examDate
    if body.mode is not None:                values["mode"] = body.mode
    if body.frequency is not None:           values["frequency"] = body.frequency
    if body.applicationFee is not None:      values["application_fee"] = body.applicationFee
    if body.officialSite is not None:        values["official_site"] = body.officialSite
    if body.isFeatured is not None:          values["is_featured"] = body.isFeatured

    if not values:
        return SuccessResponse[MessageResponse](data=MessageResponse(message="Nothing to update."))

    stmt = sql_update(Exam).where(Exam.slug == slug).values(**values)
    await db.execute(stmt)
    await db.commit()
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"Exam '{slug}' updated."))


# ─────────────────────────────────────────────────────────────────────────────
# ARTICLES
# ─────────────────────────────────────────────────────────────────────────────

class ArticleCreateBody(BaseModel):
    slug: str
    title: str
    excerpt: str
    body: Optional[str] = None
    author: Optional[str] = "Editorial Desk"
    category: Optional[str] = None
    readMinutes: Optional[int] = 5
    publishedAt: str        # "YYYY-MM-DD"
    isPublished: bool = True
    model_config = ConfigDict(populate_by_name=True)


class ArticleUpdateBody(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    body: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    readMinutes: Optional[int] = None
    isPublished: Optional[bool] = None
    model_config = ConfigDict(populate_by_name=True)


@router.post("/articles", response_model=SuccessResponse[MessageResponse], status_code=201)
async def admin_create_article(body: ArticleCreateBody, _admin: AdminPayload, db: DbSession):
    from models.article import Article
    from datetime import date as dt

    published = dt.fromisoformat(body.publishedAt)
    article = Article(
        id=uuid.uuid4(),
        slug=body.slug,
        title=body.title,
        excerpt=body.excerpt,
        body=body.body,
        author=body.author,
        category=body.category,
        read_minutes=body.readMinutes,
        published_at=published,
        is_published=body.isPublished,
    )
    db.add(article)
    await db.commit()
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"Article '{body.slug}' created."))


@router.patch("/articles/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_update_article(slug: str, body: ArticleUpdateBody, _admin: AdminPayload, db: DbSession):
    from sqlalchemy import update as sql_update
    from models.article import Article

    values: dict = {}
    if body.title is not None:       values["title"] = body.title
    if body.excerpt is not None:     values["excerpt"] = body.excerpt
    if body.body is not None:        values["body"] = body.body
    if body.author is not None:      values["author"] = body.author
    if body.category is not None:    values["category"] = body.category
    if body.readMinutes is not None: values["read_minutes"] = body.readMinutes
    if body.isPublished is not None: values["is_published"] = body.isPublished

    if not values:
        return SuccessResponse[MessageResponse](data=MessageResponse(message="Nothing to update."))

    stmt = sql_update(Article).where(Article.slug == slug).values(**values)
    result = await db.execute(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("Article")
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"Article '{slug}' updated."))


@router.delete("/articles/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_delete_article(slug: str, _admin: AdminPayload, db: DbSession):
    from sqlalchemy import delete as sql_delete
    from models.article import Article

    result = await db.execute(sql_delete(Article).where(Article.slug == slug))
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("Article")
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"Article '{slug}' deleted."))


# ─────────────────────────────────────────────────────────────────────────────
# LEADS
# ─────────────────────────────────────────────────────────────────────────────

class LeadStatusUpdateBody(BaseModel):
    status: str   # new | contacted | converted | closed
    model_config = ConfigDict(populate_by_name=True)


@router.get("/leads", response_model=SuccessResponse[list])
async def admin_list_leads(
    _admin: AdminPayload,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    lead_type: Optional[str] = Query(None),
):
    """List all leads for the admin inbox."""
    from sqlalchemy import select, func
    from models.lead import Lead

    stmt = select(Lead).order_by(Lead.created_at.desc())
    if status:
        stmt = stmt.where(Lead.status == status)
    if lead_type:
        stmt = stmt.where(Lead.type == lead_type)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * limit
    result = await db.execute(stmt.offset(offset).limit(limit))
    leads = result.scalars().all()

    return SuccessResponse[list](data=[
        {
            "id": str(lead.id),
            "name": lead.name,
            "phone": lead.phone,
            "email": lead.email,
            "collegeSlug": lead.college_slug,
            "type": lead.type.value if hasattr(lead.type, "value") else lead.type,
            "status": lead.status.value if hasattr(lead.status, "value") else lead.status,
            "createdAt": lead.created_at.isoformat() if lead.created_at else None,
        }
        for lead in leads
    ])


@router.patch("/leads/{lead_id}", response_model=SuccessResponse[MessageResponse])
async def admin_update_lead_status(
    lead_id: str,
    body: LeadStatusUpdateBody,
    _admin: AdminPayload,
    db: DbSession,
):
    from sqlalchemy import update as sql_update
    from models.lead import Lead, LeadStatus

    allowed = {s.value for s in LeadStatus}
    if body.status not in allowed:
        from core.exceptions import ValidationError
        raise ValidationError(f"status must be one of: {', '.join(allowed)}")

    stmt = sql_update(Lead).where(Lead.id == uuid.UUID(lead_id)).values(status=body.status)
    result = await db.execute(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("Lead")
    return SuccessResponse[MessageResponse](data=MessageResponse(message="Lead status updated."))
