from typing import Optional

from fastapi import APIRouter, Query

from core.dependencies import DbSession
from schemas.college import CollegeDetailSchema, CollegeFilterParams, CollegeListSchema
from schemas.common import ListResponse, Meta, SuccessResponse
from services.college import CollegeService
from services.collections import CollectionService
from routers.nav_menu import excluded_for

router = APIRouter(prefix="/colleges", tags=["colleges"])


@router.get("", response_model=ListResponse[CollegeListSchema])
async def list_colleges(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    stream: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    ownership: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    approval: Optional[str] = Query(None),
    exam: Optional[str] = Query(None),
    fees_min: Optional[int] = Query(None),
    fees_max: Optional[int] = Query(None),
    ranking_max: Optional[int] = Query(None),
    ranking_list: Optional[str] = Query(None),
    specialisation: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    credential: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort: str = Query("popularity"),
    featured: Optional[bool] = Query(None),
    q: Optional[str] = Query(None),
    collection: Optional[str] = Query(None, max_length=200),
    menu: Optional[str] = Query(None, max_length=300),
):
    params = CollegeFilterParams(
        page=page, limit=limit, stream=stream, city=city, state=state,
        ownership=ownership, course=course, mode=mode, approval=approval,
        exam=exam, fees_min=fees_min, fees_max=fees_max, ranking_max=ranking_max, ranking_list=ranking_list,
        specialisation=specialisation, level=level, credential=credential, min_rating=min_rating,
        sort=sort, featured=featured, q=q,
    )
    if collection:
        # A hand-picked collection lists its own colleges; any other filter still narrows them.
        picked = await CollectionService(db).picked(collection)
        if picked:
            params.slugs, params.order_list = picked
    if menu:
        # A header-menu link can leave some institutes out of the list it opens.
        params.exclude_slugs = await excluded_for(db, menu) or None
    svc = CollegeService(db)
    colleges, meta = await svc.list_colleges(params)
    return ListResponse[CollegeListSchema](data=colleges, meta=meta)


@router.get("/facets", response_model=SuccessResponse[dict])
async def get_facets(db: DbSession):
    """Filter-menu options for the listing, from the directory's own data."""
    return SuccessResponse[dict](data=await CollegeService(db).facets())


@router.get("/slugs", response_model=SuccessResponse[list])
async def get_all_slugs(db: DbSession):
    """Used by Next.js generateStaticParams at build time."""
    svc = CollegeService(db)
    slugs = await svc.get_all_slugs()
    return SuccessResponse[list](data=slugs)


@router.get("/similar", response_model=SuccessResponse[list])
async def get_similar_colleges(
    db: DbSession,
    slug: str = Query(..., description="Slug of the reference college"),
    limit: int = Query(8, ge=1, le=20),
):
    """Return colleges similar to the given slug (same stream first).
    Used by the college detail page peer grid."""
    svc = CollegeService(db)
    similar = await svc.get_similar(slug, limit=limit)
    return SuccessResponse[list](data=similar)


@router.get("/{slug}", response_model=SuccessResponse[CollegeDetailSchema])
async def get_college(slug: str, db: DbSession):
    svc = CollegeService(db)
    # Fire-and-forget view increment (non-critical)
    try:
        await svc.increment_views(slug)
    except Exception:
        pass
    college = await svc.get_college(slug)
    return SuccessResponse[CollegeDetailSchema](data=college)


@router.get("/{slug}/related", response_model=SuccessResponse[list])
async def get_related_colleges(
    slug: str,
    db: DbSession,
    limit: int = Query(3, ge=1, le=10),
):
    svc = CollegeService(db)
    related = await svc.get_related(slug, limit=limit)
    return SuccessResponse[list](data=related)
