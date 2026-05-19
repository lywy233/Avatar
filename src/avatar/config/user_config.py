"""
用户级配置类型，用于配置基于用户的配置信息，包含频道，
一些全局的偏好（对于用户的默认值，但会被智能体的配置覆盖）

不同于app config，user config 与app初始化无关，依赖于本地的配置，并持久化存储
"""

from __future__ import annotations
import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from .app_config import get_app_config
from .agent_config import AgentsConfig

class UserConfig(BaseModel):
    """用户级配置信息"""

    model_config = ConfigDict(extra="allow")  # pydantic保留类型，用于存储和绑定

    user_id: str = Field(..., description="用户id,用户的唯一标识")
    user_name: str = Field(..., description="用户名称,用户的名字")
    user_type: str = Field(..., description="用户类型，用于区分管理员等权限信息")
    user_root_path: Path = Field(
        ..., description="用户工作空间，指定的目录，用户的智能体的工作空间相对于这个地址深入，用于限制用户和模型的可操作范围"
    )
    agents:AgentsConfig = Field(default_factory=AgentsConfig,description="用户所有的agent 配置信息")


def _get_user_config_path(user_id: str) -> Path:
    """返回指定用户的配置文件路径。"""
    return get_app_config().root_workspace / "users" / user_id / "config.json"


def build_default_user_config(user_id: str = "default") -> UserConfig:
    """构建默认用户配置。"""
    app_config = get_app_config()
    return UserConfig(
        user_id=user_id,
        user_name=user_id,
        user_type="admin",
        user_root_path=app_config.agent_workspace / user_id,
    )


def init_user_config(user_id: str = "default") -> UserConfig:
    """初始化并持久化指定用户的默认配置。"""
    user_config = build_default_user_config(user_id)
    return save_user_config(user_id, user_config)


def save_user_config(user_id: str, user_config: UserConfig) -> UserConfig:
    """保存用户配置到本地 JSON 文件。"""
    user_config_path = _get_user_config_path(user_id)
    user_config_path.parent.mkdir(parents=True, exist_ok=True)

    with user_config_path.open("w", encoding="utf-8") as file:
        json.dump(
            user_config.model_dump(mode="json"),
            file,
            ensure_ascii=False,
            indent=2,
        )

    return user_config


def load_user_config(user_id: str = "default") -> UserConfig:
    """从本地 JSON 文件加载用户配置。"""
    user_config_path = _get_user_config_path(user_id)
    if not user_config_path.exists():
        if user_id == "default":
            return init_user_config(user_id)
        raise FileNotFoundError(f"User config not found: {user_config_path}")

    with user_config_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    return UserConfig.model_validate(payload)


def load_config(user_id: str = "default") -> UserConfig:
    """兼容旧调用方式，转发到 ``load_user_config``。"""
    return load_user_config(user_id)



def load_agent_config(agent_id:str,user_id: str = "default") -> UserConfig:
    """兼容旧调用方式，转发到 ``load_user_config``。"""
    return load_user_config(user_id).agents.profiles.get(agent_id)

