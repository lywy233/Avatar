from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from avatar.app._app import app
from avatar.config.app_config import AppConfig, app_config, get_app_config


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_file_system_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("AVATAR_AUTH_ENABLED", "false")
    get_app_config.cache_clear()
    app_config.set(AppConfig())
    yield
    get_app_config.cache_clear()
    app_config.set(AppConfig())


def set_auth_enabled(monkeypatch: pytest.MonkeyPatch, enabled: bool) -> None:
    monkeypatch.setenv("AVATAR_AUTH_ENABLED", "true" if enabled else "false")
    get_app_config.cache_clear()
    app_config.set(AppConfig())


def create_auth_headers() -> dict[str, str]:
    register_response = client.post(
        "/api/auth/register",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/auth/login",
        json={"username": "demo-user", "password": "strong-pass-123"},
    )
    assert login_response.status_code == 200

    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def test_file_system_routes_require_auth_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, True)

    response = client.get("/api/file-system/entries")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required."


def test_file_system_routes_allow_authenticated_access_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, True)
    headers = create_auth_headers()

    response = client.get("/api/file-system/entries", headers=headers)

    assert response.status_code == 200
    assert response.json()["current_path"] == "."


def test_file_preview_accepts_query_access_token_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    set_auth_enabled(monkeypatch, True)
    headers = create_auth_headers()

    upload_response = client.post(
        "/api/file-system/upload",
        headers=headers,
        files={"file": ("demo.txt", b"hello avatar", "text/plain")},
    )
    assert upload_response.status_code == 200

    access_token = headers["Authorization"].removeprefix("Bearer ")
    preview_response = client.get(
        "/api/file-system/preview",
        params={
            "path": upload_response.json()["relative_path"],
            "access_token": access_token,
        },
    )

    assert preview_response.status_code == 200
    assert preview_response.content == b"hello avatar"


def test_upload_and_preview_file_uses_configured_media_dir() -> None:
    upload_response = client.post(
        "/api/file-system/upload",
        files={"file": ("demo.txt", b"hello avatar", "text/plain")},
    )

    assert upload_response.status_code == 200
    payload = upload_response.json()
    assert payload["name"] == "demo.txt"
    assert payload["media_kind"] == "file"
    assert payload["relative_path"] == "demo.txt"

    stored_file = get_default_media_root() / payload["relative_path"]
    assert stored_file.read_bytes() == b"hello avatar"

    preview_response = client.get("/api/file-system/preview", params={"path": payload["relative_path"]})
    assert preview_response.status_code == 200
    assert preview_response.content == b"hello avatar"
    assert preview_response.headers["content-type"].startswith("text/plain")


def test_upload_supports_existing_nested_directory_path() -> None:
    nested_dir = get_default_media_root() / "nested"
    nested_dir.mkdir(parents=True, exist_ok=True)

    upload_response = client.post(
        "/api/file-system/upload",
        data={"path": "nested"},
        files={"file": ("inside.txt", b"inside nested", "text/plain")},
    )

    assert upload_response.status_code == 200
    payload = upload_response.json()

    assert payload["relative_path"] == "nested/inside.txt"
    stored_file = get_default_media_root() / payload["relative_path"]
    assert stored_file.read_bytes() == b"inside nested"


def test_upload_rejects_missing_nested_directory_path() -> None:
    upload_response = client.post(
        "/api/file-system/upload",
        data={"path": "nested"},
        files={"file": ("missing.txt", b"missing nested", "text/plain")},
    )

    assert upload_response.status_code == 404
    assert upload_response.json()["detail"] == "Requested upload directory was not found."


def test_upload_rejects_file_path_target() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    (media_root / "target.txt").write_text("not a directory", encoding="utf-8")

    upload_response = client.post(
        "/api/file-system/upload",
        data={"path": "target.txt"},
        files={"file": ("demo.txt", b"hello avatar", "text/plain")},
    )

    assert upload_response.status_code == 400
    assert upload_response.json()["detail"] == "Requested upload path must point to a directory."


