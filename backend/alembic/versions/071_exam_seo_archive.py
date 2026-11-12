"""exam SEO fields and archiving

`exams.seo`: meta title, canonical URL, meta description, Open Graph image, schema type and indexing, set in the admin.
`exams.archived`: an archived exam is hidden from the public site and can be restored in the admin.

Revision ID: 071
Revises: 070
Create Date: 2026-11-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "071"
down_revision = "070"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("seo", postgresql.JSONB(), nullable=False, server_default="{}"))
    op.add_column("exams", sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_exams_archived", "exams", ["archived"])


def downgrade() -> None:
    op.drop_index("ix_exams_archived", table_name="exams")
    op.drop_column("exams", "archived")
    op.drop_column("exams", "seo")
