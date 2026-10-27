from typing import Any, Optional
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.exceptions import NotFoundError
from models.collection import Collection
from models.college import College
from models.ranking import RankingEntry, RankingList
from repositories.college import CollegeRepository
from schemas.college import CollegeFilterParams
from services.college import _to_list_schema


# The most colleges one homepage band can hold, across all its categories.
MAX_BAND_COLLEGES = 100

# The listing filters a collection can preset, named as the colleges listing names them.
FILTER_KEYS = ("stream", "course", "specialisation", "city", "ownership", "level", "credential", "mode", "exam", "approval")


def normalise(data: dict) -> dict:
    """A stored collection with every field the site reads present.

    Collections saved before filters existed hold only their chosen colleges, so they read as
    hand-picked ones with no filters. `href` is the listing page the collection opens.
    """
    out = dict(data)
    out["membership"] = data.get("membership") or ("picked" if data.get("collegeSlugs") else "filters")
    out["filters"] = {k: v for k, v in (data.get("filters") or {}).items() if k in FILTER_KEYS and v}
    out["collegeSlugs"] = data.get("collegeSlugs") or []
    out["rankingListSlug"] = data.get("rankingListSlug") or ""
    out["author"] = {"name": "", "role": "", "photo": "", **(data.get("author") or {})}
    out["href"] = collection_href(out)
    return out


def collection_href(data: dict) -> str:
    """The colleges listing with this collection's filters preset. `collection` carries its header and SEO."""
    query: dict[str, str] = {}
    if (data.get("membership") or "filters") == "filters":
        query.update({k: v for k, v in (data.get("filters") or {}).items() if k in FILTER_KEYS and v})
        if data.get("rankingListSlug"):
            query["ranking_list"] = data["rankingListSlug"]
    query["collection"] = data["slug"]
    return "/colleges?" + urlencode(query)


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
        return [normalise(r.data) for r in rows if r.data.get("isPublished")]

    async def _by_filters(self, data: dict, limit: Optional[int]) -> list:
        """The colleges a filter collection matches, in the listing's popularity order."""
        filters = data.get("filters") or {}
        if not filters and not data.get("rankingListSlug"):
            return []  # no filter would mean every college
        params = CollegeFilterParams(page=1, limit=limit or 500, ranking_list=data.get("rankingListSlug") or None, **filters)
        rows, _ = await CollegeRepository(self.db).list(params)
        return [_to_list_schema(c) for c in rows]

    async def _colleges_for(self, data: dict, limit: Optional[int] = None) -> list:
        if data.get("membership") == "filters":
            return await self._by_filters(data, limit)
        slugs: list[str] = data.get("collegeSlugs") or []
        if not slugs:
            return []

        rows = (await self.db.execute(
            select(College).where(College.slug.in_(slugs), College.status == "published").options(selectinload(College.courses))
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
        return await self._colleges_for(normalise(data), limit)

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
                "href": data["href"],
                "order": placement["order"],
            })
        return [
            {"title": title, "links": sorted(links, key=lambda link: link["order"])}
            for title, links in columns.items()
        ]

    async def published_slugs(self) -> list[str]:
        return [d["slug"] for d in await self._published()]

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
            # Same category, or both without one.
            if (other.get("filters") or {}).get("stream") != (data.get("filters") or {}).get("stream"):
                continue
            related.append({
                "slug": other["slug"],
                "title": other["title"],
                "href": other["href"],
                "count": len(await self._colleges_for(other)),
            })

        canonical = (data.get("seo") or {}).get("canonical") or data["href"]
        return {"collection": data, "colleges": colleges, "related": related, "canonical": canonical}

    async def meta(self, slug: str) -> dict:
        """What the listing page needs to dress itself as this collection: its header, SEO and how it is filtered."""
        data = next((d for d in await self._published() if d["slug"] == slug), None)
        if data is None:
            raise NotFoundError("Collection")
        return {
            "slug": data["slug"],
            "title": data["title"],
            "heading": data.get("heading") or "",
            "subheading": data.get("subheading") or "",
            "author": data["author"],
            "membership": data["membership"],
            "filters": data["filters"],
            "rankingListSlug": data["rankingListSlug"],
            "href": data["href"],
            "seo": data.get("seo") or {},
        }

    async def picked(self, slug: str) -> Optional[tuple[list[str], Optional[str]]]:
        """For a published hand-picked collection: its colleges in order, and the ranking list that orders them."""
        data = next((d for d in await self._published() if d["slug"] == slug), None)
        if data is None or data["membership"] != "picked":
            return None
        return data["collegeSlugs"], data["rankingListSlug"] or None

    async def links(self) -> list[dict]:
        """Every published collection: name and the address it opens."""
        return sorted(
            ({"slug": d["slug"], "title": d["title"], "href": d["href"]} for d in await self._published()),
            key=lambda link: link["title"].lower(),
        )
