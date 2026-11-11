import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class PracticeAttempt(Base):
    """One finished sitting of a practice test by a signed-in student, with what it scored.

    Kept on the student's profile (Activity, Practice tests) and, through the lead made for each student and exam,
    shareable with a sponsored college.
    """

    __tablename__ = "practice_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    test_slug = Column(String(200), nullable=False, index=True)
    exam_slug = Column(String(200), nullable=False, index=True)
    # The names as they were when the test was sat, so the history still reads right if the test is renamed.
    test_title = Column(String(200), nullable=False, default="")
    exam_name = Column(String(500), nullable=False, default="")
    score = Column(Float, nullable=False, default=0)
    max_score = Column(Float, nullable=False, default=0)
    correct = Column(Integer, nullable=False, default=0)
    incorrect = Column(Integer, nullable=False, default=0)
    skipped = Column(Integer, nullable=False, default=0)
    accuracy = Column(Float, nullable=False, default=0)
    total_seconds = Column(Integer, nullable=False, default=0)
    # [{"label", "score", "maxScore", "correct", "incorrect", "skipped"}]
    sections = Column(JSONB, nullable=False, default=list, server_default="[]")
    submitted_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
