"""the editor-written parts of a college page

Adds `colleges.detail` (a JSON document holding the masthead's short title and locality, the
faculty roster, Q&A, gallery, videos, press coverage, alerts, articles, the written sections and
the SEO text), the programme's eligibility and seats, and a placement's placed percentage.
Existing rows start empty.

Revision ID: 024
Revises: 023
Create Date: 2026-10-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("detail", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("courses", sa.Column("eligibility", sa.String(300), nullable=False, server_default=""))
    op.add_column("courses", sa.Column("seats", sa.Integer(), nullable=True))
    op.add_column("placements", sa.Column("placed_percent", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("placements", "placed_percent")
    op.drop_column("courses", "seats")
    op.drop_column("courses", "eligibility")
    op.drop_column("colleges", "detail")
