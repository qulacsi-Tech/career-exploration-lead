"""location district

Revision ID: 011
Revises: 010
Create Date: 2026-10-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None

# The district each seeded city sits in, using the names in data/india_districts.py.
DISTRICTS = {
    "hyderabad": "Hyderabad",
    "pune": "Pune",
    "chennai": "Chennai",
}


def upgrade() -> None:
    op.add_column("locations", sa.Column("district", sa.String(200), nullable=False, server_default=""))
    conn = op.get_bind()
    for slug, district in DISTRICTS.items():
        conn.execute(sa.text("UPDATE locations SET district = :d WHERE slug = :s"), {"d": district, "s": slug})


def downgrade() -> None:
    op.drop_column("locations", "district")
