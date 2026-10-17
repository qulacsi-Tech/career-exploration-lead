"""Receives batches of visitor events and keeps them.

Nothing here may break the page that sent it, so bad input is dropped quietly
rather than answered with an error. What is kept is limited on purpose: no IP
address, no form values, and a size cap on every free-text field.
"""

import json
import random
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.tracking import Event, VisitSession, Visitor
from schemas.track import TrackBatchSchema

MAX_EVENTS_PER_BATCH = 50
# The privacy policy promises browsing activity is kept for 13 months at most.
RETENTION = timedelta(days=396)
# Chance that a batch also runs the purge. Busy sites purge often enough; the work itself is one indexed delete.
PURGE_ODDS = 1 / 300
MAX_PROPS_BYTES = 2048
NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,59}$")
BOT_PATTERN = re.compile(r"bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python-requests", re.I)

# Per-visitor flood control. In memory, so it is per worker and resets on restart: it stops a runaway
# script, nothing more.
_RATE_WINDOW_SECONDS = 60
_RATE_MAX_EVENTS = 300
_hits: dict[str, tuple[float, int]] = {}


def _rate_limited(visitor_key: str, count: int) -> bool:
    now = time.monotonic()
    start, used = _hits.get(visitor_key, (now, 0))
    if now - start > _RATE_WINDOW_SECONDS:
        start, used = now, 0
    used += count
    _hits[visitor_key] = (start, used)
    if len(_hits) > 5000:  # keep the table from growing without bound
        for key in [k for k, (s, _) in _hits.items() if now - s > _RATE_WINDOW_SECONDS]:
            _hits.pop(key, None)
    return used > _RATE_MAX_EVENTS


