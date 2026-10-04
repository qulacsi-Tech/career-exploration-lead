from pydantic import BaseModel, ConfigDict


class LocationSchema(BaseModel):
    slug: str
    name: str
    state: str
    collegeCount: int

    model_config = ConfigDict(populate_by_name=True)


class HomeLocationSchema(LocationSchema):
    """A homepage carousel card: the directory entry plus what the card shows."""

    # Tags on the card, in label order.
    labels: list[str] = []
    description: str = ""
    avgPackage: str = ""
    image: str = ""
