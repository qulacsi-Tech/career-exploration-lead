import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    title = Column(String(500), nullable=False)
    excerpt = Column(Text, nullable=False)
    body = Column(Text, nullable=True)
    published_at = Column(Date, nullable=False, index=True)
    is_published = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
