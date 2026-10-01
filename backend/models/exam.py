import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

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
    level = Column(Enum(ExamLevel), nullable=False, index=True)
    description = Column(Text, nullable=False)
    registration_closes = Column(String(50), nullable=True)
    exam_date = Column(String(50), nullable=True)
    stream = Column(String(100), nullable=True, index=True)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
