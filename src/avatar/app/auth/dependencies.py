from __future__ import annotations

import re

from fastapi import Depends, Header, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from avatar.config import get_app_config, update_running_config

from .models import AuthenticatedUser
from .service import get_authenticated_user

bearer_scheme = HTTPBearer(auto_error=False)
AGENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


def resolve_user_id(current_user: AuthenticatedUser) -> str:
    """Convert the authenticated user into the config storage user id."""
    username = current_user.username.strip()
    if not username or username == "__avatar_guest__":
        return "default"
    return username


def normalize_agent_id(agent_id: str | None) -> str:
    """Validate the request agent id used for workspace isolation."""
    normalized_agent_id = (agent_id or "default").strip()
    if not normalized_agent_id:
        return "default"
    if not AGENT_ID_PATTERN.fullmatch(normalized_agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent ID may only contain letters, numbers, dots, underscores, and hyphens.",
        )
    return normalized_agent_id


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if not get_app_config().auth_enabled:
        return AuthenticatedUser(username="__avatar_guest__")

    access_token = request.query_params.get("access_token")

    if credentials is not None and credentials.scheme.lower() == "bearer":
        return get_authenticated_user(credentials.credentials)

    if access_token:
        return get_authenticated_user(access_token)

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")


def get_current_request_context(
    current_user: AuthenticatedUser = Depends(get_current_user),
    x_agent_id: str | None = Header(default=None, alias="X-Agent-ID"),
    query_agent_id: str | None = Query(default=None, alias="agent_id"),
) -> AuthenticatedUser:
    """Bind authenticated user and selected agent into the request context."""
    update_running_config(
        {
            "user_id": resolve_user_id(current_user),
            "agent_id": normalize_agent_id(x_agent_id or query_agent_id),
        },
    )
    return current_user
