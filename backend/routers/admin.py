"""
Admin CRUD endpoints — all require ADMIN role JWT.

Pattern: thin routers that call the same services as the public endpoints,
but with write operations (create / update / delete) added.  The ADMIN
dependency is injected at router level so every endpoint in this file is
automatically protected.
"""

import uuid
from datetime import date
from typing import Any, Literal, Optional

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from core import college_rules as rules
from core.dependencies import AdminPayload, DbSession
from data.india_districts import INDIA_DISTRICTS
from core.exceptions import ConflictError, NotFoundError, ValidationError
from schemas.article import ArticleSection
from schemas.college import CollegeFilterParams
from models.college import OwnershipType
from models.exam import ExamLevel
from schemas.common import ListResponse, Meta, SuccessResponse
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
    sort: str = Query("newest"),
    status: str = Query("all", pattern="^(all|draft|published|archived)$"),
):
    """Full college list for the admin table: every status unless one is asked for. Newest first unless asked otherwise."""
    params = CollegeFilterParams(page=page, limit=limit, stream=stream, q=q, sort=sort, status=status)
    svc = CollegeService(db)
    colleges, meta = await svc.list_colleges(params)
    return ListResponse[Any](data=colleges, meta=meta)


def _card_photo(value):
    """Empty, an upload, or a photo shipped with the site. Never an external address."""
    if value is None:
        return value
    value = value.strip()
    allowed = value.startswith("/api/uploads/") or value.startswith("/images/")
    if value and (not allowed or ".." in value):
        raise ValueError("must be an image uploaded through the admin")
    return value


class CollegeUpdateBody(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    ownership: Optional[OwnershipType] = None
    stream: Optional[str] = None
    institutionType: Optional[Literal["College", "University"]] = None
    feesRange: Optional[str] = None
    about: Optional[str] = None
    isFeature: Optional[bool] = None
    rankingRank: Optional[int] = Field(default=None, ge=1)
    rankingAuthority: Optional[str] = None
    coursesOffered: Optional[int] = Field(default=None, ge=0)
    established: Optional[int] = None
    examsAccepted: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    approvals: Optional[list[str]] = None
    image: Optional[str] = Field(default=None, max_length=200)
    model_config = ConfigDict(populate_by_name=True)

    _image = field_validator("image")(_card_photo)

    @field_validator("name")
    @classmethod
    def _name(cls, value):
        return value if value is None else rules.check_name(value, "The college name")

    @field_validator("established")
    @classmethod
    def _established(cls, value):
        return rules.check_year_established(value)

    @field_validator("feesRange")
    @classmethod
    def _fees(cls, value):
        return value if value is None else rules.check_fee_range(value, "The total fee range")


class CollegeCreateBody(BaseModel):
    name: str = Field(min_length=2, max_length=500)
    slug: str = Field(min_length=2, max_length=200, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    city: str = Field(min_length=1, max_length=200)
    state: str = Field(min_length=1, max_length=200)
    ownership: OwnershipType
    stream: str = Field(min_length=1, max_length=100)
    institutionType: Literal["College", "University"] = "College"
    feesRange: Optional[str] = Field(default=None, max_length=100)
    about: Optional[str] = None
    rankingAuthority: Optional[str] = Field(default=None, max_length=100)
    rankingRank: Optional[int] = Field(default=None, ge=1)
    established: Optional[int] = None
    image: Optional[str] = Field(default=None, max_length=200)
    # Sent again when the editor has seen the duplicate warning and wants the college added anyway.
    confirmDuplicate: bool = False
    model_config = ConfigDict(populate_by_name=True)

    _image = field_validator("image")(_card_photo)

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return rules.check_name(value, "The college name")

    @field_validator("city")
    @classmethod
    def _city(cls, value: str) -> str:
        return rules.check_name(value, "The city")

    @field_validator("state")
    @classmethod
    def _state(cls, value: str) -> str:
        value = value.strip()
        if INDIA_DISTRICTS and value not in INDIA_DISTRICTS:
            raise ValueError("Choose a state from the list.")
        return value

    @field_validator("established")
    @classmethod
    def _established(cls, value):
        return rules.check_year_established(value)

    @field_validator("feesRange")
    @classmethod
    def _fees(cls, value):
        return value if value is None else rules.check_fee_range(value, "The total fee range")


@router.post("/colleges", response_model=SuccessResponse[MessageResponse], status_code=201)
async def admin_create_college(body: CollegeCreateBody, _admin: AdminPayload, db: DbSession):
    """Create a college. The slug must be new: an existing one is a 409, never an overwrite."""
    from sqlalchemy import func, select
    from models.college import College

    existing = (await db.execute(select(College.id).where(College.slug == body.slug))).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("COLLEGE_SLUG_TAKEN", f"A college with slug '{body.slug}' already exists.")

    # The same name in the same city is probably the same college. Say so once; the editor can go ahead.
    if not body.confirmDuplicate:
        twin = (
            await db.execute(
                select(College.slug).where(
                    func.lower(College.name) == body.name.lower(), func.lower(College.city) == body.city.lower()
                )
            )
        ).scalar_one_or_none()
        if twin is not None:
            raise ConflictError(
                "COLLEGE_DUPLICATE",
                f"Possible duplicate: '{body.name}' in {body.city} already exists ({twin}). Add it anyway?",
            )

    db.add(College(
        id=uuid.uuid4(),
        slug=body.slug,
        name=body.name,
        city=body.city,
        state=body.state,
        ownership=body.ownership,
        stream=body.stream,
        institution_type=body.institutionType,
        fees_range=body.feesRange,
        about=body.about,
        ranking_authority=body.rankingAuthority,
        ranking_rank=body.rankingRank,
        established=body.established,
        image=body.image or "",
        # Not public until someone has looked at it and published it.
        status="draft",
    ))
    await db.commit()
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"College '{body.slug}' created as a draft."))


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
    if body.institutionType is not None: values["institution_type"] = body.institutionType
    if body.feesRange is not None:    values["fees_range"] = body.feesRange
    if body.about is not None:        values["about"] = body.about
    if body.isFeature is not None:    values["is_featured"] = body.isFeature
    if body.rankingRank is not None:  values["ranking_rank"] = body.rankingRank
    if body.rankingAuthority is not None: values["ranking_authority"] = body.rankingAuthority
    if body.coursesOffered is not None:  values["courses_offered"] = body.coursesOffered
    if body.established is not None:     values["established"] = body.established
    if body.examsAccepted is not None:   values["exams_accepted"] = body.examsAccepted
    if body.tags is not None:            values["tags"] = body.tags
    if body.approvals is not None:       values["approvals"] = body.approvals
    if body.image is not None:           values["image"] = body.image

    if not values:
        return SuccessResponse[MessageResponse](data=MessageResponse(message="Nothing to update."))

    stmt = sql_update(College).where(College.slug == slug).values(**values)
    await db.execute(stmt)
    await db.commit()
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"College '{slug}' updated."))


