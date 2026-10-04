"""Pydantic schemas for College and related sub-resources.

All response field names are camelCase to match the TypeScript frontend types
defined in src/lib/mock-data.ts.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


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
    duration: str
    mode: str
    fees: str
    exams: List[str]

    model_config = ConfigDict(populate_by_name=True)


class PlacementSchema(BaseModel):
    year: int
    average: str
    median: str
    highest: str
    topRecruiters: List[str]

    model_config = ConfigDict(populate_by_name=True)


class CutoffSchema(BaseModel):
    exam: str
    category: str
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
    sort: str = "popularity"
    featured: Optional[bool] = None
    q: Optional[str] = None
