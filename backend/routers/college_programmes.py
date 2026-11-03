"""A college's courses, a page at a time, for the Courses tab.

A college can list many courses and each course many specialisations, so the tab shows the first few and loads the
rest as the visitor asks for them (and keeps loading as they scroll). The order is fixed (the order the courses were
added, then by name), so the first page, the next and the next never repeat or skip a course.
"""

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from core.dependencies import DbSession
from core.exceptions import NotFoundError
from models.college import College
from models.course import Course
from schemas.college import CourseSchema
from schemas.common import SuccessResponse

router = APIRouter(prefix="/colleges", tags=["colleges"])


def _out(c: Course) -> dict:
    return CourseSchema(
        name=c.name,
        specialisation=c.specialisation or "",
        duration=c.duration,
        mode=c.mode,
        fees=c.fees,
        exams=c.exams or [],
        eligibility=c.eligibility or "",
        seats=c.seats,
        onlineOffered=bool(c.online_offered and c.online_enabled),
        onlineDuration=c.online_duration or "",
        onlineFees=c.online_fees or "",
        certificateOffered=bool(c.certificate_offered),
        certificateName=c.certificate_name or "",
    ).model_dump()


async def _college_id(db, slug: str):
    found = (await db.execute(select(College.id).where(College.slug == slug, College.status == "published"))).scalar_one_or_none()
    if found is None:
        raise NotFoundError("College")
    return found


@router.get("/{slug}/programmes", response_model=SuccessResponse[dict])
async def programmes(
    slug: str,
    db: DbSession,
    offset: int = Query(0, ge=0),
    limit: int = Query(3, ge=1, le=50),
    spec_limit: int = Query(2, ge=0, le=50),
):
    """`limit` courses from `offset`, each with its first `spec_limit` specialisations and how many it has in all."""
    college_id = await _college_id(db, slug)
    first = func.min(Course.created_at)
    names = select(Course.name).where(Course.college_id == college_id).group_by(Course.name)
    total = (await db.execute(select(func.count()).select_from(names.subquery()))).scalar_one()
    page = (await db.execute(names.order_by(first, Course.name).offset(offset).limit(limit))).scalars().all()
    if not page:
        return SuccessResponse[dict](data={"total": int(total), "items": []})

    rows = (
        await db.execute(
            select(Course).where(Course.college_id == college_id, Course.name.in_(page)).order_by(Course.created_at, Course.specialisation)
        )
    ).scalars().all()
    items = []
    for name in page:
        mine = [r for r in rows if r.name == name]
        whole = next((r for r in mine if not r.specialisation), None)
        specialised = [r for r in mine if r.specialisation]
        items.append(
            {
                "name": name,
                "whole": _out(whole) if whole else None,
                "specialisations": [_out(r) for r in specialised[:spec_limit]],
                "specialisationTotal": len(specialised),
            }
        )
    return SuccessResponse[dict](data={"total": int(total), "items": items})


@router.get("/{slug}/programmes/specialisations", response_model=SuccessResponse[dict])
async def specialisations(
    slug: str,
    db: DbSession,
    course: str = Query(..., min_length=1, max_length=200),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """`limit` specialisations of one course from `offset`."""
    college_id = await _college_id(db, slug)
    base = (Course.college_id == college_id, Course.name == course, Course.specialisation != "")
    total = (await db.execute(select(func.count()).select_from(Course).where(*base))).scalar_one()
    rows = (await db.execute(select(Course).where(*base).order_by(Course.created_at, Course.specialisation).offset(offset).limit(limit))).scalars().all()
    return SuccessResponse[dict](data={"total": int(total), "items": [_out(r) for r in rows]})
