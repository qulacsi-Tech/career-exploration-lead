import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    state = Column(String(200), nullable=False)
    district = Column(String(200), nullable=False, default="", server_default="")
    college_count = Column(Integer, nullable=False, default=0)
    # Homepage carousel card. Edited under Admin > Sections > Homepage > Location.
    description = Column(Text, nullable=False, default="", server_default="")
    avg_package = Column(String(60), nullable=False, default="", server_default="")
    image = Column(String(200), nullable=False, default="", server_default="")
    # Up to three {category, fees} rows shown as tiles on the card.
    course_fees = Column(JSONB, nullable=False, default=list, server_default="[]")
    # Categories the card offers and the colleges listed under each:
    # [{"stream": "Engineering", "colleges": ["college-slug"]}]. Empty: worked out from the city's colleges.
    featured = Column(JSONB, nullable=False, default=list, server_default="[]")
    show_on_home = Column(Boolean, nullable=False, default=True, server_default="true")
    home_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class LocationLabel(Base):
    """A tag shown on homepage location cards. One label can sit on many locations."""

    __tablename__ = "location_labels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    text = Column(String(60), nullable=False, unique=True)
    # Order of the pills on a card.
    position = Column(Integer, nullable=False, default=0, server_default="0")


class LocationLabelLink(Base):
    """Which locations carry which label. Rows go when either side is deleted."""

    __tablename__ = "location_label_links"

    label_id = Column(UUID(as_uuid=True), ForeignKey("location_labels.id", ondelete="CASCADE"), primary_key=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True)
