import uuid

from sqlalchemy import Boolean, Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class Program(Base):
    __tablename__ = "programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(500), nullable=False)
    university_name = Column(String(500), nullable=False)
    university_slug = Column(String(200), nullable=False, index=True)
    online_duration = Column(String(100), nullable=True)
    online_fees = Column(String(200), nullable=True)
    online_fees_note = Column(String(200), nullable=True)
    on_campus_duration = Column(String(100), nullable=True)
    on_campus_fees = Column(String(200), nullable=True)
    # Off: kept in the admin, hidden from the site.
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    # Card photo: /images/... (shipped) or /api/uploads/... (uploaded in the admin). Empty: the shared set.
    image = Column(String(200), nullable=False, default="", server_default="")
    is_recommended = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
