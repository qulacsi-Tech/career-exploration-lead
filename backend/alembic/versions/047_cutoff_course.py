"""cut-offs by course and specialisation

A cut-off was one score for an exam and a caste category. It can now also be for a course, or for one
specialisation of it (CSE, EEE...): `cutoffs.course` and `cutoffs.specialisation`. Empty means "every programme", which is
what every existing cut-off was.

Revision ID: 047
Revises: 046
Create Date: 2026-10-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "047"
down_revision = "046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cutoffs", sa.Column("course", sa.String(200), nullable=False, server_default=""))
    op.add_column("cutoffs", sa.Column("specialisation", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("cutoffs", "specialisation")
    op.drop_column("cutoffs", "course")
