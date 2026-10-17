from typing import Annotated, Optional

from fastapi import APIRouter, Header
from fastapi.responses import Response

from core.dependencies import DbSession, OptionalUserId
from schemas.track import TrackBatchSchema
from services.track import TrackService

router = APIRouter(tags=["track"])


@router.post("/track", status_code=204)
async def track(
    batch: TrackBatchSchema,
    db: DbSession,
    user_id: OptionalUserId,
    user_agent: Annotated[Optional[str], Header()] = None,
    x_site_host: Annotated[Optional[str], Header()] = None,
):
    """
    Collects a batch of visitor events. Always answers 204: a tracking problem must never show on the page.

    Called by the site's own server (app/collect), not by the browser, so the student's session
    cookie can be turned into a Bearer token there and the activity tied to the account.
    """
    try:
        await TrackService(db).ingest(batch, user_id, user_agent or "", x_site_host)
    except Exception:  # noqa: BLE001 - see docstring
        import logging

        logging.getLogger(__name__).exception("tracking batch failed")
    return Response(status_code=204)
