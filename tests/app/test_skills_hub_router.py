from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from avatar.app._app import app
from avatar.config.app_config import AppConfig, app_config, get_app_config


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_skills_hub_auth(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AVATAR_AUTH_ENABLED", "false")
    get_app_config.cache_clear()
    app_config.set(AppConfig())
    yield
    get_app_config.cache_clear()
    app_config.set(AppConfig())


def test_list_skills_returns_expected_shape() -> None:
    response = client.get("/api/skills-hub/skills")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] >= 1
    assert payload["items"]
    first = payload["items"][0]
    assert {"id", "slug", "name", "category", "difficulty", "tags"}.issubset(first)
    assert {"categories", "difficulties", "tags"} == set(payload["filters"])


def test_list_skills_supports_filters() -> None:
    response = client.get(
        "/api/skills-hub/skills",
        params={"category": "Operations", "difficulty": "Advanced"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] >= 1
    assert all(item["category"] == "Operations" for item in payload["items"])
    assert all(item["difficulty"] == "Advanced" for item in payload["items"])


def test_get_skill_detail_returns_full_record() -> None:
    response = client.get("/api/skills-hub/skills/prompt-optimizer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["slug"] == "prompt-optimizer"
    assert payload["description"]
    assert payload["use_cases"]


def test_get_skill_detail_returns_404_for_unknown_slug() -> None:
    response = client.get("/api/skills-hub/skills/does-not-exist")

    assert response.status_code == 404
    assert response.json()["detail"] == "Skill 'does-not-exist' was not found."
