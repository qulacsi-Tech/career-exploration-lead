from typing import Optional
from pydantic import BaseModel, ConfigDict


class ExamSchema(BaseModel):
    slug: str
    name: str
    conductingBody: str
    level: str
    description: str
    registrationCloses: Optional[str]
    examDate: Optional[str]

    model_config = ConfigDict(populate_by_name=True)
