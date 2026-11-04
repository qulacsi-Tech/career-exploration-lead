from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class SearchCollegeResult(BaseModel):
    slug: str
    name: str
    city: str
    stream: str

    model_config = ConfigDict(populate_by_name=True)


class SearchExamResult(BaseModel):
    slug: str
    name: str

    model_config = ConfigDict(populate_by_name=True)


class SearchLocationResult(BaseModel):
    slug: str
    name: str

    model_config = ConfigDict(populate_by_name=True)


class SearchCourseResult(BaseModel):
    slug: str
    name: str
    fullName: str = ""
    stream: str = ""

    model_config = ConfigDict(populate_by_name=True)


class SearchSpecialisationResult(BaseModel):
    slug: str
    name: str
    courseName: str = ""
    stream: str = ""

    model_config = ConfigDict(populate_by_name=True)


class SearchResultsSchema(BaseModel):
    colleges: List[SearchCollegeResult]
    exams: List[SearchExamResult]
    locations: List[SearchLocationResult]
    courses: List[SearchCourseResult] = []
    specialisations: List[SearchSpecialisationResult] = []

    model_config = ConfigDict(populate_by_name=True)
