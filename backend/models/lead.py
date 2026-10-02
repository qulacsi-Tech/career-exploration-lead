import uuid
import enum

from sqlalchemy import Column, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID

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
