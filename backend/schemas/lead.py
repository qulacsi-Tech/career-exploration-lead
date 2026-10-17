import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class LeadCreateSchema(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    collegeSlug: Optional[str] = None
    type: str  # callback | counselling | brochure | enquiry
    stream: Optional[str] = None
    city: Optional[str] = None
    message: Optional[str] = None
    programName: Optional[str] = None
    source: Optional[str] = None
    sourceUrl: Optional[str] = None
    consent: bool = False

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("stream", "city", "programName", "source")
    @classmethod
    def trim_short(cls, v: Optional[str]) -> Optional[str]:
        return v.strip()[:200] if v and v.strip() else None

    @field_validator("message")
    @classmethod
    def trim_message(cls, v: Optional[str]) -> Optional[str]:
        return v.strip()[:1000] if v and v.strip() else None

    @field_validator("sourceUrl")
    @classmethod
    def trim_url(cls, v: Optional[str]) -> Optional[str]:
        return v.strip()[:500] if v and v.strip() else None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 100:
            raise ValueError("Name must be between 2 and 100 characters.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone must be 10–15 digits.")
        return digits

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"callback", "counselling", "brochure", "enquiry"}
        if v not in allowed:
            raise ValueError(f"type must be one of: {', '.join(allowed)}")
        return v


class LeadResponseSchema(BaseModel):
    id: str
    message: str
    # True when this was the same request as one already received, so nothing new was stored.
    repeat: bool = False

    model_config = ConfigDict(populate_by_name=True)


class NewsletterSubscribeSchema(BaseModel):
    email: EmailStr

    model_config = ConfigDict(populate_by_name=True)


class NewsletterResponseSchema(BaseModel):
    message: str

    model_config = ConfigDict(populate_by_name=True)