def test_upload_uses_unique_filename_when_target_exists() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    (media_root / "keep.txt").write_text("existing", encoding="utf-8")

    upload_response = client.post(
        "/api/file-system/upload",
        files={"file": ("keep.txt", b"stable preview", "text/plain")},
    )

    assert upload_response.status_code == 200
    payload = upload_response.json()
    assert payload["relative_path"] == "keep-1.txt"
    assert (media_root / "keep-1.txt").read_bytes() == b"stable preview"


def test_list_entries_returns_root_directory_contents() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    (media_root / "nested").mkdir()
    (media_root / "alpha.txt").write_text("alpha", encoding="utf-8")

    response = client.get("/api/file-system/entries")

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_path"] == "."
    assert payload["parent_path"] is None
    assert payload["root_path"] == "."
    assert payload["entry_count"] == 2
    assert [entry["name"] for entry in payload["entries"]] == ["nested", "alpha.txt"]
    assert payload["entries"][0]["entry_type"] == "directory"
    assert payload["entries"][1]["entry_type"] == "file"
    assert payload["entries"][1]["relative_path"] == "alpha.txt"


def test_list_entries_returns_nested_directory_contents() -> None:
    nested_dir = get_default_media_root() / "nested"
    nested_dir.mkdir(parents=True, exist_ok=True)
    (nested_dir / "inside.txt").write_text("inside", encoding="utf-8")

    response = client.get("/api/file-system/entries", params={"path": "nested"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["current_path"] == "nested"
    assert payload["parent_path"] == "."
    assert payload["entry_count"] == 1
    assert payload["entries"][0]["name"] == "inside.txt"
    assert payload["entries"][0]["relative_path"] == "nested/inside.txt"


def test_list_entries_rejects_path_outside_media_root() -> None:
    response = client.get("/api/file-system/entries", params={"path": "../outside-root"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Requested path must stay within the configured media directory."


def test_download_file_returns_attachment_response() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    target_file = media_root / "download.txt"
    target_file.write_text("download me", encoding="utf-8")

    response = client.get("/api/file-system/download", params={"path": "download.txt"})

    assert response.status_code == 200
    assert response.content == b"download me"
    assert response.headers["content-disposition"].startswith("attachment;")
    assert "download.txt" in response.headers["content-disposition"]


def test_download_rejects_directory_paths() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    (media_root / "nested").mkdir()

    response = client.get("/api/file-system/download", params={"path": "nested"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Requested path must point to a file."


def test_preview_file_returns_inline_response() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    target_file = media_root / "preview.txt"
    target_file.write_text("preview me", encoding="utf-8")

    response = client.get("/api/file-system/preview", params={"path": "preview.txt"})

    assert response.status_code == 200
    assert response.content == b"preview me"
    assert response.headers["content-disposition"].startswith("inline;")


def test_preview_rejects_directory_paths() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    (media_root / "nested").mkdir()

    response = client.get("/api/file-system/preview", params={"path": "nested"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Requested path must point to a file."


def test_preview_rejects_path_outside_media_root() -> None:
    response = client.get("/api/file-system/preview", params={"path": "../outside-root"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Requested path must stay within the configured media directory."


def test_preview_supports_filenames_with_trailing_spaces() -> None:
    media_root = get_default_media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    target_file = media_root / "note.txt "
    target_file.write_text("space suffix", encoding="utf-8")

    response = client.get("/api/file-system/preview", params={"path": "note.txt "})

    assert response.status_code == 200
    assert response.content == b"space suffix"


def test_delete_file_removes_uploaded_file_by_relative_path() -> None:
    upload_response = client.post(
        "/api/file-system/upload",
        files={"file": ("trash.txt", b"delete me", "text/plain")},
    )
    payload = upload_response.json()

    delete_response = client.delete("/api/file-system/delete", params={"path": payload["relative_path"]})

    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"
    assert not (get_default_media_root() / payload["relative_path"]).exists()


def test_delete_rejects_path_outside_media_root() -> None:
    response = client.delete("/api/file-system/delete", params={"path": "../outside-root"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Requested path must stay within the configured media directory."


def get_working_directory() -> Path:
    return Path.cwd()


def get_default_media_root() -> Path:
    return get_working_directory() / ".avatar" / "media"
