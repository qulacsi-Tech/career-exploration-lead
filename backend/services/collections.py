from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.exceptions import NotFoundError
from models.collection import Collection
from models.college import College
from models.location import Location
from models.program import Program
from models.ranking import RankingEntry, RankingList
from services.college import _to_list_schema


# The most colleges one homepage band can hold, across all its categories.
MAX_BAND_COLLEGES = 100


class CollectionService:
    """Resolves stored collections into what the site shows.

    Membership is the editor's chosen `collegeSlugs`. Order is the bound ranking
    list when there is one, with the editor's order for colleges the ranking does
    not list. A chosen slug with no college behind it is dropped.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _published(self) -> list[dict[str, Any]]:
        rows = (await self.db.execute(select(Collection))).scalars().all()
        return [r.data for r in rows if r.data.get("isPublished")]

    async def _colleges_for(self, data: dict, limit: Optional[int] = None) -> list:
        slugs: list[str] = data.get("collegeSlugs") or []
        if not slugs:
            return []

        rows = (await self.db.execute(
            select(College).where(College.slug.in_(slugs)).options(selectinload(College.courses))
        )).scalars().unique().all()
        by_slug = {c.slug: c for c in rows}
        chosen = [by_slug[s] for s in slugs if s in by_slug]

        rank: dict[str, int] = {}
        if data.get("rankingListSlug"):
            entries = (await self.db.execute(
                select(RankingEntry.college_slug, RankingEntry.rank)
                .join(RankingList, RankingEntry.ranking_list_id == RankingList.id)
                .where(RankingList.slug == data["rankingListSlug"])
            )).all()
            rank = {slug: position for slug, position in entries}

        ranked = sorted((c for c in chosen if c.slug in rank), key=lambda c: rank[c.slug])
        unranked = [c for c in chosen if c.slug not in rank]
        ordered = [_to_list_schema(c) for c in ranked + unranked]
        return ordered[:limit] if isinstance(limit, int) else ordered

    async def colleges_for(self, data: dict, limit: Optional[int] = None) -> list:
        """Colleges a stored collection resolves to, in display order."""
        return await self._colleges_for(data, limit)

    async def homepage_bands(self) -> list[dict]:
        visible = [
            d for d in await self._published()
            if ((d.get("placements") or {}).get("homepage") or {}).get("isVisible")
        ]
        bands = []
        for data in sorted(visible, key=lambda d: d["placements"]["homepage"]["order"]):
            everything = await self._colleges_for(data, MAX_BAND_COLLEGES)
            limit = data["placements"]["homepage"].get("limit") or 6
            # The page splits the section into a tab per category and slides through each one.
            # Only the first page of every category is sent now; the rest is fetched as the
            # visitor slides (see band_page).
            by_stream: dict[str, list] = {}
            for c in everything:
                by_stream.setdefault(c.stream, []).append(c)
            first_pages = [c for group in by_stream.values() for c in group[:limit]]
            # A band with no colleges is dropped rather than shown as a bare heading.
            if first_pages:
                bands.append({
                    "collection": data,
                    "colleges": first_pages,
                    "limit": limit,
                    "totals": {stream: len(group) for stream, group in by_stream.items()},
                })
        return bands

    async def band_page(self, slug: str, stream: Optional[str], page: int) -> dict:
        """One page of a homepage section's colleges, of one category (or all), page size = the card limit."""
        for data in await self._published():
            placement = (data.get("placements") or {}).get("homepage")
            if data["slug"] != slug or not placement or not placement.get("isVisible"):
                continue
            limit = placement.get("limit") or 6
            rows = await self._colleges_for(data, MAX_BAND_COLLEGES)
            if stream:
                rows = [c for c in rows if c.stream == stream]
            pages = max(1, -(-len(rows) // limit))
            start = (page - 1) * limit
            return {"colleges": rows[start:start + limit], "page": page, "pages": pages, "total": len(rows), "limit": limit}
        raise NotFoundError("Collection")

    async def footer_columns(self) -> list[dict]:
        columns: dict[str, list[dict]] = {}
        for data in await self._published():
            placement = (data.get("placements") or {}).get("footer")
            if not placement:
                continue
            columns.setdefault(placement["column"], []).append({
                "label": data["title"],
                "href": f"/colleges/{data['slug']}",
                "order": placement["order"],
            })
        return [
            {"title": title, "links": sorted(links, key=lambda link: link["order"])}
            for title, links in columns.items()
        ]

    async def published_slugs(self) -> list[str]:
        return [d["slug"] for d in await self._published()]

    async def _overlapping_page(self, scope: dict) -> Optional[str]:
        """A single-filter collection that duplicates a city or programme page points at that page."""
        filters = [v for v in (scope.get("programSlug"), scope.get("locationSlug"),
                               scope.get("examSlug"), scope.get("courseSlug")) if v]
        if len(filters) != 1:
            return None
        location = scope.get("locationSlug")
        if location and (await self.db.execute(select(Location.id).where(Location.slug == location))).scalar_one_or_none():
            return f"/location/{location}"
        program = scope.get("programSlug")
        if program and (await self.db.execute(select(Program.id).where(Program.slug == program))).scalar_one_or_none():
            return f"/{program}/colleges"
        return None

    async def page(self, slug: str) -> dict:
        """Everything the collection page renders, in one payload."""
        published = await self._published()
        data = next((d for d in published if d["slug"] == slug), None)
        if data is None:
            raise NotFoundError("Collection")

        colleges = await self._colleges_for(data)

        related = []
        for other in published:
            if other["id"] == data["id"]:
                continue
            # Same programme, or both without one: the rule carried over from the mock.
            if (other.get("scope") or {}).get("programSlug") != (data.get("scope") or {}).get("programSlug"):
                continue
            related.append({
                "slug": other["slug"],
                "title": other["title"],
                "count": len(await self._colleges_for(other)),
            })

        canonical = (
            (data.get("seo") or {}).get("canonical")
            or await self._overlapping_page(data.get("scope") or {})
            or f"/colleges/{slug}"
        )
        return {"collection": data, "colleges": colleges, "related": related, "canonical": canonical}
