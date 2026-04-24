from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("Username cannot be blank.")
        if len(normalized_value) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        return normalized_value


class LoginRequest(RegisterRequest):
    pass


class RegisteredUserResponse(BaseModel):
    username: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthStatusResponse(BaseModel):
    enabled: bool


class AuthenticatedUser(BaseModel):
    username: str


class StoredUserRecord(BaseModel):
    username: str
    password_hash: str
    password_salt: str


class AuthState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[StoredUserRecord] = Field(default_factory=list)