def _uuid(value: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return None


def _clip(value: Optional[str], length: int) -> Optional[str]:
    if not value:
        return None
    value = value.strip()
    return value[:length] if value else None


def _device(ua: str) -> tuple[str, str, str]:
    """Device type, browser and OS from a user agent: coarse on purpose."""
    lower = ua.lower()
    if "ipad" in lower or "tablet" in lower:
        device = "tablet"
    elif "mobi" in lower or "android" in lower or "iphone" in lower:
        device = "mobile"
    else:
        device = "desktop"

    if "edg/" in lower or "edga/" in lower:
        browser = "Edge"
    elif "opr/" in lower or "opera" in lower:
        browser = "Opera"
    elif "firefox" in lower or "fxios" in lower:
        browser = "Firefox"
    elif "chrome" in lower or "crios" in lower:
        browser = "Chrome"
    elif "safari" in lower:
        browser = "Safari"
    else:
        browser = "Other"

    if "windows" in lower:
        os_name = "Windows"
    elif "android" in lower:
        os_name = "Android"
    elif "iphone" in lower or "ipad" in lower or "ios" in lower:
        os_name = "iOS"
    elif "mac os" in lower or "macintosh" in lower:
        os_name = "macOS"
    elif "linux" in lower:
        os_name = "Linux"
    else:
        os_name = "Other"
    return device, browser, os_name


def _source(utm_source: Optional[str], referrer: Optional[str], own_host: Optional[str]) -> str:
    if utm_source:
        return utm_source.lower()[:150]
    if referrer:
        host = (urlparse(referrer).hostname or "").lower().removeprefix("www.")
        if host and host != (own_host or "").lower().removeprefix("www."):
            return host[:150]
    return "direct"


def _slugs_from_path(path: Optional[str]) -> dict[str, Optional[str]]:
    """The college, exam or programme a page is about, read from its address."""
    out: dict[str, Optional[str]] = {"college_slug": None, "exam_slug": None, "program_slug": None}
    if not path:
        return out
    parts = [p for p in path.split("?")[0].split("/") if p]
    if len(parts) >= 2:
        if parts[0] in ("college", "colleges"):
            out["college_slug"] = parts[1][:200]
        elif parts[0] == "exams":
            out["exam_slug"] = parts[1][:200]
        elif parts[0] == "programs":
            out["program_slug"] = parts[1][:200]
    return out


class TrackService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest(
        self,
        batch: TrackBatchSchema,
        user_id: Optional[uuid.UUID],
        user_agent: str,
        own_host: Optional[str],
    ) -> int:
        """Stores what is valid and returns how many events were kept."""
        visitor_id = _uuid(batch.visitorId)
        session_id = _uuid(batch.sessionId)
        if not visitor_id or not session_id or not batch.events:
            return 0
        if BOT_PATTERN.search(user_agent or ""):
            return 0

        events = [e for e in batch.events[:MAX_EVENTS_PER_BATCH] if NAME_PATTERN.match(e.name or "")]
        if not events or _rate_limited(str(visitor_id), len(events)):
            return 0

        now = datetime.now(timezone.utc)
        ctx = batch.context
        device, browser, os_name = _device(user_agent or "")

        visitor = await self.db.get(Visitor, visitor_id)
        if visitor is None:
            visitor = Visitor(
                id=visitor_id,
                user_id=user_id,
                first_seen_at=now,
                last_seen_at=now,
                first_landing_path=_clip(ctx.landing, 300),
                first_referrer=_clip(ctx.referrer, 500),
                utm_source=_clip(ctx.utmSource, 100),
                utm_medium=_clip(ctx.utmMedium, 100),
                utm_campaign=_clip(ctx.utmCampaign, 150),
                device_type=device,
                browser=browser,
                os=os_name,
            )
            self.db.add(visitor)
            await self.db.flush()
        else:
            visitor.last_seen_at = now
            if user_id and visitor.user_id != user_id:
                # The visitor has just identified themselves: everything they did before is theirs.
                visitor.user_id = user_id
                await self.db.execute(
                    update(Event).where(Event.visitor_id == visitor_id, Event.user_id.is_(None)).values(user_id=user_id)
                )
                await self.db.execute(
                    update(VisitSession)
                    .where(VisitSession.visitor_id == visitor_id, VisitSession.user_id.is_(None))
                    .values(user_id=user_id)
                )

        session = await self.db.get(VisitSession, session_id)
        if session is None:
            session = VisitSession(
                id=session_id,
                visitor_id=visitor_id,
                user_id=user_id or visitor.user_id,
                started_at=now,
                last_seen_at=now,
                landing_path=_clip(ctx.landing, 300),
                referrer=_clip(ctx.referrer, 500),
                source=_source(ctx.utmSource, ctx.referrer, own_host),
                utm_source=_clip(ctx.utmSource, 100),
                utm_medium=_clip(ctx.utmMedium, 100),
                utm_campaign=_clip(ctx.utmCampaign, 150),
                page_count=0,
                event_count=0,
            )
            self.db.add(session)
            await self.db.flush()
        elif session.visitor_id != visitor_id:
            return 0  # a session id belongs to one visitor; do not let another write into it

        session.last_seen_at = now
        if user_id and not session.user_id:
            session.user_id = user_id

        kept = 0
        for item in events:
            props = item.props if isinstance(item.props, dict) else {}
            if len(json.dumps(props, default=str)) > MAX_PROPS_BYTES:
                props = {}
            occurred = now
            if item.ts:
                try:
                    claimed = datetime.fromtimestamp(item.ts / 1000, tz=timezone.utc)
                    if now - timedelta(hours=24) <= claimed <= now + timedelta(minutes=5):
                        occurred = claimed
                except (OverflowError, OSError, ValueError):
                    pass

            path = _clip(item.path, 300)
            self.db.add(
                Event(
                    visitor_id=visitor_id,
                    session_id=session_id,
                    user_id=user_id or visitor.user_id,
                    occurred_at=occurred,
                    name=item.name,
                    path=path,
                    properties=props,
                    **_slugs_from_path(path),
                )
            )
            kept += 1
            if item.name == "page_view":
                session.page_count = (session.page_count or 0) + 1
        session.event_count = (session.event_count or 0) + kept
        await self.db.commit()
        if random.random() < PURGE_ODDS:
            await self.purge_old()
        return kept

    async def purge_old(self) -> None:
        """Deletes activity older than the retention period, and visitors and visits left with none."""
        cutoff = datetime.now(timezone.utc) - RETENTION
        await self.db.execute(delete(Event).where(Event.occurred_at < cutoff))
        await self.db.execute(delete(VisitSession).where(VisitSession.last_seen_at < cutoff))
        await self.db.execute(delete(Visitor).where(Visitor.last_seen_at < cutoff))
        await self.db.commit()
