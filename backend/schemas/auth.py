from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str

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


class LoginSchema(BaseModel):
    email: EmailStr
    password: str

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

    model_config = ConfigDict(populate_by_name=True)
