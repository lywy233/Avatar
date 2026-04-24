from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from avatar.config import get_app_config

from .models import AuthenticatedUser
from .service import get_authenticated_user

bearer_scheme = HTTPBearer(auto_error=False)


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
