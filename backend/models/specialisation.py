import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from core.database import Base


class Specialisation(Base):
    """A branch such as Finance or Mechanical. A list of its own; the course link is optional and only
    decides which public course page lists it."""

    __tablename__ = "specialisations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("course_catalogue.id", ondelete="CASCADE"), nullable=True, index=True)
    course_slug = Column(String(200), nullable=True, index=True)
    course_name = Column(String(200), nullable=True)
    stream = Column(String(100), nullable=True, index=True)
    # Slugs of every course it sits under. course_id/course_slug above are the first, which is the
    # one the public course page lists it on.
    course_slugs = Column(JSONB, nullable=False, default=list)
    delivery = Column(String(10), nullable=False, default="offline", server_default="offline")  # offline | online | both
    duration = Column(String(100), nullable=True)
    average_fees = Column(String(100), nullable=True)
    college_count = Column(Integer, nullable=False, default=0)
    about = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    course = relationship("CourseCatalogue", back_populates="specialisations")
