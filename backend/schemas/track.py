from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class TrackEventSchema(BaseModel):
    name: str
    path: Optional[str] = None
    # Milliseconds since the epoch, from the visitor's clock. Clamped to near "now" on the server.
    ts: Optional[int] = None
    props: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class TrackContextSchema(BaseModel):
    """Where this visit came from. Sent with every batch; only the first one for a visitor or session is kept."""
    landing: Optional[str] = None
    referrer: Optional[str] = None
    utmSource: Optional[str] = None
    utmMedium: Optional[str] = None
    utmCampaign: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class TrackBatchSchema(BaseModel):
    visitorId: str
    sessionId: str
    context: TrackContextSchema = Field(default_factory=TrackContextSchema)
    events: list[TrackEventSchema] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)
