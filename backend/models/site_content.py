from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB

from core.database import Base


class SiteContent(Base):
    """A named block of editable site content, such as the homepage careers panels.

    `key` is the block's name (for example "home.careerPanels"). `data` is the
    block's value, validated by the admin endpoint that writes it.
    """

    __tablename__ = "site_content"

    key = Column(String(100), primary_key=True)
    data = Column(JSONB, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
