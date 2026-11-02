import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(
        UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    author_name = Column(String(200), nullable=False)
    course = Column(String(200), nullable=False)
    batch = Column(String(50), nullable=False)
    verified = Column(Boolean, nullable=False, default=False)
    review_date = Column(Date, nullable=False)
    rating = Column(Float, nullable=False)
    body = Column(Text, nullable=False)
    rating_placements = Column(Float, nullable=True)
    rating_faculty = Column(Float, nullable=True)
    rating_infrastructure = Column(Float, nullable=True)
    rating_campus_life = Column(Float, nullable=True)
    is_approved = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    college = relationship("College", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


class ReviewVote(Base):
    """One signed-in student's like (1) or dislike (-1) of a review. One vote per student per review."""

    __tablename__ = "review_votes"

    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    vote = Column(SmallInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
