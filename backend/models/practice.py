import uuid

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class PracticeItem(Base):
    """One piece of practice content: a test, a question, or a stimulus.

    `kind` is "test", "question" or "stimulus". `key` is the test slug, the
    question id or the stimulus id. `data` is the whole record. Correct answers
    and solutions live in `data` for questions, and never leave the server
    except in a submitted attempt's result.
    """

    __tablename__ = "practice_items"
    __table_args__ = (UniqueConstraint("kind", "key", name="uq_practice_items_kind_key"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind = Column(String(20), nullable=False, index=True)
    key = Column(String(200), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    data = Column(JSONB, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
