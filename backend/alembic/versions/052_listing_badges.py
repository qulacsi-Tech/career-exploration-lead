"""top rated and most viewed badges are set in the admin

`colleges.is_top_rated` and `colleges.is_most_viewed` join `is_featured`: the three badges on a college's card in
the listing are now ticked per college in the editor, rather than worked out from its rating and page views on
every request. Existing colleges start from what the old rule gave them (4.5 and over with reviews; the three
most viewed), so the listing looks the same until an admin changes a tick.

Revision ID: 052
Revises: 051
Create Date: 2026-11-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "052"
down_revision = "051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column in ("is_top_rated", "is_most_viewed"):
        op.add_column("colleges", sa.Column(column, sa.Boolean(), nullable=False, server_default="false"))
    op.execute("UPDATE colleges SET is_top_rated = true WHERE rating >= 4.5 AND review_count > 0")
    op.execute(
        "UPDATE colleges SET is_most_viewed = true WHERE id IN "
        "(SELECT id FROM colleges WHERE view_count > 0 ORDER BY view_count DESC LIMIT 3)"
    )


def downgrade() -> None:
    op.drop_column("colleges", "is_most_viewed")
    op.drop_column("colleges", "is_top_rated")
