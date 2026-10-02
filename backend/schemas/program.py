from typing import Optional
from pydantic import BaseModel, ConfigDict


class OnlineInfoSchema(BaseModel):
    duration: Optional[str]
    fees: Optional[str]
    feesNote: Optional[str]

    model_config = ConfigDict(populate_by_name=True)


class OnCampusInfoSchema(BaseModel):
    duration: Optional[str]
    fees: Optional[str]

    model_config = ConfigDict(populate_by_name=True)


class ProgramSchema(BaseModel):
    slug: str
    name: str
    university: str
    universitySlug: str
    online: OnlineInfoSchema
    onCampus: OnCampusInfoSchema

    model_config = ConfigDict(populate_by_name=True)
