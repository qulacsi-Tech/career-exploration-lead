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


# A college is public only when published. A draft is waiting for review; an archived college is hidden but kept.
COLLEGE_STATUSES = ("draft", "published", "archived")


class College(Base):
    __tablename__ = "colleges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(500), nullable=False)
    city = Column(String(200), nullable=False, index=True)
    state = Column(String(200), nullable=False, index=True)
    ownership = Column(Enum(OwnershipType, values_callable=lambda e: [m.value for m in e]), nullable=False, index=True)
    stream = Column(String(100), nullable=False, index=True)  # the first of `streams`
    streams = Column(JSONB, nullable=False, default=list, server_default="[]")  # every category it is listed under
    # "College" or "University": what kind of institution this listing is.
    institution_type = Column(String(20), nullable=False, default="College", server_default="College")
    ranking_authority = Column(String(100), nullable=True)
    ranking_rank = Column(Integer, nullable=True)
    # Default priority: 1 is shown first. Empty: after the colleges that have one, by NIRF rank.
    priority = Column(Integer, nullable=True, index=True)
    rating = Column(Float, nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)
    courses_offered = Column(Integer, nullable=False, default=0)
    fees_range = Column(String(100), nullable=True)
    exams_accepted = Column(JSONB, nullable=False, default=list)
    tags = Column(JSONB, nullable=False, default=list)
    approvals = Column(JSONB, nullable=False, default=list)
    established = Column(Integer, nullable=True)
    about = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="published", server_default="published", index=True)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    view_count = Column(Integer, nullable=False, default=0)
    # Card and hero photo: /images/... (shipped) or /api/uploads/... (uploaded in the admin).
    image = Column(String(200), nullable=False, default="", server_default="")
    # The editor-written parts of the college page (see schemas/college_detail.py).
    detail = Column(JSONB, nullable=False, default=dict, server_default="{}")
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