class CollegeStatusBody(BaseModel):
    status: Literal["draft", "published", "archived"]
    model_config = ConfigDict(extra="forbid")


@router.patch("/colleges/{slug}/status", response_model=SuccessResponse[MessageResponse])
async def admin_set_college_status(slug: str, body: CollegeStatusBody, _admin: AdminPayload, db: DbSession):
    """Publish a draft, archive a college (hidden, nothing lost) or bring an archived one back."""
    from sqlalchemy import update as sql_update
    from models.college import College

    result = await db.execute(sql_update(College).where(College.slug == slug).values(status=body.status))
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("College")
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"College '{slug}' is now {body.status}."))


@router.delete("/colleges/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_delete_college(slug: str, _admin: AdminPayload, db: DbSession):
    """Permanent. Only an archived college can be deleted, so a click on the wrong row never loses data."""
    from sqlalchemy import delete as sql_delete, select
    from models.college import College

    current = (await db.execute(select(College.status).where(College.slug == slug))).scalar_one_or_none()
    if current is None:
        raise NotFoundError("College")
    if current != "archived":
        raise ConflictError("COLLEGE_NOT_ARCHIVED", "Archive the college first. Only an archived college can be deleted for good.")
    result = await db.execute(sql_delete(College).where(College.slug == slug))
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("College")
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"College '{slug}' deleted."))


# ─────────────────────────────────────────────────────────────────────────────
# EXAMS
# ─────────────────────────────────────────────────────────────────────────────

