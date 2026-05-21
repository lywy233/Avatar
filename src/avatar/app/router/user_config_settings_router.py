"""
此处处理用户可配置的设置，基于用户进行配置
例如用户的模型provider
用户的偏好设置

配置内容为user_config中的内容

实现userconfig中 预览和修改功能
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Query

from avatar.app.auth.dependencies import get_current_user, resolve_user_id
from avatar.app.auth.models import AuthenticatedUser
from avatar.config.agent_config import load_agent_config, save_agent_config
from avatar.config.user_config import UserConfig, load_user_config, save_user_config

router = APIRouter(
    tags=["user_settings"],
)


@router.get("/user-config", response_model=dict[str, Any])
def get_user_config_settings(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """读取当前用户的完整用户配置。"""
    user_config = load_user_config(resolve_user_id(current_user))
    return user_config.model_dump(mode="json")


@router.put("/user-config", response_model=dict[str, Any])
def put_user_config_settings(
    payload: dict[str, Any] = Body(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """覆写当前用户的完整用户配置。"""
    user_id = resolve_user_id(current_user)
    user_config = save_user_config(user_id, UserConfig.model_validate(payload))
    return user_config.model_dump(mode="json")


@router.get("/agent-config", response_model=dict[str, Any])
def get_agent_config_settings(
    agent_id: str = Query(default="default", min_length=1),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """读取当前用户指定智能体的完整配置。"""
    agent_config = load_agent_config(
        agent_id=agent_id,
        user_id=resolve_user_id(current_user),
    )
    return agent_config.model_dump(mode="json")


@router.put("/agent-config", response_model=dict[str, Any])
def put_agent_config_settings(
    payload: dict[str, Any] = Body(...),
    agent_id: str = Query(default="default", min_length=1),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """覆写当前用户指定智能体的完整配置。"""
    agent_config = save_agent_config(
        agent_id=agent_id,
        agent_config=payload,
        user_id=resolve_user_id(current_user),
    )
    return agent_config.model_dump(mode="json")
