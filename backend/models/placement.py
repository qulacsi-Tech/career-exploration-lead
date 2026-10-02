import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from core.database import Base


class Placement(Base):
    __tablename__ = "placements"
    __table_args__ = (UniqueConstraint("college_id", "year", name="uq_placement_college_year"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(
        UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year = Column(Integer, nullable=False)
    average_package = Column(String(50), nullable=True)
    median_package = Column(String(50), nullable=True)
    highest_package = Column(String(50), nullable=True)
    top_recruiters = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    college = relationship("College", back_populates="placements")
