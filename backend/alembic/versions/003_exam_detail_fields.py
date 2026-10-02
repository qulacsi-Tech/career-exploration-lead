"""add detail fields to exams

Revision ID: 003
Revises: 002
Create Date: 2026-10-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("mode", sa.String(50), nullable=True))
    op.add_column("exams", sa.Column("frequency", sa.String(100), nullable=True))
    op.add_column("exams", sa.Column("application_fee", sa.String(100), nullable=True))
    op.add_column("exams", sa.Column("official_site", sa.String(300), nullable=True))
    op.add_column("exams", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.add_column(
        "exams",
        sa.Column(
            "sections",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("exams", "sections")
    op.drop_column("exams", "duration_minutes")
    op.drop_column("exams", "official_site")
    op.drop_column("exams", "application_fee")
    op.drop_column("exams", "frequency")
    op.drop_column("exams", "mode")
