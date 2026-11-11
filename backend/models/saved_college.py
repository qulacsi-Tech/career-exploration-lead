from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class SavedCollege(Base):
    """A college a signed-in student saved to their profile. One row for each student and college."""

    __tablename__ = "saved_colleges"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
