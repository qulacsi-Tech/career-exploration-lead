from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class SpecialisationSchema(BaseModel):
    slug: str
    name: str
    courseSlug: Optional[str] = None
    courseName: Optional[str] = None
    stream: Optional[str] = None
    duration: Optional[str] = None
    averageFees: Optional[str] = None
    collegeCount: int
    about: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CourseCatalogueListSchema(BaseModel):
    slug: str
    name: str
    fullName: str
    level: str
    stream: str
    duration: str
    modes: List[str]
    eligibility: Optional[str] = None
    averageFees: Optional[str] = None
    examsAccepted: List[str]
    collegeCount: int
    about: Optional[str] = None
    # Set in the admin: 1 is shown first. None when the course has none.
    priority: Optional[int] = None
    # The branches offered under it (Finance, Marketing...), with the colleges offering each.
    specialisations: List[SpecialisationSchema] = []

    model_config = ConfigDict(populate_by_name=True)


class CourseCatalogueDetailSchema(CourseCatalogueListSchema):
    model_config = ConfigDict(populate_by_name=True)
