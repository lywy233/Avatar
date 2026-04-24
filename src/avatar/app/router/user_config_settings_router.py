"""
此处处理用户可配置的设置，基于用户进行配置
例如用户的模型provider
用户的偏好设置

配置内容为user_config中的内容

实现userconfig中 预览和修改功能
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from avatar.config.user_config import (
    UserConfig,
)

router = APIRouter(
    tags=["user_settings"]
    )