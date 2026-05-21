from __future__ import annotations

import mimetypes
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from avatar.config import get_app_config, get_running_config
from avatar.config.agent_config import build_agent_workspace_dir

router = APIRouter(tags=["file-system"])

FILENAME_SANITIZER = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
FILENAME_WHITESPACE = re.compile(r"\s+")
MAX_UPLOAD_SIZE = 20 * 1024 * 1024

class FileUploadResponse(BaseModel):
    relative_path: str
    name: str
    content_type: str
    size: int
    media_kind: str
    file_url: str | None = None


class FileSystemEntry(BaseModel):
    name: str
    relative_path: str
    entry_type: str
    size: int | None = None
    modified_at: str
    content_type: str | None = None


class FileSystemEntriesResponse(BaseModel):
    current_path: str
    parent_path: str | None
    root_path: str
    entry_count: int
    entries: list[FileSystemEntry]


class FileSystemSettingsResponse(BaseModel):
    media_dir: str
    resolved_media_dir: str
    default_media_dir: str
    source: str


@router.get("/settings", response_model=FileSystemSettingsResponse)
async def get_file_system_settings() -> FileSystemSettingsResponse:
    """Return the current request's agent workspace root."""
    media_root = get_current_agent_workspace_root()
    media_root.mkdir(parents=True, exist_ok=True)
    media_root_label = format_project_relative_path(media_root)
    return FileSystemSettingsResponse(
        media_dir=media_root_label,
        resolved_media_dir=str(media_root.resolve()),
        default_media_dir=media_root_label,
        source="agent-workspace",
    )

@router.post("/upload", response_model=FileUploadResponse)
async def upload_media_file(
    file: UploadFile = File(...),
    path: str | None = Form(default=None),
) -> FileUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    media_root = get_current_agent_workspace_root()
    resolved_media_dir = resolve_upload_directory(media_root, path)

    try:
        resolved_media_dir.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to prepare media directory: {error}",
        ) from error

    original_content_type = mimetypes.guess_type(file.filename)[0]
    content_type = original_content_type or file.content_type or "application/octet-stream"
    safe_filename = sanitize_upload_filename(file.filename, content_type)
    destination = build_upload_destination(resolved_media_dir, safe_filename)

    try:
        total_written = 0
        with destination.open("wb") as handle:
            while chunk := await file.read(1024 * 1024):
                total_written += len(chunk)
                if total_written > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Uploaded file exceeds the {MAX_UPLOAD_SIZE // (1024 * 1024)}MB limit.",
                    )
                handle.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except OSError as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Unable to save uploaded file: {error}") from error
    finally:
        await file.close()

    relative_path = format_media_relative_path(media_root, destination)
    media_kind = classify_media_kind(content_type)

    return FileUploadResponse(
        relative_path=relative_path,
        name=safe_filename,
        content_type=content_type,
        size=destination.stat().st_size,
        media_kind=media_kind,
        file_url=None,
    )


@router.get("/entries", response_model=FileSystemEntriesResponse)
async def list_file_system_entries(path: str | None = None) -> FileSystemEntriesResponse:
    media_root = get_current_agent_workspace_root()
    media_root.mkdir(parents=True, exist_ok=True)
    target_path = resolve_media_entry_path(media_root, path)

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Requested path was not found.")
    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Requested path must point to a directory.")

    entries = build_file_system_entries(media_root, target_path)
    current_path = format_media_relative_path(media_root, target_path)
    parent_path = None if target_path == media_root else format_media_relative_path(media_root, target_path.parent)

    return FileSystemEntriesResponse(
        current_path=current_path,
        parent_path=parent_path,
        root_path=format_project_relative_path(media_root),
        entry_count=len(entries),
        entries=entries,
    )


@router.get("/download")
async def download_file_system_entry(path: str) -> FileResponse:
    target_path = resolve_media_entry_path(get_current_agent_workspace_root(), path)

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Requested path was not found.")
    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Requested path must point to a file.")

    return FileResponse(
        path=target_path,
        filename=target_path.name,
        media_type=mimetypes.guess_type(target_path.name)[0] or "application/octet-stream",
        content_disposition_type="attachment",
    )


@router.get("/preview")
async def preview_file_system_entry(path: str) -> FileResponse:
    target_path = resolve_media_entry_path(get_current_agent_workspace_root(), path)

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Requested path was not found.")
    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Requested path must point to a file.")

    return FileResponse(
        path=target_path,
        filename=target_path.name,
        media_type=mimetypes.guess_type(target_path.name)[0] or "application/octet-stream",
        content_disposition_type="inline",
    )


@router.delete("/delete")
async def delete_file_system_entry(path: str) -> dict[str, str]:
    target_path = resolve_media_entry_path(get_current_agent_workspace_root(), path)

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Requested path was not found.")
    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Requested path must point to a file.")

    try:
        target_path.unlink()
    except OSError as error:
        raise HTTPException(status_code=500, detail=f"Unable to delete file: {error}") from error

    return {"status": "deleted"}


def resolve_media_dir(media_dir: str) -> Path:
    candidate = Path(media_dir.strip()).expanduser()
    if candidate.is_absolute():
        raise HTTPException(status_code=400, detail="Media storage path must be relative to the project root.")

    project_root = Path.cwd().resolve()
    resolved_candidate = (project_root / candidate).resolve()

    try:
        resolved_candidate.relative_to(project_root)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Media storage path must stay within the project root.",
        ) from error

    return resolved_candidate


