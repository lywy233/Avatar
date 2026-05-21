"""运行配置模型定义与上下文继承。

这类配置是临时生效的，包含 agent id、user id、session id 等，
使用 ``ContextVar`` 进行请求级存储与读取。
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .app_config import get_app_config
from .base_config import BaseContextConfigManager

running_config_var: ContextVar["RunningConfig | None"] = ContextVar(
    "running_config_var",
    default=None,
)


class ModelProviderConfig(BaseModel):
    """模型提供方配置。"""

    model_config = ConfigDict(extra="allow")

    provider_name: str = Field(default="openai")
    model_id: str = Field(
        default="gpt-4o-mini",
        description="模型 id，用于唯一区分具体模型。",
    )
    model_name: str = Field(default="gpt-4o-mini")
    base_url: str | None = Field(default=None)
    api_key: str | None = Field(default=None)
    extra_config: dict[str, Any] = Field(
        default_factory=dict,
        description="额外配置，会注入到请求体中，如温度、max token 等。",
    )


def build_default_model_config() -> ModelProviderConfig:
    """从应用设置构建默认模型配置。

    Returns:
        ModelProviderConfig: 默认模型配置。
    """
    app_config = get_app_config()
    return ModelProviderConfig(
        provider_name="openai",
        base_url=app_config.base_url,
        api_key=app_config.api_key,
        model_name=app_config.model_name,
    )


class RunningConfig(BaseModel):
    """运行配置。

    当前用于承载运行时临时生效的上下文配置。
    """

    model_config = ConfigDict(extra="allow")

    model_provider_config: ModelProviderConfig = Field(
        default_factory=build_default_model_config,
    )
    agent_id: str = Field(default="default")
    user_id: str = Field(default="default")
    session_id: str = Field(default="session_default")
    max_iters: int = Field(default=10, ge=1)


class RunningConfigManager(BaseContextConfigManager[RunningConfig]):
    """运行配置管理器。"""

    @property
    def config_model(self) -> type[RunningConfig]:
        """返回当前管理器绑定的配置模型类型。"""
        return RunningConfig

    def build_default_config(self) -> RunningConfig:
        """构建默认运行配置。

        Returns:
            RunningConfig: 默认运行配置对象。
        """
        return RunningConfig()

    def get_context_var(self) -> ContextVar[RunningConfig | None]:
        """返回运行配置绑定的上下文变量。"""
        return running_config_var

    def update_config(self, patch: RunningConfig | dict[str, Any]) -> RunningConfig:
        """对当前运行配置进行增量更新。

        Args:
            patch: 配置对象或部分字段字典。

        Returns:
            RunningConfig: 更新后的运行配置。
        """
        current_config = self.get_config()
        if isinstance(patch, RunningConfig):
            return self.save_config(patch)

        updated_config = current_config.model_copy(update=patch)
        return self.save_config(updated_config)


def get_running_config_manager() -> RunningConfigManager:
    """创建运行配置管理器。

    Returns:
        RunningConfigManager: 运行配置管理器实例。
    """
    return RunningConfigManager()


def build_default_running_config() -> RunningConfig:
    """构建默认运行配置。

    Returns:
        RunningConfig: 默认运行配置对象。
    """
    return get_running_config_manager().build_default_config()


def init_running_config(
    config: RunningConfig | dict[str, Any] | None = None,
) -> RunningConfig:
    """初始化当前上下文的运行配置。

    Args:
        config: 可选的初始配置对象或字典。为空时使用默认值。

    Returns:
        RunningConfig: 初始化后的运行配置。
    """
    if config is None:
        return get_running_config_manager().save_config(build_default_running_config())
    return get_running_config_manager().set_config(config)


def get_running_config() -> RunningConfig:
    """获取当前运行配置。

    Returns:
        RunningConfig: 当前上下文中的运行配置。
    """
    return get_running_config_manager().get_config()


def set_running_config(config: RunningConfig | dict[str, Any]) -> RunningConfig:
    """整体设置当前运行配置。

    Args:
        config: 运行配置对象或配置字典。

    Returns:
        RunningConfig: 设置后的运行配置。
    """
    return get_running_config_manager().set_config(config)


def update_running_config(config: RunningConfig | dict[str, Any]) -> RunningConfig:
    """增量更新当前运行配置。

    Args:
        config: 运行配置对象或局部字段字典。

    Returns:
        RunningConfig: 更新后的运行配置。
    """
    return get_running_config_manager().update_config(config)
