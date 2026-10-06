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
