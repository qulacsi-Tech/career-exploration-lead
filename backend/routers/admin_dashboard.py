"""Admin dashboard figures. ADMIN role required.

Every number on the dashboard is computed here from the database. Nothing is
sampled or estimated.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import func, select

from core.dependencies import AdminPayload, DbSession
from models.article import Article
from models.college import College
from models.exam import Exam
from models.lead import Lead, LeadStatus, LeadType
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin", tags=["admin"])

WINDOW_DAYS = 14
SOURCE_LABELS = {
    LeadType.CALLBACK.value: "Callback requests",
    LeadType.COUNSELLING.value: "Counselling",
    LeadType.BROCHURE.value: "Brochure downloads",
    LeadType.ENQUIRY.value: "Enquiries",
}


def _value(enum_or_str) -> str:
    return enum_or_str.value if hasattr(enum_or_str, "value") else str(enum_or_str)


@router.get("/dashboard", response_model=SuccessResponse[dict])
async def admin_dashboard(_admin: AdminPayload, db: DbSession):
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=WINDOW_DAYS - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    total_leads = (await db.execute(select(func.count()).select_from(Lead))).scalar_one()
    new_leads = (await db.execute(
        select(func.count()).select_from(Lead).where(Lead.status == LeadStatus.NEW)
    )).scalar_one()

    per_day = {
        str(day): count
        for day, count in (await db.execute(
            select(func.date(Lead.created_at), func.count())
            .where(Lead.created_at >= start)
            .group_by(func.date(Lead.created_at))
        )).all()
    }
    series = [
        {"date": (start + timedelta(days=i)).date().isoformat(),
         "count": per_day.get((start + timedelta(days=i)).date().isoformat(), 0)}
        for i in range(WINDOW_DAYS)
    ]

    by_type = (await db.execute(select(Lead.type, func.count()).group_by(Lead.type))).all()
    sources = [
        {"label": SOURCE_LABELS.get(_value(kind), _value(kind)), "count": count}
        for kind, count in by_type
    ]

    recent = (await db.execute(select(Lead).order_by(Lead.created_at.desc()).limit(8))).scalars().all()

    colleges = (await db.execute(select(func.count()).select_from(College))).scalar_one()
    exams = (await db.execute(select(func.count()).select_from(Exam))).scalar_one()
    articles = (await db.execute(select(func.count()).select_from(Article))).scalar_one()

    return SuccessResponse[dict](data={
        "totals": {
            "leads": total_leads,
            "newLeads": new_leads,
            "colleges": colleges,
            "exams": exams,
            "articles": articles,
        },
        "leadsByDay": series,
        "leadSources": sources,
        "recentLeads": [
            {
                "id": str(lead.id),
                "name": lead.name,
                "type": _value(lead.type),
                "status": _value(lead.status),
                "collegeSlug": lead.college_slug,
                "createdAt": lead.created_at.isoformat() if lead.created_at else None,
            }
            for lead in recent
        ],
    })
