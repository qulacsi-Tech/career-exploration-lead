from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class RankingEntrySchema(BaseModel):
    collegeSlug: str
    rank: int
    score: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class RankingListSchema(BaseModel):
    slug: str
    name: str
    # Where space is tight. Empty: the full name.
    shortName: str = ""
    authority: str
    year: int
    stream: Optional[str] = None
    entries: List[RankingEntrySchema] = []

    model_config = ConfigDict(populate_by_name=True)
