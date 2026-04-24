from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from avatar.app.auth import AuthStatusResponse, AuthTokenResponse, AuthenticatedUser, LoginRequest, RegisterRequest, RegisteredUserResponse
from avatar.app.auth.dependencies import get_current_user
from avatar.app.auth.service import authenticate_user, register_user
from avatar.config import get_app_config

router = APIRouter(tags=["auth"])


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status() -> AuthStatusResponse:
    return AuthStatusResponse(enabled=get_app_config().auth_enabled)


@router.post("/register", response_model=RegisteredUserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> RegisteredUserResponse:
    if not get_app_config().auth_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication is disabled.")

    user = register_user(username=payload.username, password=payload.password)
    return RegisteredUserResponse(username=user.username)


@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: LoginRequest) -> AuthTokenResponse:
    if not get_app_config().auth_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication is disabled.")

    access_token = authenticate_user(username=payload.username, password=payload.password)
    return AuthTokenResponse(access_token=access_token)


@router.get("/me", response_model=AuthenticatedUser)
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    return current_user
