import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class TeamMessage(Base):
    """A message the platform team sent to newsletter subscribers: to everyone subscribed, or to chosen addresses."""

    __tablename__ = "team_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    # "all": every subscribed address at the time it was sent; "selected": the addresses the team picked.
    audience = Column(String(20), nullable=False, default="selected")
    also_email = Column(Boolean, nullable=False, default=False, server_default="false")
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sent_by_name = Column(String(200), nullable=False, default="", server_default="")
    recipient_count = Column(Integer, nullable=False, default=0, server_default="0")
    sent_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)


class TeamMessageRecipient(Base):
    """One address a team message went to. With an account it is in their Messages inbox; `emailed` when a copy went by email."""

    __tablename__ = "team_message_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("team_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    email = Column(String(320), nullable=False)
    emailed = Column(Boolean, nullable=False, default=False, server_default="false")
    read_at = Column(DateTime(timezone=True), nullable=True)
    # Hidden from the student's inbox when they delete it; the team still counts it as sent.
    deleted_at = Column(DateTime(timezone=True), nullable=True)
