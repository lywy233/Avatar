# -*- coding: utf-8 -*-
"""Agent-scoped router that wraps existing routers under /agents/{agentId}/

This provides agent isolation by injecting agentId into request.state,
allowing downstream APIs to access the correct agent context.
"""
import logging

from fastapi import APIRouter, Request
from starlette.middleware.base import (
    BaseHTTPMiddleware,
    RequestResponseEndpoint,
)
from starlette.responses import Response


class AgentContextMiddleware(BaseHTTPMiddleware):
    """Middleware to inject agentId into request.state."""

    async def _get_session_id(self, request: Request) -> str:
        """Safely extract session_id from JSON body when available."""
        default_session_id = "session_default"

        try:
            payload = await request.json()
        except Exception:
            return default_session_id

        if not isinstance(payload, dict):
            return default_session_id

        session_id = payload.get("session_id", default_session_id)
        return session_id if isinstance(session_id, str) and session_id else default_session_id

    def _get_agent_id(self, request: Request) -> str:
        """Extract the selected agent id from request headers or query."""
        from .auth.dependencies import normalize_agent_id

        return normalize_agent_id(
            request.headers.get("X-Agent-ID") or request.query_params.get("agent_id"),
        )

    def _get_user_id(self, request: Request) -> str:
        """Best-effort authenticated user lookup for request context."""
        from ..config import get_app_config
        from .auth.dependencies import resolve_user_id
        from .auth.models import AuthenticatedUser
        from .auth.service import get_authenticated_user

        if not get_app_config().auth_enabled:
            return "default"

        authorization = request.headers.get("Authorization", "")
        access_token = request.query_params.get("access_token")
        if authorization.lower().startswith("bearer "):
            access_token = authorization[7:].strip()

        if not access_token:
            return "default"

        try:
            return resolve_user_id(get_authenticated_user(access_token))
        except Exception:
            return resolve_user_id(AuthenticatedUser(username="__avatar_guest__"))

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Extract agentId from path/header and inject into context."""
        from ..config import RunningConfig, init_running_config

        logger = logging.getLogger(__name__)
        
        # 使得所有经过中间件的请求都能获得运行时配置
        initial_running_config = RunningConfig(
            user_id=self._get_user_id(request),
            agent_id=self._get_agent_id(request),
            session_id=await self._get_session_id(request),
        )
        init_running_config(initial_running_config)

        logger.debug(
            f"AgentContextMiddleware: running_config={initial_running_config} "
            f"from path={request.url.path}",
        )

        response = await call_next(request)
        return response
