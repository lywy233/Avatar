"""
用户级配置类型，用于配置基于用户的配置信息，包含频道，
一些全局的偏好（对于用户的默认值，但会被智能体的配置覆盖）

"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from contextvars import ContextVar

user_config: ContextVar[UserConfig] = ContextVar(
    "user_config",
    default=None,
)


class UserConfig(BaseModel):
    """用户级配置信息"""

    model_config = ConfigDict(extra="allow") # pydantic保留类型，用于存储和绑定

    user_id: str = Field(..., description="用户id,用户的唯一标识")
    user_name: str = Field(..., description="用户名称,用户的名字")
    user_type: str = Field(..., description="用户类型，用于区分管理员等权限信息")
    user_workspace_dir: str = Field(
        ..., description="用户工作空间，指定的目录，用户的智能体的工作空间相对于这个地址深入，用于限制用户和模型的可操作范围"
    )


def get_user_config() -> UserConfig:
    """获取当前运行配置"""
    return user_config.get()


def set_user_config(config: UserConfig) -> None:
    """设置运行配置(如有必要后续区分为进程中设置和持久化设置)"""
    user_config.set(config)
    
    
def save_user_config() -> None:
    """获取当前运行配置"""
    return user_config.get()


def load_user_config() -> None:
    """
    获取运行时配置
    """
    
    
    

