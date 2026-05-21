from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from avatar.app._app import app
from avatar.config.app_config import AppConfig, app_config, get_app_config


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_skills_hub_auth(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("AVATAR_AUTH_ENABLED", "false")
    get_app_config.cache_clear()
    app_config.set(AppConfig())
    write_skill_fixture(tmp_path, "prompt-optimizer", "Prompt Optimizer")
    yield
    get_app_config.cache_clear()
    app_config.set(AppConfig())


def test_list_skills_returns_expected_shape() -> None:
    response = client.get("/api/skills-hub/skills")

    assert response.status_code == 200
    payload = response.json()
    assert payload["skills"]
    first = payload["skills"][0]
    assert {"name", "description", "metadata", "skill_dir"}.issubset(first)
    assert first["name"] == "prompt-optimizer"
    assert Path(".avatar/skill-hub/skills-manifest.json").is_file()
    assert Path(".avatar/skill-hub/skills/prompt-optimizer/SKILL.md").is_file()


def test_get_skill_detail_returns_full_record() -> None:
    response = client.get("/api/skills-hub/skills/prompt-optimizer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "prompt-optimizer"
    assert payload["description"]
    assert payload["skill_dir"].endswith(".avatar/skill-hub/skills/prompt-optimizer")


def test_get_skill_detail_returns_404_for_unknown_slug() -> None:
    response = client.get("/api/skills-hub/skills/does-not-exist")

    assert response.status_code == 404
    assert response.json()["detail"] == "Skill 'does-not-exist' was not found."


def write_skill_fixture(tmp_path: Path, skill_name: str, title: str) -> None:
    skill_dir = tmp_path / ".avatar" / "skill-hub" / "skills" / skill_name
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        "\n".join(
            [
                "---",
                f"name: {skill_name}",
                f"description: {title} helps improve prompts.",
                "---",
                "",
                f"# {title}",
                "",
                "Use this skill to improve prompt quality.",
            ],
        ),
        encoding="utf-8",
    )
