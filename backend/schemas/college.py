"""Pydantic schemas for College and related sub-resources.

All response field names are camelCase to match the TypeScript frontend types
defined in src/lib/mock-data.ts.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from schemas.college_detail import AlertItem, ArticleItem, Faculty, Faq, GalleryItem, MediaItem, Seo, VideoItem


# ── Sub-resource schemas ──────────────────────────────────────────────────────

class RankingSchema(BaseModel):
    authority: str
    rank: int

    model_config = ConfigDict(populate_by_name=True)


class RatingBreakdownSchema(BaseModel):
    label: str
    score: float

    model_config = ConfigDict(populate_by_name=True)


class CourseSchema(BaseModel):
    name: str
    specialisation: str = ""
    duration: str
    mode: str
    fees: str
    exams: List[str]
    eligibility: str = ""
    seats: Optional[int] = None
    onlineOffered: bool = False
    onlineDuration: str = ""
    onlineFees: str = ""

    model_config = ConfigDict(populate_by_name=True)


class PlacementBreakdownSchema(BaseModel):
    category: str = ""
    course: str = ""
    specialisation: str = ""
    average: str = ""
    highest: str = ""
    placed: Optional[int] = None
    students: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True)


class PlacementSchema(BaseModel):
    year: int
    average: str
    median: str
    highest: str
    topRecruiters: List[str]
    placedPercent: Optional[int] = None
    # By category, course and specialisation, as the admin entered them.
    breakdown: List[PlacementBreakdownSchema] = []

    model_config = ConfigDict(populate_by_name=True)


class CutoffSchema(BaseModel):
    exam: str
    # The caste category: General, OBC, SC, ST...
    category: str
    # Empty: every programme.
    course: str = ""
    specialisation: str = ""
    score: str

    model_config = ConfigDict(populate_by_name=True)


class ReviewSchema(BaseModel):
    author: str
    course: str
    batch: str
    verified: bool
    date: str
    rating: float
    body: str

    model_config = ConfigDict(populate_by_name=True)


# ── List-view schema (used in /colleges listing, home page, related) ──────────

class CollegeListSchema(BaseModel):
    """Lightweight college representation — fields consumed by CollegeCard and TopCollegeCard."""

    slug: str
    name: str
    city: str
    state: str
    ownership: str
    stream: str
    # draft | published | archived. The public site only ever receives published ones.
    status: str = "published"
    ranking: RankingSchema
    rating: float
    reviewCount: int
    coursesOffered: int
    feesRange: Optional[str]
    examsAccepted: List[str]
    tags: List[str]
    approvals: List[str]
    # First course for TopCollegeCard footer band
    courses: List[CourseSchema] = []
    # Card and hero photo. Empty: the card shows no photo.
    image: str = ""
    # The college's logo and brochure, from its page record. Empty: none uploaded.
    logo: str = ""
    brochureUrl: str = ""
    # Listing badges: set in the admin (featured) and counted from page visits (views).
    isFeatured: bool = False
    viewCount: int = 0
    # The default priority set in the admin (1 first); None when the college has none.
    priority: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True)


# ── Detail schema (used by /college/[slug]) ───────────────────────────────────

class CollegeDetailSchema(CollegeListSchema):
    """Full college profile."""

    established: Optional[int]
    about: Optional[str]
    ratingBreakdown: List[RatingBreakdownSchema]
    placement: Optional[PlacementSchema]
    cutoffs: List[CutoffSchema]
    reviews: List[ReviewSchema]
    # Every year's placement record, newest first. `placement` is the latest.
    placements: List[PlacementSchema] = []
    # The editor-written parts of the page.
    shortName: str = ""
    tagline: str = ""
    locality: str = ""
    # When the record was last saved (ISO date).
    updatedAt: str = ""
    faculty: Faculty = Faculty()
    faqs: List[Faq] = []
    similarSlugs: List[str] = []
    seo: Seo = Seo()
    gallery: List[GalleryItem] = []
    videos: List[VideoItem] = []
    media: List[MediaItem] = []
    alerts: List[AlertItem] = []
    articles: List[ArticleItem] = []
    tabs: dict = {}

    model_config = ConfigDict(populate_by_name=True)


# ── Request schemas ───────────────────────────────────────────────────────────

class CollegeFilterParams(BaseModel):
    """Query-parameter bag for the college listing endpoint."""

    page: int = 1
    limit: int = 20
    stream: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    ownership: Optional[str] = None
    course: Optional[str] = None
    mode: Optional[str] = None
    approval: Optional[str] = None
    exam: Optional[str] = None
    fees_min: Optional[int] = None
    fees_max: Optional[int] = None
    ranking_max: Optional[int] = None
    # Slug of a ranking list: only the colleges in it, best rank first when sorted by popularity.
    ranking_list: Optional[str] = None
    # Listing facets. `specialisation` matches course names ("MBA Finance"),
    # `level` is UG | PG | Doctorate, `credential` is Degree | Diploma, and the
    # fee bounds are in lakh rupees against the college's lowest fee.
    specialisation: Optional[str] = None
    level: Optional[str] = None
    credential: Optional[str] = None
    min_rating: Optional[float] = None
    sort: str = "popularity"
    # Only the admin asks for anything but published: "all", "draft" or "archived".
    status: Optional[str] = None
    featured: Optional[bool] = None
    q: Optional[str] = None
    # A hand-picked collection: only these colleges, in this order (the popularity sort), best rank in
    # `order_list` first when one is named. Everything else in the bag still narrows them.
    slugs: Optional[List[str]] = None
    order_list: Optional[str] = None
    # Colleges a header-menu link leaves out.
    exclude_slugs: Optional[List[str]] = None
    # A header-menu link's own priorities, slug -> 1, 2, 3...: those colleges come first, in that order.
    priority: Optional[dict[str, int]] = None
