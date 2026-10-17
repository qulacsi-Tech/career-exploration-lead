import uuid

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class Visitor(Base):
    """One browser. The id is the first-party cookie the site sets once the visitor agrees to analytics."""

    __tablename__ = "visitors"

    id = Column(UUID(as_uuid=True), primary_key=True)
    # Set when the visitor signs in or sends a lead while signed in; earlier activity is back-filled.
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    first_landing_path = Column(String(300), nullable=True)
    first_referrer = Column(String(500), nullable=True)
    utm_source = Column(String(100), nullable=True)
    utm_medium = Column(String(100), nullable=True)
    utm_campaign = Column(String(150), nullable=True)
    device_type = Column(String(20), nullable=True)
    browser = Column(String(30), nullable=True)
    os = Column(String(30), nullable=True)


class VisitSession(Base):
    """One visit: ends after 30 minutes of nothing."""

    __tablename__ = "visit_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True)
    visitor_id = Column(UUID(as_uuid=True), ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    landing_path = Column(String(300), nullable=True)
    referrer = Column(String(500), nullable=True)
    # Where the visit came from, in one word: the utm source, the referring host, or "direct".
    source = Column(String(150), nullable=True, index=True)
    utm_source = Column(String(100), nullable=True)
    utm_medium = Column(String(100), nullable=True)
    utm_campaign = Column(String(150), nullable=True)
    page_count = Column(Integer, nullable=False, default=0, server_default="0")
    event_count = Column(Integer, nullable=False, default=0, server_default="0")


class Event(Base):
    """One thing a visitor did: a page view, a click on a tracked button, a form step."""

    __tablename__ = "events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    visitor_id = Column(UUID(as_uuid=True), ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("visit_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    name = Column(String(60), nullable=False, index=True)
    path = Column(String(300), nullable=True)
    properties = Column(JSONB, nullable=False, default=dict, server_default="{}")
    college_slug = Column(String(200), nullable=True, index=True)
    exam_slug = Column(String(200), nullable=True)
    program_slug = Column(String(200), nullable=True)
