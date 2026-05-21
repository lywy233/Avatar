"""
用户级配置类型，用于配置基于用户的配置信息，包含频道，
一些全局的偏好（对于用户的默认值，但会被智能体的配置覆盖）

不同于app config，user config 与app初始化无关，依赖于本地的配置，并持久化存储
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from .agent_config import AgentProfileRef, AgentsConfig, build_agent_workspace_dir
from .app_config import get_app_config
from .base_config import BaseJsonConfigManager


class UserConfigModel(BaseModel):
    """用户配置模型。"""

    model_config = ConfigDict(extra="allow")

    user_id: str = Field(..., description="用户唯一标识。")
    user_name: str = Field(..., description="用户名称。")
    user_type: str = Field(default="admin", description="用户类型。")
    user_root_path: Path = Field(..., description="用户工作空间根目录。")
    agents: AgentsConfig = Field(
        default_factory=AgentsConfig,
        description="用户拥有的智能体配置集合。",
    )


class UserConfigManager(BaseJsonConfigManager[UserConfigModel]):
    """用户配置管理器。

    该管理器基于 ``user_id`` 计算配置文件路径，并提供读取、
    设置并保存、强制重载等统一能力。
    """

    def __init__(self, user_id: str) -> None:
        """初始化用户配置管理器。

        Args:
            user_id: 用户唯一标识。
        """
        super().__init__()
        self.user_id = user_id

    @property
    def config_model(self) -> type[UserConfigModel]:
        """返回当前管理器绑定的配置模型类型。"""
        return UserConfigModel

    def get_config_path(self) -> Path:
        """根据 ``user_id`` 计算用户配置文件路径。"""
        return get_app_config().root_workspace / "users" / self.user_id / "config.json"

    def build_default_config(self) -> UserConfigModel:
        """构建指定用户的默认配置。"""
        app_config = get_app_config()
        return UserConfigModel(
            user_id=self.user_id,
            user_name=self.user_id,
            user_type="admin",
            user_root_path=app_config.agent_workspace / self.user_id,
            agents=AgentsConfig(
                profiles={
                    "default": AgentProfileRef(
                        id="default",
                        name="default",
                        workspace_dir=str(build_agent_workspace_dir(self.user_id, "default")),
                    ),
                },
            ),
        )

    def load_config(self) -> UserConfigModel:
        """Load user config and normalize agent workspace paths."""
        user_config = super().load_config()
        normalized_config = self._normalize_workspace_paths(user_config)
        if normalized_config != user_config:
            return self.save_config(normalized_config)
        return user_config

    def _normalize_workspace_paths(self, user_config: UserConfigModel) -> UserConfigModel:
        """Keep persisted user and agent paths on the canonical workspace tree."""
        normalized_config = user_config.model_copy(deep=True)
        app_config = get_app_config()
        normalized_config.user_root_path = app_config.agent_workspace / self.user_id

        for agent_id, agent_ref in normalized_config.agents.profiles.items():
            agent_ref.workspace_dir = str(build_agent_workspace_dir(self.user_id, agent_id))

        return normalized_config

UserConfig = UserConfigModel


def get_user_config_manager(user_id: str = "default") -> UserConfigManager:
    """创建用户配置管理器。

    Args:
        user_id: 用户唯一标识。

    Returns:
        对应的用户配置管理器实例。
    """
    return UserConfigManager(user_id=user_id)


def build_default_user_config(user_id: str = "default") -> UserConfig:
    """构建指定用户的默认配置。"""
    return get_user_config_manager(user_id).build_default_config()


def init_user_config(user_id: str = "default") -> UserConfig:
    """初始化并持久化指定用户的默认配置。"""
    return save_user_config(user_id, build_default_user_config(user_id))


def save_user_config(user_id: str, user_config: UserConfig) -> UserConfig:
    """保存用户配置到持久化存储。"""
    return get_user_config_manager(user_id).save_config(user_config)


def load_user_config(user_id: str = "default") -> UserConfig:
    """从持久化存储加载用户配置。"""
    return get_user_config_manager(user_id).load_config()
