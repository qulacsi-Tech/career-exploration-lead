import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


# Roles that can use the admin panel. Only a super admin manages other administrators.
ADMIN_ROLES = (UserRole.ADMIN, UserRole.SUPER_ADMIN)


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
    marketing_consent = Column(Boolean, nullable=False, default=False, server_default="false")
    consent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    reviews = relationship("Review", back_populates="user", lazy="select")
