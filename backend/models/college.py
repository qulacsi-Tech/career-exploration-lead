import uuid
import enum

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, Integer, String, Text, func
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from core.database import Base


class OwnershipType(str, enum.Enum):
    PRIVATE = "Private"
    GOVERNMENT = "Government"
    DEEMED = "Deemed"


class College(Base):
    __tablename__ = "colleges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(500), nullable=False)
    city = Column(String(200), nullable=False, index=True)
    state = Column(String(200), nullable=False, index=True)
    ownership = Column(Enum(OwnershipType), nullable=False, index=True)
    stream = Column(String(100), nullable=False, index=True)
    ranking_authority = Column(String(100), nullable=True)
    ranking_rank = Column(Integer, nullable=True)
    rating = Column(Float, nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)
    courses_offered = Column(Integer, nullable=False, default=0)
    fees_range = Column(String(100), nullable=True)
    exams_accepted = Column(JSONB, nullable=False, default=list)
    tags = Column(JSONB, nullable=False, default=list)
    approvals = Column(JSONB, nullable=False, default=list)
    established = Column(Integer, nullable=True)
    about = Column(Text, nullable=True)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    view_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    courses = relationship(
        "Course", back_populates="college", cascade="all, delete-orphan", lazy="select"
    )
    placements = relationship(
        "Placement", back_populates="college", cascade="all, delete-orphan", lazy="select"
    )
    cutoffs = relationship(
        "Cutoff", back_populates="college", cascade="all, delete-orphan", lazy="select"
    )
    reviews = relationship(
        "Review", back_populates="college", cascade="all, delete-orphan", lazy="select"
    )
