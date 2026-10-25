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


class ProgramInstitutionSchema(BaseModel):
    """One institution offering the programme: the programme record's own figures, and the college's
    details when the institution is in the directory."""

    slug: str
    university: str
    universitySlug: str
    # The institution has a page of its own on the site. False: only a name is known.
    inDirectory: bool = False
    city: Optional[str] = None
    state: Optional[str] = None
    ownership: Optional[str] = None
    rankingAuthority: Optional[str] = None
    rankingRank: Optional[int] = None
    rating: Optional[float] = None
    reviewCount: Optional[int] = None
    online: OnlineInfoSchema
    onCampus: OnCampusInfoSchema

    model_config = ConfigDict(populate_by_name=True)


class ProgramSchema(BaseModel):
    slug: str
    name: str
    university: str
    universitySlug: str
    online: OnlineInfoSchema
    onCampus: OnCampusInfoSchema
    # The programme's own photo. Empty: the card uses the site's shared photo set.
    image: str = ""
    # Every institution that offers this programme (same name), the one asked for first. Only on the detail read.
    institutions: list[ProgramInstitutionSchema] = []

    model_config = ConfigDict(populate_by_name=True)
