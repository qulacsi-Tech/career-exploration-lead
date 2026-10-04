"""photos for college and exam cards

Colleges and exams used to get their card photo from the page itself: a college
from a pool chosen by hashing its slug, an exam from /images/exams/<slug>.jpg. The
photo is a column now, so the admin can set it. Existing rows are filled with the
photo the page was showing, so nothing changes on the live site.

Revision ID: 014
Revises: 013
Create Date: 2026-10-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None

# Mirrors frontend/src/lib/college-images.ts as it was before this change.
POOL = [
    "/images/colleges/bengaluru-institute-of-management-studies.jpg",
    "/images/colleges/horizon-school-of-business.jpg",
    "/images/colleges/eastwind-institute-of-management.jpg",
    "/images/universities/kr-mangalam-university.jpg",
    "/images/universities/clark-university.jpg",
    "/images/universities/swarnam-university.jpg",
    "/images/banners/promo-banner-campus.jpg",
]
BY_SLUG = {
    "bengaluru-institute-of-management-studies": POOL[0],
    "horizon-school-of-business": POOL[1],
    "eastwind-institute-of-management": POOL[2],
    "kr-mangalam-university": POOL[3],
}
# The exam photos that exist under frontend/public/images/exams.
EXAM_PHOTOS = {"cat", "cmat", "karnataka-pgcet", "mah-cet", "nmat", "xat"}


def _int32(n: int) -> int:
    n &= 0xFFFFFFFF
    return n - 0x100000000 if n >= 0x80000000 else n


def _hash(value: str) -> int:
    """The page's djb2: h = ((h << 5) + h + code) | 0, then Math.abs."""
    h = 5381
    for ch in value:
        h = _int32(_int32(h << 5) + h + ord(ch))
    return abs(h)


def college_photo(slug: str) -> str:
    return BY_SLUG.get(slug) or POOL[_hash(slug) % len(POOL)]


def upgrade() -> None:
    op.add_column("colleges", sa.Column("image", sa.String(200), nullable=False, server_default=""))
    op.add_column("exams", sa.Column("image", sa.String(200), nullable=False, server_default=""))

    conn = op.get_bind()
    for (slug,) in conn.execute(sa.text("SELECT slug FROM colleges")).fetchall():
        conn.execute(sa.text("UPDATE colleges SET image = :i WHERE slug = :s"), {"i": college_photo(slug), "s": slug})
    for slug in EXAM_PHOTOS:
        conn.execute(sa.text("UPDATE exams SET image = :i WHERE slug = :s"), {"i": f"/images/exams/{slug}.jpg", "s": slug})


def downgrade() -> None:
    op.drop_column("exams", "image")
    op.drop_column("colleges", "image")
