from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from avatar.app._app import app
from avatar.config.app_config import AppConfig, app_config, get_app_config


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_auth_state(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("AVATAR_AUTH_ENABLED", "true")
    get_app_config.cache_clear()
    app_config.set(AppConfig())
    yield
    get_app_config.cache_clear()
    app_config.set(AppConfig())


def set_auth_enabled(monkeypatch: pytest.MonkeyPatch, enabled: bool) -> None:
    monkeypatch.setenv("AVATAR_AUTH_ENABLED", "true" if enabled else "false")
    get_app_config.cache_clear()
    app_config.set(AppConfig())


def test_auth_status_reports_enabled_state(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, True)

    response = client.get("/api/auth/status")

    assert response.status_code == 200
    assert response.json() == {"enabled": True}


def test_auth_status_reports_disabled_state(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, False)

    response = client.get("/api/auth/status")

    assert response.status_code == 200
    assert response.json() == {"enabled": False}


def test_register_rejects_when_auth_is_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, False)

    response = client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Authentication is disabled."


def test_login_rejects_when_auth_is_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, False)

    response = client.post(
        "/api/auth/login",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Authentication is disabled."


def test_register_creates_local_account() -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    assert response.status_code == 201
    assert response.json() == {"username": "demo-user"}

    auth_state_path = Path(".avatar/auth-state.json")
    assert auth_state_path.exists()
    persisted = json.loads(auth_state_path.read_text(encoding="utf-8"))
    assert persisted["users"][0]["username"] == "demo-user"
    assert persisted["users"][0]["password_hash"]
    assert persisted["users"][0]["password_salt"]


def test_register_rejects_duplicate_username() -> None:
    client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    response = client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "another-pass-456"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username already exists."


def test_register_rejects_short_username_after_trimming() -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": "  ab  ", "password": "strong-pass-123"},
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, Username must be at least 3 characters long."


def test_login_returns_bearer_token_for_valid_credentials() -> None:
    client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    response = client.post(
        "/api/auth/login",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert isinstance(payload["access_token"], str)
    assert payload["access_token"].count(".") == 2


def test_login_rejects_invalid_password() -> None:
    client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    response = client.post(
        "/api/auth/login",
        json={"username": "demo-user", "password": "wrong-pass-456"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_me_requires_login() -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required."


def test_me_returns_guest_user_when_auth_is_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, False)

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json() == {"username": "__avatar_guest__"}


def test_me_rejects_invalid_token() -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid access token."


def test_me_returns_authenticated_user_for_valid_token() -> None:
    client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )
    login_response = client.post(
        "/api/auth/login",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json() == {"username": "demo-user"}
