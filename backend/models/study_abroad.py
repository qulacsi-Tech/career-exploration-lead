import uuid

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class StudyAbroadItem(Base):
    """One piece of study-abroad page content.

    `kind` is one of: destination, step, test, faq, meta. `key` identifies the
    row within its kind (a country slug, a step title, a test name, a question,
    or "figures_reviewed"). `data` holds the fields the page renders.
    """

    __tablename__ = "study_abroad_items"
    __table_args__ = (UniqueConstraint("kind", "key", name="uq_study_abroad_kind_key"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind = Column(String(30), nullable=False, index=True)
    key = Column(String(300), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    data = Column(JSONB, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
