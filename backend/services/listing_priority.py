"""Which priorities apply to a listing request, put together from every place the admin can set them.

From strongest to weakest: the header-menu link the visitor came through, the priorities set for the filters in
use (most specific filter first), and last the college's own default priority.
"""

from sqlalchemy import select

from models.college import College
from models.listing_priority import ListingPriority
from services.priority_slots import scope_keys

# What each filter's value means when the admin picks a scope, as the listing's own filter parameters.
FILTER_PARAMS = {
    "ranking_list": "ranking_list", "specialisation": "specialisation", "course": "course", "city": "city", "state": "state",
    "stream": "stream", "credential": "credential", "level": "level", "mode": "mode", "ownership": "ownership",
    "exam": "exam", "approval": "approval",
}


def params_of_scope(scope: str) -> dict:
    """`city=Pune` -> {"city": "Pune"}; `fees=5-10` -> {"fees_min": 5, "fees_max": 10}. Empty when not understood."""
    name, _, value = scope.partition("=")
    if name == "fees":
        lo, _, hi = value.partition("-")
        out: dict = {}
        if lo.strip().isdigit():
            out["fees_min"] = int(lo)
        if hi.strip().isdigit():
            out["fees_max"] = int(hi)
        return out
    if name in FILTER_PARAMS and value:
        return {FILTER_PARAMS[name]: value}
    return {}


async def resolve_priorities(db, params) -> dict[str, int]:
    """slug -> the place that college is promoted to for this request. Empty when nothing is promoted."""
    merged: dict[str, int] = {}

    # 1. The header-menu link's own priorities.
    for slug, n in (params.priority or {}).items():
        merged.setdefault(slug, n)

    # 2. The priorities set for the filters in use, the most specific filter first.
    keys = scope_keys(params)
    if keys:
        rows = (await db.execute(select(ListingPriority.scope, ListingPriority.college_slug, ListingPriority.priority).where(ListingPriority.scope.in_(keys)))).all()
        by_scope: dict[str, dict[str, int]] = {}
        for scope, slug, n in rows:
            by_scope.setdefault(scope, {})[slug] = n
        for key in keys:
            for slug, n in by_scope.get(key, {}).items():
                merged.setdefault(slug, n)

    # 3. The college's default priority.
    for slug, n in (await db.execute(select(College.slug, College.priority).where(College.priority.is_not(None)))).all():
        merged.setdefault(slug, n)
    return merged
