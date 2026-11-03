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


# Loose on purpose: an account made with any address that was once accepted must still be able to sign in.
_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def _identifier(value: str) -> str:
    """An email address (lower-cased) or a 10-digit mobile number, whichever it looks like."""
    value = (value or "").strip()
    if "@" in value:
        if len(value) > 254 or not _EMAIL.match(value):
            raise ValueError("Enter a valid email address.")
        return value.lower()
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValueError("Enter your email address or 10-digit mobile number.")
    return digits


class LoginSchema(BaseModel):
    # An email address or a mobile number (the field keeps its old name so existing callers still work).
    email: str
    password: str

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email")
    @classmethod
    def _who(cls, v: str) -> str:
        return _identifier(v)


class ForgotPasswordSchema(BaseModel):
    identifier: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("identifier")
    @classmethod
    def _who(cls, v: str) -> str:
        return _identifier(v)


class ResetPasswordSchema(BaseModel):
    identifier: str
    code: str
    newPassword: str
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("identifier")
    @classmethod
    def _who(cls, v: str) -> str:
        return _identifier(v)

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        v = re.sub(r"\s", "", v or "")
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("The code is six digits.")
        return v

    @field_validator("newPassword")
    @classmethod
    def _password(cls, v: str) -> str:
        if len(v) < 8 or len(v) > 64 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("The new password needs 8 to 64 characters, with a letter and a number.")
        return v


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
    # False for an account created with Google that has not added a password yet.
    hasPassword: bool = True

    model_config = ConfigDict(populate_by_name=True)


class PasswordSetSchema(BaseModel):
    """For an account with no password yet (it signed up with Google), so there is no current one to give."""
    newPassword: str

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("newPassword")
    @classmethod
    def validate_new(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("The password needs at least 8 characters, with a letter and a number.")
        return v


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
