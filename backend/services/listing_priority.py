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


async def resolve_priorities(db, params) -> list[tuple[dict[str, int], bool]]:
    """The priority levels that apply to this request, broadest first: [(slug -> number, is_slot_layer)].

    The default priority, then the priorities of the filters in use (the broadest filter first, the most specific
    last), then the header-menu link's own. Each level reorders what the broader ones produced (see
    `arrange_layers`). The narrowest level keeps its numbers as places in the list; broader ones are compacted.
    Empty when nothing is promoted."""
    keys = scope_keys(params)  # most specific first
    by_scope: dict[str, dict[str, int]] = {}
    if keys:
        rows = (await db.execute(select(ListingPriority.scope, ListingPriority.college_slug, ListingPriority.priority).where(ListingPriority.scope.in_(keys)))).all()
        for scope, slug, n in rows:
            by_scope.setdefault(scope, {})[slug] = n
    default = {slug: n for slug, n in (await db.execute(select(College.slug, College.priority).where(College.priority.is_not(None)))).all()}

    layers: list[tuple[dict[str, int], bool]] = [(default, False)]
    layers += [(by_scope.get(key, {}), False) for key in reversed(keys)]
    menu = dict(params.priority or {})
    layers.append((menu, False))
    # The narrowest level in play keeps its numbers as places: the menu link, else the most specific filter, else the default.
    slot = len(layers) - 1 if params.priority else (len(layers) - 2 if keys else 0)
    layers = [(p, i == slot) for i, (p, _) in enumerate(layers)]
    return layers if any(p for p, _ in layers) else []
