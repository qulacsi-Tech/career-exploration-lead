"""homepage hero slides

The hero was a single headline, sub-headline and picture stored with the homepage
copy. It is a list of slides now, so several can rotate. The one that exists is
carried over as the first slide, so the live site reads the same.

Revision ID: 015
Revises: 014
Create Date: 2026-10-05 00:00:00.000000
"""

import json
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None

DEFAULT_HEADLINE = "Find Colleges, Courses & Exams That Are Best For You"
DEFAULT_SUBHEADLINE = "Search 30,000+ colleges, compare fees and placements, and get free counselling from admission experts."


def upgrade() -> None:
    op.create_table(
        "hero_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("headline", sa.String(150), nullable=False),
        sa.Column("subheadline", sa.String(300), nullable=False),
        sa.Column("image", sa.String(200), nullable=False, server_default=""),
        sa.Column("image_alt", sa.String(150), nullable=False, server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )

    conn = op.get_bind()
    row = conn.execute(sa.text("SELECT data FROM site_content WHERE key = 'home.copy'")).first()
    data = row[0] if row else None
    if isinstance(data, str):
        data = json.loads(data)
    hero = (data or {}).get("hero", {}) if isinstance(data, dict) else {}

    conn.execute(
        sa.text(
            "INSERT INTO hero_items (id, headline, subheadline, image, image_alt, active, position) "
            "VALUES (:id, :h, :s, :i, :a, true, 0)"
        ),
        {
            "id": uuid.uuid4(),
            "h": (hero.get("headline") or DEFAULT_HEADLINE)[:150],
            "s": (hero.get("subheadline") or DEFAULT_SUBHEADLINE)[:300],
            "i": (hero.get("image") or "")[:200],
            "a": (hero.get("imageAlt") or "")[:150],
        },
    )


def downgrade() -> None:
    op.drop_table("hero_items")
