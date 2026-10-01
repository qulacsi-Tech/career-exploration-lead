from pydantic import BaseModel, ConfigDict


class LocationSchema(BaseModel):
    slug: str
    name: str
    state: str
    collegeCount: int

    model_config = ConfigDict(populate_by_name=True)
