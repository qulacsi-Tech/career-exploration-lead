import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    COLLEGE_ADMIN = "COLLEGE_ADMIN"


# The platform team: Admin and Super Admin. Only a super admin manages other administrators.
ADMIN_ROLES = (UserRole.ADMIN, UserRole.SUPER_ADMIN)
# Everyone who can open the admin panel. A college admin sees only their own college there.
PANEL_ROLES = (*ADMIN_ROLES, UserRole.COLLEGE_ADMIN)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    email = Column(String(320), nullable=False, unique=True, index=True)
    password_hash = Column(String(72), nullable=True)  # null for a Google-only account
    role = Column(Enum(UserRole, values_callable=lambda e: [m.value for m in e]), nullable=False, default=UserRole.USER)
    phone = Column(String(20), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    auth_provider = Column(String(20), nullable=False, default="password", server_default="password")
    google_sub = Column(String(64), nullable=True, unique=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    preferred_stream = Column(String(100), nullable=True)
    target_exam = Column(String(100), nullable=True)
    # The one college a COLLEGE_ADMIN looks after. Null for everyone else.
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True, index=True)
    # Set when a platform admin gives out a temporary password; cleared when the person chooses their own.
    must_change_password = Column(Boolean, nullable=False, default=False, server_default="false")
    marketing_consent = Column(Boolean, nullable=False, default=False, server_default="false")
    consent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    reviews = relationship("Review", back_populates="user", lazy="select")
