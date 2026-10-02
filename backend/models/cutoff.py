import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class Cutoff(Base):
    __tablename__ = "cutoffs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(
        UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exam = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    score = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    college = relationship("College", back_populates="cutoffs")