def get_current_agent_workspace_root() -> Path:
    """Resolve the workspace root for the current user and selected agent."""
    running_config = get_running_config()
    return build_agent_workspace_dir(
        user_id=running_config.user_id,
        agent_id=running_config.agent_id,
    ).expanduser().resolve()


def sanitize_filename(filename: str) -> str:
    base_name = Path(filename).name.strip()
    if not base_name:
        return "upload.bin"

    sanitized_name = FILENAME_SANITIZER.sub("_", base_name)
    sanitized_name = FILENAME_WHITESPACE.sub(" ", sanitized_name).strip(" .")
    return sanitized_name or "upload.bin"


def sanitize_upload_filename(filename: str, content_type: str) -> str:
    sanitized_name = sanitize_filename(filename)
    guessed_extension = mimetypes.guess_extension(content_type, strict=False) or ""

    if Path(sanitized_name).suffix:
        return sanitized_name

    normalized_guess = guessed_extension.lstrip(".").lower()
    normalized_name = sanitized_name.lower()

    if normalized_guess and normalized_name == normalized_guess:
        return f"upload.{normalized_guess}"

    if normalized_guess:
        return f"{sanitized_name}.{normalized_guess}"

    return sanitized_name


def build_upload_destination(target_directory: Path, safe_filename: str) -> Path:
    base_name = Path(safe_filename).stem or "upload"
    suffix = Path(safe_filename).suffix
    destination = target_directory / safe_filename
    duplicate_index = 1

    while destination.exists():
        destination = target_directory / f"{base_name}-{duplicate_index}{suffix}"
        duplicate_index += 1

    return destination


def classify_media_kind(content_type: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("audio/"):
        return "audio"
    if content_type.startswith("video/"):
        return "video"
    return "file"


def resolve_media_entry_path(media_root: Path, requested_path: str | None) -> Path:
    media_root = media_root.resolve()
    candidate_value = normalize_requested_media_path(media_root, requested_path)
    candidate = Path(candidate_value)
    if candidate.is_absolute():
        raise HTTPException(
            status_code=400,
            detail="Requested path must stay within the configured media directory.",
        )

    resolved_candidate = (media_root / candidate).resolve()
    try:
        resolved_candidate.relative_to(media_root)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Requested path must stay within the configured media directory.",
        ) from error

    return resolved_candidate


def normalize_requested_media_path(media_root: Path, requested_path: str | None) -> str:
    """Normalize incoming paths to workspace-relative paths only."""
    candidate_value = "." if requested_path is None or requested_path == "" else requested_path
    if not candidate_value or candidate_value == ".":
        return "."

    project_relative_root = format_project_relative_path(media_root)
    normalized_candidate = candidate_value.replace("\\", "/").removeprefix("./")

    if normalized_candidate == project_relative_root:
        return "."
    if normalized_candidate.startswith(f"{project_relative_root}/"):
        stripped_candidate = normalized_candidate.removeprefix(f"{project_relative_root}/")
        return stripped_candidate or "."

    agent_workspace_root = format_project_relative_path(get_app_config().agent_workspace)
    if normalized_candidate == agent_workspace_root or normalized_candidate.startswith(f"{agent_workspace_root}/"):
        raise HTTPException(
            status_code=400,
            detail="Requested path must stay within the current user's agent workspace.",
        )

    return candidate_value


def resolve_upload_directory(media_root: Path, requested_path: str | None) -> Path:
    media_root = media_root.resolve()
    media_root.mkdir(parents=True, exist_ok=True)

    target_directory = resolve_media_entry_path(media_root, requested_path)
    if target_directory == media_root:
        return media_root

    if not target_directory.exists():
        raise HTTPException(status_code=404, detail="Requested upload directory was not found.")
    if not target_directory.is_dir():
        raise HTTPException(status_code=400, detail="Requested upload path must point to a directory.")

    return target_directory


def build_file_system_entries(media_root: Path, directory: Path) -> list[FileSystemEntry]:
    try:
        directory_entries = sorted(
            directory.iterdir(),
            key=lambda entry: (not entry.is_dir(), entry.name.lower()),
        )
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to read directory contents: {error}",
        ) from error

    entries: list[FileSystemEntry] = []
    for entry in directory_entries:
        serialized_entry = serialize_file_system_entry(media_root, entry)
        if serialized_entry is not None:
            entries.append(serialized_entry)

    return entries


def serialize_file_system_entry(media_root: Path, path: Path) -> FileSystemEntry | None:
    try:
        resolved_path = path.resolve()
        resolved_path.relative_to(media_root)
        is_directory = path.is_dir()
        stats = path.stat()
    except (OSError, ValueError):
        return None

    content_type = None if is_directory else mimetypes.guess_type(path.name)[0]

    return FileSystemEntry(
        name=path.name,
        relative_path=format_media_relative_path(media_root, path),
        entry_type="directory" if is_directory else "file",
        size=None if is_directory else stats.st_size,
        modified_at=datetime.fromtimestamp(stats.st_mtime).isoformat(),
        content_type=content_type,
    )


def format_media_relative_path(media_root: Path, path: Path) -> str:
    relative_path = path.relative_to(media_root)
    return "." if relative_path == Path(".") else relative_path.as_posix()


def format_project_relative_path(path: Path) -> str:
    """Format a path relative to the project root for safe UI display."""
    resolved_path = path.expanduser().resolve()
    project_root = Path.cwd().resolve()

    try:
        relative_path = resolved_path.relative_to(project_root)
    except ValueError:
        return resolved_path.as_posix()

    return f"./{relative_path.as_posix()}".removeprefix("./")
