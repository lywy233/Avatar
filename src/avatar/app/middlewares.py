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

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Extract agentId from path/header and inject into context."""
        from ..config import RunningConfig, init_running_config

        logger = logging.getLogger(__name__)

        initial_running_config = RunningConfig(
            user_id="default",
            agent_id="default",
            session_id=await self._get_session_id(request),
        )
        init_running_config(initial_running_config)

        logger.debug(
            f"AgentContextMiddleware: running_config={initial_running_config} "
            f"from path={request.url.path}",
        )

        response = await call_next(request)
        return response
