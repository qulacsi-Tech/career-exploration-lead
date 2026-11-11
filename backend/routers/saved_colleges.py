"""Colleges a student saved to their profile, and who saved a college.

A signed-in student saves and removes colleges from the college page and sees them under My account. The platform
team sees every college with how many students saved it, and who. A college's admin sees the students who saved
their own college. A student's contact details go to a college only when they agreed to be contacted (the box
ticked at sign-up); the others are counted, not shown.
"""

from fastapi import APIRouter, Query
from sqlalchemy import delete, func, or_, select

from core.dependencies import AdminPayload, CollegeAdminScope, CurrentUserId, DbSession
from core.exceptions import NotFoundError
from models.college import College
from models.saved_college import SavedCollege
from models.user import User
from schemas.common import ListResponse, Meta, SuccessResponse

me_router = APIRouter(prefix="/me/saved-colleges", tags=["me"])
admin_router = APIRouter(prefix="/admin/saved-colleges", tags=["admin"])
college_router = APIRouter(prefix="/college/saved-students", tags=["college"])


def _meta(total: int, page: int, limit: int) -> Meta:
    return Meta(total=int(total), page=page, limit=limit, pages=max(1, -(-int(total) // limit)))


async def _published(db, slug: str) -> College:
    college = (await db.execute(select(College).where(College.slug == slug, College.status == "published"))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    return college


async def _tell_college(db, college: College) -> None:
    """Tells the college's admin that a student saved it. No name or contact details: those are in Saved by students."""
    try:
        from services.notify import college_admin_id, notify

        owner = await college_admin_id(db, college.slug)
        if not owner:
            return
        total = (await db.execute(select(func.count()).select_from(SavedCollege).where(SavedCollege.college_id == college.id))).scalar_one()
        await notify(
            db,
            [owner],
            kind="college.saved",
            title="A student saved your college",
            body=f"{total} {'student has' if total == 1 else 'students have'} saved {college.name}.",
            link="/admin/leads/saved",
        )
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger(__name__).exception("could not tell the college admin about a saved college")


# -- The student ---------------------------------------------------------------

@me_router.get("", response_model=SuccessResponse[list])
async def my_saved(user_id: CurrentUserId, db: DbSession):
    """The colleges this student saved, newest first."""
    rows = (
        await db.execute(
            select(College, SavedCollege.created_at)
            .join(SavedCollege, SavedCollege.college_id == College.id)
            .where(SavedCollege.user_id == user_id, College.status == "published")
            .order_by(SavedCollege.created_at.desc())
        )
    ).all()
    return SuccessResponse[list](
        data=[
            {
                "slug": c.slug,
                "name": c.name,
                "city": c.city or "",
                "state": c.state or "",
                "stream": c.stream or "",
                "image": c.image or "",
                "rating": float(c.rating or 0),
                "savedAt": at.isoformat() if at else None,
            }
            for c, at in rows
        ]
    )


@me_router.get("/slugs", response_model=SuccessResponse[list])
async def my_saved_slugs(user_id: CurrentUserId, db: DbSession):
    """Just the slugs, so a college page can show whether it is saved."""
    rows = (await db.execute(select(College.slug).join(SavedCollege, SavedCollege.college_id == College.id).where(SavedCollege.user_id == user_id))).scalars().all()
    return SuccessResponse[list](data=list(rows))


@me_router.put("/{slug}", response_model=SuccessResponse[dict])
async def save_college(slug: str, user_id: CurrentUserId, db: DbSession):
    """Saves the college to the student's profile. Saving it again changes nothing."""
    college = await _published(db, slug)
    exists = (await db.execute(select(SavedCollege).where(SavedCollege.user_id == user_id, SavedCollege.college_id == college.id))).scalar_one_or_none()
    if exists is None:
        db.add(SavedCollege(user_id=user_id, college_id=college.id))
        await db.commit()
        await _tell_college(db, college)
    return SuccessResponse[dict](data={"saved": True})


@me_router.delete("/{slug}", response_model=SuccessResponse[dict])
async def unsave_college(slug: str, user_id: CurrentUserId, db: DbSession):
    """Takes the college off the student's saved list."""
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is not None:
        await db.execute(delete(SavedCollege).where(SavedCollege.user_id == user_id, SavedCollege.college_id == college.id))
        await db.commit()
    return SuccessResponse[dict](data={"saved": False})


# -- The platform team ---------------------------------------------------------

@admin_router.get("", response_model=ListResponse[dict])
async def colleges_with_saves(
    _admin: AdminPayload,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=100),
):
    """Every college that has been saved, with how many students saved it, most saved first."""
    conditions = []
    if q.strip():
        like = f"%{q.strip()}%"
        conditions.append(or_(College.name.ilike(like), College.city.ilike(like), College.state.ilike(like)))
    saves = func.count(SavedCollege.user_id)
    base = select(College.id).join(SavedCollege, SavedCollege.college_id == College.id).where(*conditions).group_by(College.id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (
        await db.execute(
            select(College.slug, College.name, College.city, College.state, saves, func.max(SavedCollege.created_at))
            .join(SavedCollege, SavedCollege.college_id == College.id)
            .where(*conditions)
            .group_by(College.id)
            .order_by(saves.desc(), College.name, College.id)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    data = [{"slug": r[0], "name": r[1], "city": r[2] or "", "state": r[3] or "", "saveCount": int(r[4]), "lastSavedAt": r[5].isoformat() if r[5] else None} for r in rows]
    return ListResponse[dict](data=data, meta=_meta(total, page, limit))


async def _students(db, college_id, page: int, limit: int, q: str, consented_only: bool):
    conditions = [SavedCollege.college_id == college_id]
    if q.strip():
        like = f"%{q.strip()}%"
        conditions.append(or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like), User.city.ilike(like)))
    shown = [*conditions, User.marketing_consent.is_(True)] if consented_only else conditions
    total = (await db.execute(select(func.count()).select_from(SavedCollege).join(User, User.id == SavedCollege.user_id).where(*shown))).scalar_one()
    rows = (
        await db.execute(
            select(User, SavedCollege.created_at)
            .join(SavedCollege, SavedCollege.user_id == User.id)
            .where(*shown)
            .order_by(SavedCollege.created_at.desc(), User.id)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    items = [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone or "",
            "city": u.city or "",
            "contactOk": bool(u.marketing_consent),
            "savedAt": at.isoformat() if at else None,
        }
        for u, at in rows
    ]
    return items, total


@admin_router.get("/{slug}/students", response_model=ListResponse[dict])
async def students_who_saved(
    slug: str,
    _admin: AdminPayload,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=100),
):
    """Every student who saved the college, newest first."""
    college = (await db.execute(select(College).where(College.slug == slug))).scalar_one_or_none()
    if college is None:
        raise NotFoundError("College")
    items, total = await _students(db, college.id, page, limit, q, consented_only=False)
    return ListResponse[dict](data=items, meta=_meta(total, page, limit))


# -- A college's own admin -----------------------------------------------------

@college_router.get("", response_model=SuccessResponse[dict])
async def my_college_students(
    scope: CollegeAdminScope,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=100),
):
    """The students who saved this college and agreed to be contacted. The others are only counted."""
    items, total = await _students(db, scope["college_id"], page, limit, q, consented_only=True)
    everyone = (await db.execute(select(func.count()).select_from(SavedCollege).where(SavedCollege.college_id == scope["college_id"]))).scalar_one()
    meta = _meta(total, page, limit)
    not_shared = None if q.strip() else int(everyone) - int(total)
    return SuccessResponse[dict](data={"items": items, "meta": meta.model_dump(), "totalSaved": int(everyone), "notShared": not_shared})
