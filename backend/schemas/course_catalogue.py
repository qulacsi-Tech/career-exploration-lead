from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class SpecialisationSchema(BaseModel):
    slug: str
    name: str
    courseSlug: str
    courseName: str
    stream: str
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

    model_config = ConfigDict(populate_by_name=True)


class CourseCatalogueDetailSchema(CourseCatalogueListSchema):
    specialisations: List[SpecialisationSchema] = []

    model_config = ConfigDict(populate_by_name=True)
