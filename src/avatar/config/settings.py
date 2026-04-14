from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="AVATAR_",
        extra="ignore",
    )

    port: int = Field(
        default=18888,
        ge=1,
        le=65535,
        description="Port used by the local FastAPI server when no CLI port is provided.",
    )
    model_name: str = Field(
        default="gpt-4.1-mini",
        description="AgentScope chat model name used by AvatarReactAgent when no custom model is provided.",
    )
    api_key: str | None = Field(
        default=None,
        description="API key passed to the default AgentScope chat model.",
    )
    base_url: str | None = Field(
        default=None,
        description="Base URL for an OpenAI-compatible API endpoint, such as a proxy or self-hosted gateway.",
    )
    model_stream: bool = Field(
        default=False,
        description="Whether the default AgentScope chat model should stream responses.",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance for the current process."""

    return Settings()
