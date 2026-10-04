"""homepage location card fields

Revision ID: 010
Revises: 009
Create Date: 2026-10-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None

# The text and photos the homepage carousel used to hard-code per city. Carried
# into the table so the live site reads the same after this migration.
CARDS = {
    "bangalore": ("Silicon Valley of India", "Top Startup Ecosystem", "Global epicenter for IT, Artificial Intelligence, Product Startups & Tech Giants.", "₹8.5 - 24 LPA"),
    "hyderabad": ("Cyber City & Biotech", "Highest Growth Index", "Rapidly expanding IT corridor, pharmaceutical research & Fortune 500 campuses.", "₹7.5 - 20 LPA"),
    "pune": ("Oxford of the East", "Student Capital", "Academic heritage, premier automotive design, research & manufacturing hubs.", "₹7.0 - 18 LPA"),
    "mumbai": ("Financial Capital", "Finance & Corporate HQ", "Headquarters of India's major investment banks, consulting & media powerhouses.", "₹9.0 - 28 LPA"),
    "delhi-ncr": ("National Corporate Hub", "Leadership & Policy Hub", "Center of policy, diplomacy, FMCG giants & fast-growing tech conglomerates.", "₹8.0 - 25 LPA"),
    "chennai": ("Industrial & IT Powerhouse", "Core Tech & Research", "Renowned research institutions, health-tech revolution & automotive manufacturing.", "₹6.8 - 18 LPA"),
}


def upgrade() -> None:
    op.add_column("locations", sa.Column("tagline", sa.String(120), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("highlight", sa.String(120), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("description", sa.Text(), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("avg_package", sa.String(60), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("image", sa.String(200), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("show_on_home", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("locations", sa.Column("home_order", sa.Integer(), nullable=False, server_default="0"))

    conn = op.get_bind()
    # Keep today's order: most colleges first.
    conn.execute(sa.text(
        "UPDATE locations SET home_order = ranked.n FROM "
        "(SELECT id, row_number() OVER (ORDER BY college_count DESC, name) - 1 AS n FROM locations) AS ranked "
        "WHERE locations.id = ranked.id"
    ))
    for slug, (tagline, highlight, description, avg) in CARDS.items():
        conn.execute(
            sa.text(
                "UPDATE locations SET tagline = :t, highlight = :h, description = :d, "
                "avg_package = :a, image = :i WHERE slug = :s"
            ),
            {"t": tagline, "h": highlight, "d": description, "a": avg, "i": f"/images/locations/{slug}.jpg", "s": slug},
        )


def downgrade() -> None:
    for column in ("home_order", "show_on_home", "image", "avg_package", "description", "highlight", "tagline"):
        op.drop_column("locations", column)
