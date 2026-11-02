"""how a recruiting company is shown: the logo, the name, or both

`recruiters.display_mode` is 'logo' (the default: a company that has a logo shows only the logo), 'name' (the
name, even though there is a logo) or 'both'. It replaces the yes/no `show_name`, which could not say "name
only"; that column is kept, unused. A company with no logo always shows its name.

Revision ID: 053
Revises: 052
Create Date: 2026-11-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "053"
down_revision = "052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("recruiters", sa.Column("display_mode", sa.String(10), nullable=False, server_default="logo"))


def downgrade() -> None:
    op.drop_column("recruiters", "display_mode")
