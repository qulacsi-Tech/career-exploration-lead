import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class RankingList(Base):
    __tablename__ = "ranking_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    name = Column(String(300), nullable=False)          # "NIRF Management 2026"
    authority = Column(String(200), nullable=False)     # "NIRF"
    year = Column(Integer, nullable=False)
    stream = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    entries = relationship("RankingEntry", back_populates="ranking_list", cascade="all, delete-orphan", order_by="RankingEntry.rank", lazy="select")


class RankingEntry(Base):
    __tablename__ = "ranking_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ranking_list_id = Column(UUID(as_uuid=True), ForeignKey("ranking_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    college_slug = Column(String(200), nullable=False, index=True)
    rank = Column(Integer, nullable=False)
    score = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    ranking_list = relationship("RankingList", back_populates="entries")
