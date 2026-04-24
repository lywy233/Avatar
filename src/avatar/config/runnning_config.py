"""运行配置模型定义与持久化。"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from .app_config import get_app_config
from contextvars import ContextVar

# RUNNING_CONFIG_PATH = Path(".avatar/running-config.json")

running_config: ContextVar[RunningConfig] = ContextVar("running_config")


class ModelProviderConfig(BaseModel):
    """模型提供方配置。"""

    model_config = ConfigDict(extra="allow")

    # 提供商和id唯一区分了模型
    provider_name: str = Field(default="openai")
    model_id: str = Field(
        default="gpt-4o-mini", description="模型id,用于唯一区分模型的id"
    )

    model_name: str = Field(default="gpt-4o-mini")
    base_url: str | None = Field(default=None)
    api_key: str | None = Field(default=None)

    extra_config: dict = Field(
        default_factory=dict, description="额外配置,会注入到请求体中,如温度，maxtoken等"
    )


def build_default_model_config() -> ModelProviderConfig:
    """从应用设置构建默认模型配置。"""
    app_config = get_app_config()
    # TODO 暂时继承app_config,后续改为继承user_config
    return ModelProviderConfig(
        provider_name="openai",
        base_url=app_config.base_url,
        api_key=app_config.api_key,
        model_name=app_config.model_name,
    )


class RunningConfig(BaseModel):
    """
    运行配置。
    暂时预计包含
    智能体设置
    模型配置
    用户权限信息
    """

    model_config = ConfigDict(extra="allow")

    model_provider_config: ModelProviderConfig = Field(
        default_factory=build_default_model_config
    )

    agent_id: str = Field(default="default")
    user_id: str = Field(default="default_user")
    session_id: str = Field(default="session_001")

    # 还有智能体的工具开关设置，智能体的临时权限设置

    # 个性化的智能体设置
    max_iters: int = Field(default=10, ge=1)


def get_running_config() -> RunningConfig:
    """获取当前运行配置"""
    return running_config.get()


def set_running_config(config: RunningConfig) -> None:
    """设置运行配置"""
    running_config.set(config)


def _get_running_config_path() -> Path:
    return Path(get_app_config().running_config_path)


def load_persisted_running_config() -> RunningConfig:
    """Load the persisted running config from disk, falling back to defaults."""
    config_path = _get_running_config_path()
    if not config_path.exists():
        return RunningConfig()

    with config_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    return RunningConfig.model_validate(payload)


def save_persisted_running_config(config: RunningConfig) -> RunningConfig:
    """Persist the running config to disk and refresh the process context."""
    config_path = _get_running_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w", encoding="utf-8") as file:
        json.dump(config.model_dump(mode="json"), file, ensure_ascii=False, indent=2)

    set_running_config(config)
    return config
