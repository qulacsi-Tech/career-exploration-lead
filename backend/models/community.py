import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class Community(Base):
    """An exam's community: one per exam, started by the first student who asks for it.

    Students join it, post (a discussion, a question, a suggestion, a banner, an achievement), reply and react.
    The platform team can restrict it, which hides it from the site without losing anything.
    """

    __tablename__ = "communities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False, default="", server_default="")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # Restricted by the platform team: hidden from the site; posts and members are kept.
    is_restricted = Column(Boolean, nullable=False, default=False, server_default="false", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CommunityMember(Base):
    __tablename__ = "community_members"

    community_id = Column(UUID(as_uuid=True), ForeignKey("communities.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    joined_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CommunityPost(Base):
    """One post. `kind`: discussion | question | suggestion | banner | achievement. A banner carries an image."""

    __tablename__ = "community_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    community_id = Column(UUID(as_uuid=True), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    kind = Column(String(20), nullable=False, default="discussion", server_default="discussion")
    title = Column(String(200), nullable=False, default="", server_default="")
    body = Column(Text, nullable=False)
    # /api/uploads/... Empty: none.
    image = Column(String(200), nullable=False, default="", server_default="")
    # Hidden by the platform team: gone from the site, kept in the admin with the reason.
    is_hidden = Column(Boolean, nullable=False, default=False, server_default="false", index=True)
    hidden_reason = Column(String(300), nullable=False, default="", server_default="")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)


class CommunityReply(Base):
    __tablename__ = "community_replies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    body = Column(Text, nullable=False)
    is_hidden = Column(Boolean, nullable=False, default=False, server_default="false")
    hidden_reason = Column(String(300), nullable=False, default="", server_default="")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CommunityReaction(Base):
    """One student's reaction to a post: like | love | celebrate | insightful. One per student per post."""

    __tablename__ = "community_reactions"

    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    reaction = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CommunityUserStatus(Base):
    """What the platform team decided about a student in communities.

    Flagged: marked for the team's attention; nothing changes for the student. Blocked: the student can still read
    every community but cannot start one, join, post, reply or react.
    """

    __tablename__ = "community_user_status"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    is_flagged = Column(Boolean, nullable=False, default=False, server_default="false")
    is_blocked = Column(Boolean, nullable=False, default=False, server_default="false")
    note = Column(String(300), nullable=False, default="", server_default="")
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
