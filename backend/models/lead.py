import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class LeadType(str, enum.Enum):
    CALLBACK = "callback"
    COUNSELLING = "counselling"
    BROCHURE = "brochure"
    ENQUIRY = "enquiry"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    CLOSED = "closed"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(320), nullable=True)
    college_slug = Column(String(200), nullable=True, index=True)
    type = Column(Enum(LeadType, values_callable=lambda e: [m.value for m in e]), nullable=False, index=True)
    status = Column(Enum(LeadStatus, values_callable=lambda e: [m.value for m in e]), nullable=False, default=LeadStatus.NEW)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    # Who sent it, when they were signed in. Null for an anonymous visitor.
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # What they typed and where on the site they were.
    stream = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    message = Column(Text, nullable=True)
    program_name = Column(String(200), nullable=True)
    source = Column(String(60), nullable=True)
    source_url = Column(String(500), nullable=True)
    consent = Column(Boolean, nullable=False, default=False, server_default="false")
    consent_at = Column(DateTime(timezone=True), nullable=True)
    # How many times the same visitor asked the same thing again after the first.
    repeat_count = Column(Integer, nullable=False, default=0, server_default="0")

    replies = relationship("LeadReply", back_populates="lead", order_by="LeadReply.created_at", cascade="all, delete-orphan")


class LeadReply(Base):
    """A message from the team to the person who sent a lead."""

    __tablename__ = "lead_replies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    author_name = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    lead = relationship("Lead", back_populates="replies")
