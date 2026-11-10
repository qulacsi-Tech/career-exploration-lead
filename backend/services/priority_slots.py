"""Priority as a place in the list, for promoted colleges.

A priority number is a position. Priority 1 is the first place, 2 the second, and so on. Several colleges may
share a number: on every visit one of them (chosen at random) takes that place, and the others follow straight
after, ahead of the colleges with no priority. A priority never pushes a college lower than the list allows: a
college with priority 9 is in ninth place only if eight others fill the places before it; in a shorter list it
simply comes last.

The order colleges would have without any priority (by rank, reviews and so on) is what fills every other place.
"""

import random
from collections import deque
from typing import Optional

# The order the listing's filters are looked at when more than one is on. A priority set for a more specific
# filter wins over one set for a broader filter, and the default priority is the last resort.
SCOPE_PRECEDENCE = ("ranking_list", "specialisation", "course", "city", "state", "stream", "credential", "level", "mode", "ownership", "exam", "approval", "fees")


def arrange(order: list[str], priority: dict[str, int], seed: Optional[int] = None) -> list[str]:
    """`order` is every college in the list (slugs) in the order they have with no priority; `priority` is slug -> place.

    The same seed gives the same arrangement, so the pages of one visit hold together; a new seed shuffles who takes
    a place that several colleges share.
    """
    rng = random.Random(seed)
    present = set(order)
    groups: dict[int, list[str]] = {}
    for slug in order:  # in the colleges' own order, so a seeded shuffle is repeatable
        n = priority.get(slug)
        if n is not None and slug in present:
            groups.setdefault(int(n), []).append(slug)
    if not groups:
        return list(order)

    promoted = {slug for members in groups.values() for slug in members}
    rest = deque(slug for slug in order if slug not in promoted)
    leftover: list[str] = []  # colleges that shared a place and did not take it: they come next
    out: list[str] = []

    def filler() -> Optional[str]:
        if leftover:
            return leftover.pop(0)
        return rest.popleft() if rest else None

    for place in sorted(groups):
        members = groups[place][:]
        rng.shuffle(members)
        winner, losers = members[0], members[1:]
        # Fill the places before this one; if there are not enough colleges, it takes the next free place.
        while len(out) < place - 1:
            nxt = filler()
            if nxt is None:
                break
            out.append(nxt)
        out.append(winner)
        # The ones that shared the place and did not take it come next, ahead of the colleges with no priority.
        leftover.extend(losers)

    out.extend(leftover)
    out.extend(rest)
    return out


def compact(order: list[str], priority: dict[str, int], seed: Optional[int] = None) -> list[str]:
    """Put the colleges that have a priority first, in priority order, with no gaps: priorities 3, 7 and 20 among
    the colleges of this list become first, second and third. Colleges sharing a number are shuffled among
    themselves. Everyone else follows in the order they already had."""
    rng = random.Random(seed)
    groups: dict[int, list[str]] = {}
    for slug in order:
        n = priority.get(slug)
        if n is not None:
            groups.setdefault(int(n), []).append(slug)
    if not groups:
        return list(order)
    out: list[str] = []
    for n in sorted(groups):
        members = groups[n][:]
        rng.shuffle(members)
        out.extend(members)
    promoted = set(out)
    return out + [slug for slug in order if slug not in promoted]


def arrange_layers(order: list[str], layers: list[tuple[dict[str, int], bool]], seed: Optional[int] = None) -> list[str]:
    """Apply the priorities of every level, from the broadest to the most specific.

    `layers` is [(slug -> number, is_slot_layer)], broadest first (the default priority, then the filters in use, then
    a header-menu link). Each level reorders what the broader ones produced, so the order of a parent level (say the
    category) is kept inside a narrower list (the same category in one city), and the numbers set for the narrower
    level come first. The narrowest level keeps its numbers as places in the list (`arrange`); a broader level is
    compacted (`compact`), because most of its colleges are not in the narrower list.
    """
    out = list(order)
    for i, (priority, is_slot) in enumerate(layers):
        if not priority:
            continue
        layer_seed = None if seed is None else seed + i
        out = arrange(out, priority, layer_seed) if is_slot else compact(out, priority, layer_seed)
    return out


def scope_keys(params) -> list[str]:
    """The scopes (`<filter>=<value>`) a listing request falls under, most specific first."""
    keys: list[str] = []
    for name in SCOPE_PRECEDENCE:
        if name == "fees":
            lo, hi = getattr(params, "fees_min", None), getattr(params, "fees_max", None)
            if lo is not None or hi is not None:
                keys.append(f"fees={'' if lo is None else lo}-{'' if hi is None else hi}")
            continue
        value = getattr(params, name, None)
        if value:
            keys.append(f"{name}={value}")
    return keys
