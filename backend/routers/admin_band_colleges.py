"""Which colleges sit in a homepage band, and in what order. ADMIN role required.

A band is a collection, and a collection's colleges are the editor's chosen
`collegeSlugs`. This is the light endpoint the Manage colleges dialog uses, so
picking and ordering colleges never has to resend (and risk overwriting) the whole
collection. When the collection is bound to a ranking list, the ranking decides the
order on the site; the list here is still the membership, in the editor's order.
"""

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.collection import Collection
from models.college import College
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/collections", tags=["admin"])

MAX_COLLEGES = 100


class BandCollegesBody(BaseModel):
    slugs: list[str] = Field(default_factory=list, max_length=MAX_COLLEGES)
    model_config = ConfigDict(extra="forbid")


def _card(college: College) -> dict:
    return {
        "slug": college.slug,
        "name": college.name,
        "city": college.city,
        "state": college.state,
        "ownership": college.ownership.value if hasattr(college.ownership, "value") else str(college.ownership),
        "stream": college.stream,
        "feesRange": college.fees_range or "",
        "image": college.image,
    }


async def _collection(db, slug: str) -> Collection:
    rows = (await db.execute(select(Collection))).scalars().all()
    row = next((r for r in rows if r.data.get("slug") == slug), None)
    if row is None:
        raise NotFoundError("Collection")
    return row


@router.get("/{slug}/colleges", response_model=SuccessResponse[dict])
async def band_colleges(slug: str, _admin: AdminPayload, db: DbSession):
    """The band's colleges in the editor's order, and every other college that could be added."""
    row = await _collection(db, slug)
    chosen = list(row.data.get("collegeSlugs") or [])
    colleges = {c.slug: c for c in (await db.execute(select(College).order_by(College.name))).scalars().all()}
    return SuccessResponse[dict](data={
        # A chosen slug with no college behind it is dropped, as the public page does.
        "colleges": [_card(colleges[s]) for s in chosen if s in colleges],
        "options": [_card(c) for s, c in colleges.items() if s not in chosen],
        "rankingBound": bool(row.data.get("rankingListSlug")),
    })


@router.put("/{slug}/colleges", response_model=SuccessResponse[dict])
async def save_band_colleges(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    try:
        data = BandCollegesBody.model_validate(body)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    if len(set(data.slugs)) != len(data.slugs):
        raise ValidationError("slugs: a college appears more than once.")
    known = set((await db.execute(select(College.slug).where(College.slug.in_(data.slugs)))).scalars().all()) if data.slugs else set()
    missing = [s for s in data.slugs if s not in known]
    if missing:
        raise ValidationError(f"slugs: unknown college '{missing[0]}'.")

    row = await _collection(db, slug)
    # Reassigned, not mutated, so SQLAlchemy sees the JSON column change.
    row.data = {**row.data, "collegeSlugs": data.slugs}
    await db.commit()
    return SuccessResponse[dict](data={"message": "Colleges saved."})
