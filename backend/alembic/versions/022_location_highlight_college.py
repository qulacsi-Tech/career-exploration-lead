"""the college named on a location card's photo

The photo on a homepage location card is a photo of a college, uploaded in the admin. This is
the name of that college, shown as a small caption on the photo. Empty: no caption.

Revision ID: 022
Revises: 021
Create Date: 2026-10-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("locations", sa.Column("image_caption", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("locations", "image_caption")
