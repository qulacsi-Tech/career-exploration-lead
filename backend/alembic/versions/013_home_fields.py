"""homepage fields of study

The Fields grid used to be built from whatever streams colleges carried, with the
icon, tagline, badge and average CTC hard-coded in the page. They are rows now,
edited in the admin. Existing streams are carried over with the values the page
was showing, in the order it showed them, so the live site reads the same.

Revision ID: 013
Revises: 012
Create Date: 2026-10-04 00:00:00.000000
"""

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None

# (icon, tagline, avg CTC, badge) per stream, exactly as the page hard-coded them.
KNOWN = {
    "management": ("briefcase", "Leadership & Global Enterprise", "₹9 - 32 LPA", "Top Placement ROI"),
    "engineering": ("cpu", "Next-Gen Tech, AI & Systems", "₹8 - 38 LPA", "Highest Demand"),
    "medical": ("stethoscope", "Clinical Healthcare & Biotech", "₹10 - 45 LPA", "Vital Impact"),
    "arts": ("palette", "Media, Design & Humanities", "₹6 - 20 LPA", "Fastest Emerging"),
    "commerce": ("bar-chart", "Banking, Markets & Capital", "₹7 - 24 LPA", "Market Drivers"),
    "law": ("scale", "Litigation, IP & Policy", "₹8 - 26 LPA", "High Prestige"),
}
# What the page showed for any other stream.
GENERIC = ("book-open", "Specialized Degree Programs", "₹6 - 22 LPA", "Verified Curriculum")


def upgrade() -> None:
    op.create_table(
        "home_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("icon", sa.String(30), nullable=False, server_default="book-open"),
        sa.Column("tagline", sa.String(120), nullable=False, server_default=""),
        sa.Column("badge", sa.String(60), nullable=False, server_default=""),
        sa.Column("avg_ctc", sa.String(40), nullable=False, server_default=""),
        sa.Column("show_on_home", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("home_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_home_fields_slug", "home_fields", ["slug"], unique=True)

    conn = op.get_bind()
    # Same order the page used: most colleges first.
    rows = conn.execute(sa.text(
        "SELECT stream FROM colleges GROUP BY stream ORDER BY count(id) DESC, stream"
    )).fetchall()
    seen: set[str] = set()
    for (stream,) in rows:
        slug = stream.lower().replace(" ", "-")
        if not stream or slug in seen:
            continue
        seen.add(slug)
        icon, tagline, ctc, badge = KNOWN.get(slug, GENERIC)
        conn.execute(
            sa.text(
                "INSERT INTO home_fields (id, slug, name, icon, tagline, badge, avg_ctc, show_on_home, home_order) "
                "VALUES (:id, :slug, :name, :icon, :tagline, :badge, :ctc, true, :n)"
            ),
            {"id": uuid.uuid4(), "slug": slug, "name": stream, "icon": icon, "tagline": tagline, "badge": badge, "ctc": ctc, "n": len(seen) - 1},
        )


def downgrade() -> None:
    op.drop_index("ix_home_fields_slug", table_name="home_fields")
    op.drop_table("home_fields")
