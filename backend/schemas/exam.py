from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ExamSchema(BaseModel):
    slug: str
    name: str
    conductingBody: str
    level: str
    description: str
    registrationCloses: Optional[str] = None
    examDate: Optional[str] = None
    # Extended detail fields
    mode: Optional[str] = None
    frequency: Optional[str] = None
    applicationFee: Optional[str] = None
    officialSite: Optional[str] = None
    durationMinutes: Optional[int] = None
    sections: Optional[List[str]] = None
    # Card photo. Empty: the card shows no photo.
    image: str = ""

    model_config = ConfigDict(populate_by_name=True)
