import uuid

from sqlalchemy import Boolean, Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class Recruiter(Base):
    """A company that recruits from colleges: one shared entry however many colleges list it.

    A college's placement record keeps the company's name; this table is where that name has a logo, and what
    the admin's recruiter picker searches. The name is unique ignoring case and spacing, so "deloitte" and
    "Deloitte " are one company.
    """

    __tablename__ = "recruiters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    # The name in lower case with its spaces squeezed: what makes two spellings the same company.
    name_key = Column(String(120), nullable=False, unique=True, index=True)
    # /api/uploads/... Empty: no logo, the name is shown.
    logo = Column(String(200), nullable=False, default="", server_default="")
    # Superseded by display_mode, kept so the migration history still holds.
    show_name = Column(Boolean, nullable=False, default=True, server_default="true")
    # With a logo: "logo" (alone, the default), "name" (the name only) or "both". Without one the name is shown.
    display_mode = Column(String(10), nullable=False, default="logo", server_default="logo")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
