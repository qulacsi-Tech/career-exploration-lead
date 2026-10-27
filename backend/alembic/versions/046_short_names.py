"""a short name for exams and ranking lists

`exams.short_name` and `ranking_lists.short_name` hold the name used where space is tight (the header menu, headings):
"CAT" for "Common Admission Test (CAT)", "NIRF Mgmt 2026" for "NIRF Management Rankings 2026". Empty: the full name.
A college's short name already lives on its page record (`colleges.detail.shortName`).

Revision ID: 046
Revises: 045
Create Date: 2026-10-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "046"
down_revision = "045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("exams", "ranking_lists"):
        op.add_column(table, sa.Column("short_name", sa.String(100), nullable=False, server_default=""))


def downgrade() -> None:
    for table in ("exams", "ranking_lists"):
        op.drop_column(table, "short_name")
