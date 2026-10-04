import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class Specialisation(Base):
    __tablename__ = "specialisations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("course_catalogue.id", ondelete="CASCADE"), nullable=False, index=True)
    course_slug = Column(String(200), nullable=False, index=True)
    course_name = Column(String(200), nullable=False)
    stream = Column(String(100), nullable=False, index=True)
    duration = Column(String(100), nullable=True)
    average_fees = Column(String(100), nullable=True)
    college_count = Column(Integer, nullable=False, default=0)
    about = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    course = relationship("CourseCatalogue", back_populates="specialisations")
