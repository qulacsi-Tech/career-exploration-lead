import uuid

from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class HeroItem(Base):
    """One slide of the homepage hero. Active slides rotate in `position` order."""

    __tablename__ = "hero_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    headline = Column(String(150), nullable=False)
    subheadline = Column(String(300), nullable=False)
    # /images/... (shipped) or /api/uploads/... (uploaded in the admin). Empty: the built-in illustration.
    image = Column(String(200), nullable=False, default="", server_default="")
    image_alt = Column(String(150), nullable=False, default="", server_default="")
    active = Column(Boolean, nullable=False, default=True, server_default="true")
    position = Column(Integer, nullable=False, default=0, server_default="0")
