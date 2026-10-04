"""add course_catalogue and specialisations tables

Revision ID: 004
Revises: 003
Create Date: 2026-10-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "course_catalogue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("full_name", sa.String(500), nullable=False),
        sa.Column("level", sa.String(50), nullable=False),
        sa.Column("stream", sa.String(100), nullable=False),
        sa.Column("duration", sa.String(100), nullable=False),
        sa.Column("modes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("eligibility", sa.Text(), nullable=True),
        sa.Column("average_fees", sa.String(100), nullable=True),
        sa.Column("exams_accepted", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("college_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_course_catalogue_slug", "course_catalogue", ["slug"], unique=True)
    op.create_index("idx_course_catalogue_stream", "course_catalogue", ["stream"])

    op.create_table(
        "specialisations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("course_catalogue.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_slug", sa.String(200), nullable=False),
        sa.Column("course_name", sa.String(200), nullable=False),
        sa.Column("stream", sa.String(100), nullable=False),
        sa.Column("duration", sa.String(100), nullable=True),
        sa.Column("average_fees", sa.String(100), nullable=True),
        sa.Column("college_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_specialisations_slug", "specialisations", ["slug"], unique=True)
    op.create_index("idx_specialisations_course_id", "specialisations", ["course_id"])
    op.create_index("idx_specialisations_course_slug", "specialisations", ["course_slug"])


def downgrade() -> None:
    op.drop_table("specialisations")
    op.drop_table("course_catalogue")
