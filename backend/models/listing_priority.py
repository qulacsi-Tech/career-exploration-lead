import uuid

from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class ListingPriority(Base):
    """A college's priority within one filter of the listing, e.g. `stream=Engineering` or `city=Pune`.

    The number is the place the college is promoted to in that filter's list (see services/priority_slots.py).
    Several colleges may hold the same number.
    """

    __tablename__ = "listing_priorities"
    __table_args__ = (UniqueConstraint("scope", "college_slug", name="uq_listing_priority_scope_college"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(String(300), nullable=False, index=True)
    college_slug = Column(String(200), nullable=False, index=True)
    priority = Column(Integer, nullable=False)
