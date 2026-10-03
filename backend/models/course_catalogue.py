"""Course catalogue — the degree-level programmes (MBA, B.Tech, MBBS etc.).
Separate from the `courses` table which holds individual programmes offered by
a specific college."""

import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from core.database import Base


class CourseCatalogue(Base):
    __tablename__ = "course_catalogue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)          # "MBA"
    full_name = Column(String(500), nullable=False)     # "Master of Business Administration"
    level = Column(String(50), nullable=False)          # UG | PG | Diploma | Doctorate
    stream = Column(String(100), nullable=False, index=True)
    duration = Column(String(100), nullable=False)
    modes = Column(JSONB, nullable=False, default=list)         # ["Full Time", "Online"]
    eligibility = Column(Text, nullable=True)
    average_fees = Column(String(100), nullable=True)
    exams_accepted = Column(JSONB, nullable=False, default=list)
    college_count = Column(Integer, nullable=False, default=0)
    about = Column(Text, nullable=True)
    is_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    specialisations = relationship("Specialisation", back_populates="course", cascade="all, delete-orphan", lazy="select")
