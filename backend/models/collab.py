import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from core.database import Base


class ChangeRequest(Base):
    """A college admin's proposed edit (or deletion), waiting for the platform team.

    Nothing reaches the live college until an Admin or Super Admin approves it.
    """

    __tablename__ = "change_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requested_by_name = Column(String(200), nullable=False)
    kind = Column(String(10), nullable=False)
    payload = Column(JSONB, nullable=True)
    note = Column(Text, nullable=True)
    base_updated_at = Column(String(40), nullable=True)
    status = Column(String(12), nullable=False, default="pending", server_default="pending")
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by_name = Column(String(200), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    decided_at = Column(DateTime(timezone=True), nullable=True)


class MessageThread(Base):
    """A conversation between a college admin and the platform team."""

    __tablename__ = "message_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    change_request_id = Column(UUID(as_uuid=True), ForeignKey("change_requests.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(200), nullable=False)
    status = Column(String(10), nullable=False, default="open", server_default="open")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_by_name = Column(String(200), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    messages = relationship("ThreadMessage", back_populates="thread", order_by="ThreadMessage.created_at", cascade="all, delete-orphan")


class ThreadMessage(Base):
    __tablename__ = "thread_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_name = Column(String(200), nullable=False)
    side = Column(String(10), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    thread = relationship("MessageThread", back_populates="messages")
