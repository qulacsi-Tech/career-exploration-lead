"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-10-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(72), nullable=False),
        sa.Column(
            "role",
            sa.Enum("USER", "ADMIN", name="userrole"),
            nullable=False,
            server_default="USER",
        ),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_users_email", "users", ["email"], unique=True)

    # ── colleges ─────────────────────────────────────────────────────────────
    op.create_table(
        "colleges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("city", sa.String(200), nullable=False),
        sa.Column("state", sa.String(200), nullable=False),
        sa.Column(
            "ownership",
            sa.Enum("Private", "Government", "Deemed", name="ownershiptype"),
            nullable=False,
        ),
        sa.Column("stream", sa.String(100), nullable=False),
        sa.Column("ranking_authority", sa.String(100), nullable=True),
        sa.Column("ranking_rank", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("courses_offered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fees_range", sa.String(100), nullable=True),
        sa.Column(
            "exams_accepted",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "approvals",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column("established", sa.Integer(), nullable=True),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_colleges_slug", "colleges", ["slug"], unique=True)
    op.create_index("idx_colleges_stream", "colleges", ["stream"])
    op.create_index("idx_colleges_city", "colleges", ["city"])
    op.create_index("idx_colleges_state", "colleges", ["state"])
    op.create_index("idx_colleges_ownership", "colleges", ["ownership"])
    op.create_index("idx_colleges_rating", "colleges", ["rating"])
    op.create_index("idx_colleges_is_featured", "colleges", ["is_featured"])

    # ── courses ───────────────────────────────────────────────────────────────
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "college_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("colleges.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("duration", sa.String(100), nullable=False),
        sa.Column("mode", sa.String(100), nullable=False),
        sa.Column("fees", sa.String(200), nullable=False),
        sa.Column(
            "exams",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_courses_college_id", "courses", ["college_id"])

    # ── placements ────────────────────────────────────────────────────────────
    op.create_table(
        "placements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "college_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("colleges.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("average_package", sa.String(50), nullable=True),
        sa.Column("median_package", sa.String(50), nullable=True),
        sa.Column("highest_package", sa.String(50), nullable=True),
        sa.Column(
            "top_recruiters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("college_id", "year", name="uq_placement_college_year"),
    )
    op.create_index("idx_placements_college_id", "placements", ["college_id"])

    # ── cutoffs ───────────────────────────────────────────────────────────────
    op.create_table(
        "cutoffs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "college_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("colleges.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("exam", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("score", sa.String(100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_cutoffs_college_id", "cutoffs", ["college_id"])

    # ── reviews ───────────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "college_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("colleges.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("author_name", sa.String(200), nullable=False),
        sa.Column("course", sa.String(200), nullable=False),
        sa.Column("batch", sa.String(50), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("review_date", sa.Date(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("rating_placements", sa.Float(), nullable=True),
        sa.Column("rating_faculty", sa.Float(), nullable=True),
        sa.Column("rating_infrastructure", sa.Float(), nullable=True),
        sa.Column("rating_campus_life", sa.Float(), nullable=True),
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_reviews_college_id", "reviews", ["college_id"])
    op.create_index("idx_reviews_user_id", "reviews", ["user_id"])
    op.create_index("idx_reviews_is_approved", "reviews", ["is_approved"])

    # ── exams ─────────────────────────────────────────────────────────────────
    op.create_table(
        "exams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("conducting_body", sa.String(200), nullable=False),
        sa.Column(
            "level",
            sa.Enum("National", "State", name="examlevel"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("registration_closes", sa.String(50), nullable=True),
        sa.Column("exam_date", sa.String(50), nullable=True),
        sa.Column("stream", sa.String(100), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_exams_slug", "exams", ["slug"], unique=True)
    op.create_index("idx_exams_level", "exams", ["level"])
    op.create_index("idx_exams_stream", "exams", ["stream"])
    op.create_index("idx_exams_is_featured", "exams", ["is_featured"])

    # ── locations ─────────────────────────────────────────────────────────────
    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("state", sa.String(200), nullable=False),
        sa.Column("college_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_locations_slug", "locations", ["slug"], unique=True)

    # ── articles ──────────────────────────────────────────────────────────────
    op.create_table(
        "articles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("published_at", sa.Date(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_articles_slug", "articles", ["slug"], unique=True)
    op.create_index("idx_articles_published_at", "articles", ["published_at"])

    # ── programs ──────────────────────────────────────────────────────────────
    op.create_table(
        "programs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("university_name", sa.String(500), nullable=False),
        sa.Column("university_slug", sa.String(200), nullable=False),
        sa.Column("online_duration", sa.String(100), nullable=True),
        sa.Column("online_fees", sa.String(200), nullable=True),
        sa.Column("online_fees_note", sa.String(200), nullable=True),
        sa.Column("on_campus_duration", sa.String(100), nullable=True),
        sa.Column("on_campus_fees", sa.String(200), nullable=True),
        sa.Column("is_recommended", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_programs_slug", "programs", ["slug"], unique=True)
    op.create_index("idx_programs_is_recommended", "programs", ["is_recommended"])

    # ── leads ─────────────────────────────────────────────────────────────────
    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("college_slug", sa.String(200), nullable=True),
        sa.Column(
            "type",
            sa.Enum("callback", "counselling", "brochure", "enquiry", name="leadtype"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("new", "contacted", "converted", "closed", name="leadstatus"),
            nullable=False,
            server_default="new",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_leads_phone", "leads", ["phone"])
    op.create_index("idx_leads_college_slug", "leads", ["college_slug"])
    op.create_index("idx_leads_type", "leads", ["type"])
    op.create_index("idx_leads_created_at", "leads", ["created_at"])

    # ── newsletter_subscribers ────────────────────────────────────────────────
    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "subscribed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_newsletter_email", "newsletter_subscribers", ["email"], unique=True)


def downgrade() -> None:
    op.drop_table("newsletter_subscribers")
    op.drop_table("leads")
    op.drop_table("programs")
    op.drop_table("articles")
    op.drop_table("locations")
    op.drop_table("exams")
    op.drop_table("reviews")
    op.drop_table("cutoffs")
    op.drop_table("placements")
    op.drop_table("courses")
    op.drop_table("colleges")
    op.drop_table("users")
    # Drop custom enum types
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS ownershiptype")
    op.execute("DROP TYPE IF EXISTS examlevel")
    op.execute("DROP TYPE IF EXISTS leadtype")
    op.execute("DROP TYPE IF EXISTS leadstatus")
