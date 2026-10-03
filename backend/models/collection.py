import uuid

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from core.database import Base


class Collection(Base):
    """A curated group of colleges. `data` holds the whole collection: scope,
    chosen college slugs, ranking binding, placements, SEO and publish state."""

    __tablename__ = "collections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    data = Column(JSONB, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
