# -*- coding: utf-8 -*-
"""File handling utilities for downloading and managing files.

This module provides utilities for:
- Downloading files from base64 encoded data
- Downloading files from URLs
- Managing download directories
- Reading text files with encoding fallback for cross-platform compatibility
"""
import os
import mimetypes
import base64
import hashlib
import logging
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

from agentscope_runtime.engine.schemas.exception import (
    AgentRuntimeErrorException,
)

logger = logging.getLogger(__name__)


def read_text_file_with_encoding_fallback(file_path: Path | str) -> str:
    """Read text file with multiple encoding attempts for cross-platform
    compatibility.

    This function handles files created with different text editors on
    different platforms, especially addressing the common issue where Windows
    Notepad saves files in GBK encoding while most editors use UTF-8.

    Tries common encodings in order:
    1. UTF-8 with BOM (Windows Notepad with "UTF-8" option) - tried first
       to handle BOM correctly
    2. UTF-8 (default, most common on macOS/Linux)
    3. GBK/CP936 (Windows Notepad default for Chinese)
    4. CP1252/Latin-1 (Windows Notepad default for Western languages)
    5. UTF-8 with errors='replace' as final fallback

    Args:
        file_path: Path to the file to read (Path object or string)

    Returns:
        File content as string (with original whitespace preserved)

    Raises:
        FileNotFoundError: If file doesn't exist
        IOError: If file cannot be read even with fallback encodings
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    encodings_to_try = [
        "utf-8-sig",  # UTF-8 with BOM - try first
        "utf-8",
        "gbk",  # Windows Chinese default
        "cp936",  # Alias for GBK
        "cp1252",  # Windows Western default
        "latin-1",  # Fallback for Western text
    ]

    for encoding in encodings_to_try:
        try:
            with open(file_path, "r", encoding=encoding) as f:
                content = f.read()
                if encoding not in ("utf-8", "utf-8-sig"):
                    logger.debug(
                        "File %s read with encoding: %s",
                        file_path.name,
                        encoding,
                    )
                return content
        except (UnicodeDecodeError, LookupError):
            continue

    # Final fallback: UTF-8 with error replacement
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
            logger.warning(
                "File %s read with UTF-8 errors='replace' fallback, "
                "some characters may be corrupted",
                file_path.name,
            )
            return content
    except Exception as e:
        logger.error(
            "File %s cannot be read even with fallback: %s",
            file_path.name,
            e,
        )
        raise IOError(
            f"File {file_path.name} cannot be read even with fallback: {e}",
        ) from e