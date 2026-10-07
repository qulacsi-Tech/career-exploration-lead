import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class ExamLevel(str, enum.Enum):
    NATIONAL = "National"
    STATE = "State"


class Exam(Base):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(500), nullable=False)
    conducting_body = Column(String(200), nullable=False)
    level = Column(Enum(ExamLevel, values_callable=lambda e: [m.value for m in e]), nullable=False, index=True)
    description = Column(Text, nullable=False)
    registration_closes = Column(String(50), nullable=True)
    exam_date = Column(String(50), nullable=True)
    stream = Column(String(100), nullable=True, index=True)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    # Extended detail fields
    mode = Column(String(50), nullable=True)           # Online | Offline | Hybrid
    frequency = Column(String(100), nullable=True)     # e.g. "Once a year"
    application_fee = Column(String(100), nullable=True)
    official_site = Column(String(300), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    sections = Column(JSONB, nullable=True)            # ["VARC", "DILR", "QA"]
    # Detail page content, written in the admin. Empty: the page leaves the section out.
    eligibility = Column(Text, nullable=False, default="", server_default="")
    syllabus = Column(Text, nullable=False, default="", server_default="")
    faqs = Column(JSONB, nullable=False, default=list, server_default="[]")  # [{"question", "answer"}]
    # Card photo: /images/... (shipped) or /api/uploads/... (uploaded in the admin).
    image = Column(String(200), nullable=False, default="", server_default="")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
