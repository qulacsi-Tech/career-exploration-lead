"""ranking and rating figures on a location card

The figures over the photo of a homepage location card (the NIRF rank, another ranking and the
top rating) can be set in the admin. Left empty, the card works them out from the colleges in the
location, and leaves out a figure it has no data for.

Revision ID: 023
Revises: 022
Create Date: 2026-10-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("locations", sa.Column("nirf_rank", sa.Integer(), nullable=True))
    op.add_column("locations", sa.Column("other_rank_label", sa.String(60), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("other_rank", sa.Integer(), nullable=True))
    op.add_column("locations", sa.Column("top_rating", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("locations", "top_rating")
    op.drop_column("locations", "other_rank")
    op.drop_column("locations", "other_rank_label")
    op.drop_column("locations", "nirf_rank")
