import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class Question(Base):
    """A question or concern a signed-in student sent to a college's page.

    The platform team and the college's own admin both see it. Either can answer; the latest answer stands
    (a platform admin's is shown as "Career Experts", a college admin's as the college). It reaches the college's
    Q&A page only when the platform team has approved it for display (`is_published`).
    """

    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    kind = Column(String(10), nullable=False, default="question", server_default="question")  # question | concern
    body = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    answered_by_role = Column(String(10), nullable=True)  # college | experts
    answered_by_name = Column(String(200), nullable=True)
    answered_at = Column(DateTime(timezone=True), nullable=True)
    is_published = Column(Boolean, nullable=False, default=False, server_default="false", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class QuestionHelpful(Base):
    """One signed-in student's "this was helpful" on a published question. One per student per question."""

    __tablename__ = "question_helpful"

    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
