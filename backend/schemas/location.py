from pydantic import BaseModel, ConfigDict


class LocationSchema(BaseModel):
    slug: str
    name: str
    state: str
    collegeCount: int

    model_config = ConfigDict(populate_by_name=True)


class CourseFeeSchema(BaseModel):
    """A course category and its fee range, e.g. MBA and "6L - 24L"."""

    category: str
    fees: str

    model_config = ConfigDict(populate_by_name=True)


class FeaturedCollegeSchema(BaseModel):
    slug: str
    name: str


class FeaturedStreamSchema(BaseModel):
    """A category the card offers, with the colleges the admin picked under it."""

    stream: str  # the category's slug, e.g. "engineering"
    name: str
    colleges: list[FeaturedCollegeSchema] = []


class HighlightCollegeSchema(BaseModel):
    """The college a card highlights: its name, its own photo and the figures drawn from it."""

    slug: str
    name: str
    image: str = ""
    rankingAuthority: str | None = None
    rank: int | None = None
    rating: float | None = None
    avgPackage: str = ""
    coursesOffered: int = 0
    city: str = ""
    state: str = ""
    stream: str = ""
    established: int | None = None
    ownership: str = ""
    # A short plain-text excerpt of the college's About text.
    about: str = ""


class HomeLocationSchema(LocationSchema):
    """A homepage carousel card: the directory entry plus what the card shows."""

    # Tags on the card, in label order.
    labels: list[str] = []
    courseFees: list[CourseFeeSchema] = []
    description: str = ""
    avgPackage: str = ""
    image: str = ""
    # Empty: the card works its categories out from the colleges in the city.
    featured: list[FeaturedStreamSchema] = []
    # The college the card's photo shows, named in a caption on it. Empty: no caption.
    imageCaption: str = ""
    # The highlighted (sponsored) college. The card shows its photo unless `image` is set.
    highlightCollege: HighlightCollegeSchema | None = None
    # Figures over the photo. Empty: the page works them out from the location's colleges.
    nirfRank: int | None = None
    otherRankLabel: str = ""
    otherRank: int | None = None
    topRating: float | None = None
