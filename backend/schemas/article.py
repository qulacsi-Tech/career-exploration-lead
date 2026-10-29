from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ── The article page: sections of blocks ─────────────────────────────────────
# An editor builds a page from sections, each with a heading and any mix of
# these blocks. Everything is plain text; the site decides how each looks.

Text = Annotated[str, Field(max_length=5000)]
Short = Annotated[str, Field(max_length=300)]


class ParagraphBlock(BaseModel):
    type: Literal["paragraph"]
    text: Text
    model_config = ConfigDict(extra="forbid")


class ListBlock(BaseModel):
    type: Literal["list"]
    style: Literal["bullet", "numbered", "check"] = "bullet"
    items: List[Short] = Field(default_factory=list, max_length=40)
    model_config = ConfigDict(extra="forbid")


class TableBlock(BaseModel):
    type: Literal["table"]
    headers: List[Short] = Field(default_factory=list, max_length=10)
    rows: List[List[Short]] = Field(default_factory=list, max_length=60)
    model_config = ConfigDict(extra="forbid")


class ImageBlock(BaseModel):
    """A picture: an upload or a shipped photo, never an external address."""

    type: Literal["image"]
    src: Annotated[str, Field(max_length=200, pattern=r"^(/api/uploads/|/images/)[^\s]*$")]
    alt: Short = ""
    caption: Short = ""
    size: Literal["small", "medium", "large", "full"] = "large"
    shape: Literal["original", "landscape", "wide", "square", "portrait", "circle"] = "landscape"
    align: Literal["left", "center", "right"] = "center"
    model_config = ConfigDict(extra="forbid")

    @field_validator("src")
    @classmethod
    def _no_traversal(cls, value: str) -> str:
        if ".." in value:
            raise ValueError("must be an image uploaded through the admin")
        return value


class StepsBlock(BaseModel):
    type: Literal["steps"]
    items: List["StepItem"] = Field(default_factory=list, max_length=20)
    model_config = ConfigDict(extra="forbid")


class StepItem(BaseModel):
    title: Short
    text: Annotated[str, Field(max_length=1000)] = ""
    model_config = ConfigDict(extra="forbid")


class NoteBlock(BaseModel):
    type: Literal["note"]
    tone: Literal["info", "tip", "warning"] = "info"
    title: Short = ""
    text: Annotated[str, Field(max_length=2000)]
    model_config = ConfigDict(extra="forbid")


class QuoteBlock(BaseModel):
    type: Literal["quote"]
    text: Annotated[str, Field(max_length=1000)]
    by: Short = ""
    model_config = ConfigDict(extra="forbid")


class FactItem(BaseModel):
    label: Short
    value: Short
    model_config = ConfigDict(extra="forbid")


class FactsBlock(BaseModel):
    type: Literal["facts"]
    items: List[FactItem] = Field(default_factory=list, max_length=30)
    model_config = ConfigDict(extra="forbid")


Block = Annotated[
    Union[ParagraphBlock, ListBlock, TableBlock, StepsBlock, NoteBlock, QuoteBlock, FactsBlock, ImageBlock],
    Field(discriminator="type"),
]


class ArticleSection(BaseModel):
    heading: Annotated[str, Field(max_length=200)] = ""
    blocks: List[Block] = Field(default_factory=list, max_length=40)
    model_config = ConfigDict(extra="forbid")


StepsBlock.model_rebuild()


class ArticleListSchema(BaseModel):
    slug: str
    title: str
    excerpt: str
    date: str          # formatted "D Mon YYYY"
    author: Optional[str] = "Editorial Desk"
    category: Optional[str] = None
    readMinutes: Optional[int] = 5
    # The article's picture. Empty: none.
    image: str = ""
    # The colleges it is about, so a college's News tab can list the articles written for it.
    relatedCollegeSlugs: List[str] = []

    model_config = ConfigDict(populate_by_name=True)


class ArticleDetailSchema(ArticleListSchema):
    body: Optional[str] = None
    # The page as sections of blocks. Empty: show `body` as plain paragraphs.
    sections: List[ArticleSection] = []

    model_config = ConfigDict(populate_by_name=True)