class ExamFaqBody(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    answer: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")


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
    level: Optional[ExamLevel] = None
    durationMinutes: Optional[int] = Field(default=None, ge=0, le=1440)
    sections: Optional[list[str]] = Field(default=None, max_length=30)
    # The category (stream) the exam is listed under, e.g. Management. Matches a name in the Fields list.
    stream: Optional[str] = Field(default=None, max_length=100)
    eligibility: Optional[str] = Field(default=None, max_length=5000)
    syllabus: Optional[str] = Field(default=None, max_length=8000)
    faqs: Optional[list[ExamFaqBody]] = Field(default=None, max_length=20)
    image: Optional[str] = Field(default=None, max_length=200)
    statusLabel: Optional[str] = Field(default=None, max_length=40)
    model_config = ConfigDict(populate_by_name=True)

    _image = field_validator("image")(_card_photo)


class ExamCreateBody(BaseModel):
    slug: str = Field(min_length=2, max_length=200, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    name: str = Field(min_length=2, max_length=500)
    conductingBody: str = Field(min_length=2, max_length=200)
    level: ExamLevel
    description: str = Field(min_length=1)
    mode: Optional[str] = Field(default=None, max_length=50)
    examDate: Optional[str] = Field(default=None, max_length=50)
    registrationCloses: Optional[str] = Field(default=None, max_length=50)
    frequency: Optional[str] = Field(default=None, max_length=100)
    applicationFee: Optional[str] = Field(default=None, max_length=100)
    officialSite: Optional[str] = Field(default=None, max_length=300)
    durationMinutes: Optional[int] = Field(default=None, ge=0, le=1440)
    sections: Optional[list[str]] = Field(default=None, max_length=30)
    # The category (stream) the exam is listed under, e.g. Management. Matches a name in the Fields list.
    stream: Optional[str] = Field(default=None, max_length=100)
    eligibility: Optional[str] = Field(default=None, max_length=5000)
    syllabus: Optional[str] = Field(default=None, max_length=8000)
    faqs: Optional[list[ExamFaqBody]] = Field(default=None, max_length=20)
    image: Optional[str] = Field(default=None, max_length=200)
    statusLabel: Optional[str] = Field(default=None, max_length=40)
    model_config = ConfigDict(populate_by_name=True)

    _image = field_validator("image")(_card_photo)


@router.post("/exams", response_model=SuccessResponse[MessageResponse], status_code=201)
async def admin_create_exam(body: ExamCreateBody, _admin: AdminPayload, db: DbSession):
    """Create an exam. The slug must be new: an existing one is a 409, never an overwrite."""
    from sqlalchemy import select
    from models.exam import Exam

    existing = (await db.execute(select(Exam.id).where(Exam.slug == body.slug))).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("EXAM_SLUG_TAKEN", f"An exam with slug '{body.slug}' already exists.")

    db.add(Exam(
        id=uuid.uuid4(),
        slug=body.slug,
        name=body.name,
        conducting_body=body.conductingBody,
        level=body.level,
        description=body.description,
        mode=body.mode,
        exam_date=body.examDate,
        registration_closes=body.registrationCloses,
        frequency=body.frequency,
        application_fee=body.applicationFee,
        official_site=body.officialSite,
        duration_minutes=body.durationMinutes,
        sections=body.sections,
        stream=(body.stream or "").strip() or None,
        eligibility=body.eligibility or "",
        syllabus=body.syllabus or "",
        faqs=[f.model_dump() for f in body.faqs or []],
        image=body.image or "",
        status_label=(body.statusLabel or "").strip(),
    ))
    await db.commit()
    return SuccessResponse[MessageResponse](data=MessageResponse(message=f"Exam '{body.slug}' created."))


@router.patch("/exams/{slug}", response_model=SuccessResponse[MessageResponse])
async def admin_update_exam(slug: str, body: ExamUpdateBody, _admin: AdminPayload, db: DbSession):
    from sqlalchemy import update as sql_update
    from models.exam import Exam

    values: dict = {}
    if body.name is not None:                values["name"] = body.name
    if body.level is not None:               values["level"] = body.level
    if body.conductingBody is not None:      values["conducting_body"] = body.conductingBody
    if body.description is not None:         values["description"] = body.description
    if body.registrationCloses is not None:  values["registration_closes"] = body.registrationCloses
    if body.examDate is not None:            values["exam_date"] = body.examDate
    if body.mode is not None:                values["mode"] = body.mode
    if body.frequency is not None:           values["frequency"] = body.frequency
    if body.applicationFee is not None:      values["application_fee"] = body.applicationFee
    if body.officialSite is not None:        values["official_site"] = body.officialSite
    if body.isFeatured is not None:          values["is_featured"] = body.isFeatured
    if body.durationMinutes is not None:     values["duration_minutes"] = body.durationMinutes
    if body.sections is not None:            values["sections"] = body.sections
    if body.stream is not None:              values["stream"] = body.stream.strip() or None
    if body.eligibility is not None:         values["eligibility"] = body.eligibility
    if body.syllabus is not None:            values["syllabus"] = body.syllabus
    if body.faqs is not None:                values["faqs"] = [f.model_dump() for f in body.faqs]
    if body.image is not None:               values["image"] = body.image
    if body.statusLabel is not None:         values["status_label"] = body.statusLabel.strip()

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
    relatedCollegeSlugs: list[str] = Field(default_factory=list, max_length=20)
    image: Optional[str] = Field(default=None, max_length=200)
    sections: list[ArticleSection] = Field(default_factory=list, max_length=30)
    model_config = ConfigDict(populate_by_name=True)

    _image = field_validator("image")(_card_photo)


class ArticleUpdateBody(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    body: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    readMinutes: Optional[int] = None
    isPublished: Optional[bool] = None
    publishedAt: Optional[str] = None   # "YYYY-MM-DD"
    relatedCollegeSlugs: Optional[list[str]] = Field(default=None, max_length=20)
    image: Optional[str] = Field(default=None, max_length=200)
    sections: Optional[list[ArticleSection]] = Field(default=None, max_length=30)
    model_config = ConfigDict(populate_by_name=True)

    _image = field_validator("image")(_card_photo)


@router.post("/articles", response_model=SuccessResponse[MessageResponse], status_code=201)
async def admin_create_article(body: ArticleCreateBody, _admin: AdminPayload, db: DbSession):
    from models.article import Article
    from datetime import date as dt

    from sqlalchemy import select as sql_select

    if (await db.execute(sql_select(Article.id).where(Article.slug == body.slug))).scalar_one_or_none() is not None:
        raise ConflictError("ARTICLE_SLUG_TAKEN", f"An article with slug '{body.slug}' already exists.")
    try:
        published = dt.fromisoformat(body.publishedAt)
    except ValueError:
        raise ValidationError("publishedAt: use a date.")
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
        related_college_slugs=",".join(body.relatedCollegeSlugs),
        image=body.image or "",
        sections=[sec.model_dump() for sec in body.sections],
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
    if body.publishedAt is not None:
        from datetime import date as dt
        try:
            values["published_at"] = dt.fromisoformat(body.publishedAt)
        except ValueError:
            raise ValidationError("publishedAt: use a date.")
    if body.relatedCollegeSlugs is not None: values["related_college_slugs"] = ",".join(body.relatedCollegeSlugs)
    if body.image is not None:       values["image"] = body.image
    if body.sections is not None:    values["sections"] = [sec.model_dump() for sec in body.sections]

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


@router.get("/leads", response_model=ListResponse[dict])
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
    from sqlalchemy.orm import selectinload
    from models.lead import Lead

    stmt = select(Lead).order_by(Lead.created_at.desc())
    if status:
        stmt = stmt.where(Lead.status == status)
    if lead_type:
        stmt = stmt.where(Lead.type == lead_type)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * limit
    result = await db.execute(stmt.options(selectinload(Lead.replies)).offset(offset).limit(limit))
    leads = result.scalars().all()
    pages = max(1, -(-total // limit))

    from services.lead_view import lead_json

    return ListResponse[dict](
        meta=Meta(total=total, page=page, limit=limit, pages=pages),
        data=[lead_json(lead) for lead in leads],
    )


@router.get("/leads/export.csv")
async def admin_export_leads(
    _admin: AdminPayload,
    db: DbSession,
    status: Optional[str] = Query(None),
    lead_type: Optional[str] = Query(None),
):
    """Every lead matching the filters, as a spreadsheet file."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from models.lead import Lead
    from services.lead_export import MAX_ROWS, leads_csv_response

    stmt = select(Lead).order_by(Lead.created_at.desc()).limit(MAX_ROWS)
    if status:
        stmt = stmt.where(Lead.status == status)
    if lead_type:
        stmt = stmt.where(Lead.type == lead_type)
    leads = (await db.execute(stmt.options(selectinload(Lead.replies)))).scalars().all()
    return leads_csv_response(list(leads), for_college=False)


class LeadReplyBody(BaseModel):
    body: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 2000:
            raise ValueError("A reply must be between 2 and 2000 characters.")
        return v


@router.post("/leads/{lead_id}/replies", response_model=SuccessResponse[MessageResponse], status_code=201)
async def admin_reply_to_lead(lead_id: str, body: LeadReplyBody, admin: AdminPayload, db: DbSession):
    """Send a reply the lead's owner sees under My account → Replies."""
    from repositories.lead import LeadRepository
    from repositories.user import UserRepository

    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError as exc:
        raise ValidationError("lead_id: not a valid id.") from exc

    leads = LeadRepository(db)
    lead = await leads.get(lead_uuid)
    if not lead:
        raise NotFoundError("Lead")

    author = await UserRepository(db).find_by_id(uuid.UUID(admin["sub"]))
    await leads.add_reply(lead_uuid, author.name if author else "TopCollegePath team", body.body)

    # The student sees it under My account, and is told. A failure to notify must not undo the reply.
    if lead.user_id:
        try:
            from services.notify import notify

            await notify(db, [lead.user_id], kind="lead.reply", title="You have a reply to your enquiry", body=body.body[:200], link="/account/replies")
        except Exception:  # noqa: BLE001
            pass
    return SuccessResponse[MessageResponse](data=MessageResponse(message="Reply sent."))


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

    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError as exc:
        from core.exceptions import ValidationError as _ValidationError
        raise _ValidationError("lead_id: not a valid id.") from exc
    stmt = sql_update(Lead).where(Lead.id == lead_uuid).values(status=body.status)
    result = await db.execute(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise NotFoundError("Lead")
    return SuccessResponse[MessageResponse](data=MessageResponse(message="Lead status updated."))
