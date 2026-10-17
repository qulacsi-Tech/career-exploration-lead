import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class Notification(Base):
    """Something a person should know about, in the app. One row per recipient.

    States: unread -> read (seen in the list) -> acknowledged (they pressed Acknowledge, which is
    recorded) -> cleared (hidden from their list). One that `requires_ack` stays pinned until it
    is acknowledged or someone else has dealt with it (`resolved_*`).
    """

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(60), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String(300), nullable=True)
    requires_ack = Column(Boolean, nullable=False, default=False, server_default="false")
    group_key = Column(String(120), nullable=True, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    cleared_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_name = Column(String(200), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
