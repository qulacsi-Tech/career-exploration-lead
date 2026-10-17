import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


def _clean_phone(v: Optional[str]) -> Optional[str]:
    if v is None or not v.strip():
        return None
    digits = re.sub(r"\D", "", v)
    if len(digits) < 10 or len(digits) > 15:
        raise ValueError("Phone must be 10–15 digits.")
    return digits


class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    marketingConsent: bool = False

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _clean_phone(v)


class LoginSchema(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(populate_by_name=True)


class GoogleLoginSchema(BaseModel):
    idToken: str

    model_config = ConfigDict(populate_by_name=True)


class UserSchema(BaseModel):
    id: str
    name: str
    email: str
    role: str

    model_config = ConfigDict(populate_by_name=True)


class AuthResponseSchema(BaseModel):
    accessToken: str
    user: UserSchema
    # True when this request created the account (first Google sign-in, or register).
    isNewUser: bool = False
    # True when the person is on a temporary password and must choose their own before anything else.
    mustChangePassword: bool = False

    model_config = ConfigDict(populate_by_name=True)


class ProfileSchema(BaseModel):
    """The signed-in student's own record."""
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None
    authProvider: str
    city: Optional[str] = None
    state: Optional[str] = None
    preferredStream: Optional[str] = None
    targetExam: Optional[str] = None
    marketingConsent: bool = False
    # For a college admin: the college they look after.
    collegeSlug: Optional[str] = None
    mustChangePassword: bool = False

    model_config = ConfigDict(populate_by_name=True)


class PasswordChangeSchema(BaseModel):
    currentPassword: str
    newPassword: str

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("newPassword")
    @classmethod
    def validate_new(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("The new password needs at least 8 characters, with a letter and a number.")
        return v


class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    preferredStream: Optional[str] = None
    targetExam: Optional[str] = None
    marketingConsent: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2 or len(v) > 100:
            raise ValueError("Name must be between 2 and 100 characters.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _clean_phone(v)

    @field_validator("city", "state", "preferredStream", "targetExam")
    @classmethod
    def trim(cls, v: Optional[str]) -> Optional[str]:
        return v.strip()[:100] if v and v.strip() else None
