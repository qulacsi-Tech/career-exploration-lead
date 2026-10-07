"""exam detail page content: eligibility, syllabus and FAQs

Written in the admin and shown on the exam's page. Existing exams start empty and the
page leaves those sections out until they are filled in.

Revision ID: 018
Revises: 017
Create Date: 2026-10-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("eligibility", sa.Text(), nullable=False, server_default=""))
    op.add_column("exams", sa.Column("syllabus", sa.Text(), nullable=False, server_default=""))
    op.add_column(
        "exams",
        sa.Column("faqs", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )


def downgrade() -> None:
    op.drop_column("exams", "faqs")
    op.drop_column("exams", "syllabus")
    op.drop_column("exams", "eligibility")
