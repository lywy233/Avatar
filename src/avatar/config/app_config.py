from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal
from contextvars import ContextVar
from pathlib import Path

app_config: ContextVar[AppConfig] = ContextVar(
    "app_config"
)

class AppConfig(BaseSettings):
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
    
    root_workspace: Path = Field(
        default=".avatar",
        description="日志存储地址"
    )
    
    log_level: Literal["critical", "error", "warning", "info", "debug"] = Field(
        default="info",
        description="日志等级"
    )
    
    log_path: Path = Field(
        default=".avatar/log/avatar.log",
        description="日志存储地址"
    )
    
    
    auth_jwt_secret: str = Field(
        default="avatar-local-dev-secret",
        description="Shared secret used to sign local JWT access tokens for the auth router.",
    )
    auth_enabled: bool = Field(
        default=False,
        description="Whether the auth router and frontend login flow are enabled for the application.",
    )
    auth_access_token_expire_minutes: int = Field(
        default=60,
        ge=1,
        le=1440,
        description="Lifetime in minutes for locally issued auth router access tokens.",
    )
    
    # TODO running_config 临时存储为json，后续改为数据库存储
    
    running_config_path:Path = Field(
        default=".avatar/running-config.json",
        description="用于临时存储runningconfig,后续改为可改的内存级配置",
    )

    user_config_path:Path = Field(
        default=".avatar/user-config.json",
        description="用于临时存储用户配置，后续改为可改的数据库内配置",
    )
    
    # TODO 下方的后续加入到runningconfig中
    model_name: str = Field(
        default="gpt-4o-mini",
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
        default=True,
        description="Whether the default AgentScope chat model should stream responses.",
    )
    media_storage_path: Path = Field(
        default=".avatar/media",
        description="Default directory used by file upload and preview endpoints when no UI override is saved.",
    )

@lru_cache(maxsize=1)
def get_app_config() -> AppConfig:
    """
    Return a cached settings instance for the current process.
    app config 每次完全重启才能更新
    """
    
    # return app_config.get()
    # 首次会初始化app_config 并注入上下文变量
    try:
        return app_config.get()
    except LookupError:
        config = AppConfig()  # 初始化
        app_config.set(config)
        return config
