import uuid

from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class HomeField(Base):
    """A field of study shown as a disc in the homepage "Fields" grid.

    The slug is made from the name once and never changes. It is also the link
    target, /<slug>/colleges, so it follows the same rule as the stream pages.
    """

    __tablename__ = "home_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(80), nullable=False)
    # A key from the admin's icon picker (e.g. "briefcase"). The page maps it to a drawing.
    icon = Column(String(30), nullable=False, default="book-open", server_default="book-open")
    tagline = Column(String(120), nullable=False, default="", server_default="")
    badge = Column(String(60), nullable=False, default="", server_default="")
    avg_ctc = Column(String(40), nullable=False, default="", server_default="")
    show_on_home = Column(Boolean, nullable=False, default=True, server_default="true")
    home_order = Column(Integer, nullable=False, default=0, server_default="0")
