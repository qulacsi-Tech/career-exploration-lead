"""a course or specialisation can carry a certificate / R&D programme

`courses.certificate_offered` and `courses.certificate_name`: the college ticks that a course or specialisation
holds an R&D or certificate programme and names it. The Courses tab on the public page highlights it as
"Certificate available".

Revision ID: 057
Revises: 056
Create Date: 2026-11-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "057"
down_revision = "056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("certificate_offered", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("courses", sa.Column("certificate_name", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("courses", "certificate_name")
    op.drop_column("courses", "certificate_offered")
