"""exam page wording and the order of its colleges, set in the admin

`exams.page_text`: the headings and short lines on the exam's page, by key; an empty or missing key uses the usual
wording. `exams.college_priority`: college slug -> place among the colleges accepting the exam (1 first).

Revision ID: 069
Revises: 068
Create Date: 2026-11-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "069"
down_revision = "068"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("page_text", postgresql.JSONB(), nullable=False, server_default="{}"))
    op.add_column("exams", sa.Column("college_priority", postgresql.JSONB(), nullable=False, server_default="{}"))


def downgrade() -> None:
    op.drop_column("exams", "college_priority")
    op.drop_column("exams", "page_text")
