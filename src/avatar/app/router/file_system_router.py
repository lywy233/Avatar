from __future__ import annotations

import mimetypes
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from avatar.config import get_app_config

router = APIRouter(tags=["file-system"])

FILENAME_SANITIZER = re.compile(r"[^A-Za-z0-9._-]+")
MAX_UPLOAD_SIZE = 20 * 1024 * 1024

class FileUploadResponse(BaseModel):
    relative_path: str
    name: str
    content_type: str
    size: int
    media_kind: str


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

@router.post("/upload", response_model=FileUploadResponse)
async def upload_media_file(
    file: UploadFile = File(...),
    path: str | None = Form(default=None),
) -> FileUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    resolved_media_dir = resolve_upload_directory(path)

    try:
        resolved_media_dir.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to prepare media directory: {error}",
        ) from error

    safe_filename = sanitize_filename(file.filename)
    destination = build_upload_destination(resolved_media_dir, safe_filename)
    guessed_content_type = mimetypes.guess_type(safe_filename)[0]
    content_type = guessed_content_type or file.content_type or "application/octet-stream"

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

    media_root = get_app_config().media_storage_path.resolve()

    return FileUploadResponse(
        relative_path=format_media_relative_path(media_root, destination),
        name=safe_filename,
        content_type=content_type,
        size=destination.stat().st_size,
        media_kind=classify_media_kind(content_type),
    )


@router.get("/entries", response_model=FileSystemEntriesResponse)
async def list_file_system_entries(path: str | None = None) -> FileSystemEntriesResponse:
    media_root = get_app_config().media_storage_path.resolve()
    media_root.mkdir(parents=True, exist_ok=True)
    target_path = resolve_media_entry_path(path)

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
        root_path=".",
        entry_count=len(entries),
        entries=entries,
    )


@router.get("/download")
async def download_file_system_entry(path: str) -> FileResponse:
    target_path = resolve_media_entry_path(path)

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
    target_path = resolve_media_entry_path(path)

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
    target_path = resolve_media_entry_path(path)

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


def sanitize_filename(filename: str) -> str:
    base_name = Path(filename).name.strip()
    if not base_name:
        return "upload.bin"

    sanitized_name = FILENAME_SANITIZER.sub("_", base_name).strip("._")
    return sanitized_name or "upload.bin"


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


def resolve_media_entry_path(requested_path: str | None) -> Path:
    media_root = get_app_config().media_storage_path.resolve()
    candidate_value = "." if requested_path is None or requested_path == "" else requested_path
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


def resolve_upload_directory(requested_path: str | None) -> Path:
    media_root = get_app_config().media_storage_path.resolve()
    media_root.mkdir(parents=True, exist_ok=True)

    target_directory = resolve_media_entry_path(requested_path)
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
