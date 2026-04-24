"""
日志设置，设置全局的日志形态，使用该处的日志以使得日志进入
完整的审计
"""
import io
import logging
import logging.handlers
import os
import platform
import sys
from pathlib import Path

_LOG_MAX_BYTES = 5 * 1024 * 1024  # 5 MiB
_LOG_BACKUP_COUNT = 3
_LOG_NAMESPACE = "avatar"
_LEVEL_MAP = {
    "critical": logging.CRITICAL,
    "error": logging.ERROR,
    "warning": logging.WARNING,
    "info": logging.INFO,
    "debug": logging.DEBUG,
}

class ColorFormatter(logging.Formatter):
    COLORS = {
        logging.DEBUG: "\033[34m",
        logging.INFO: "\033[32m",
        logging.WARNING: "\033[33m",
        logging.ERROR: "\033[31m",
        logging.CRITICAL: "\033[41m\033[97m",
    }
    RESET = "\033[0m"

    def format(self, record):
        # Disable colors if output is not a terminal (e.g. piped/redirected)
        use_color = hasattr(sys.stderr, "isatty") and sys.stderr.isatty()
        color = self.COLORS.get(record.levelno, "") if use_color else ""
        reset = self.RESET if use_color else ""
        level = f"{color}{record.levelname}{reset}"

        full_path = record.pathname
        cwd = os.getcwd()
        # Use os.path for cross-platform path prefix stripping
        try:
            if os.path.commonpath([full_path, cwd]) == cwd:
                full_path = os.path.relpath(full_path, cwd)
        except ValueError:
            # Different drives on Windows (e.g., C: vs D:) are not comparable.
            pass

        prefix = f"{level} {full_path}:{record.lineno}"
        original_msg = super().format(record)

        return f"{prefix} | {original_msg}"
    
def setup_logger(level: int | str = logging.INFO):
    """Configure logging to only output from this package (copaw), not deps."""
    log_format = "%(asctime)s | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    if isinstance(level, str):
        level = _LEVEL_MAP.get(level.lower(), logging.INFO)

    formatter = ColorFormatter(log_format, datefmt)

    # Suppress third-party: set root logger level and configure handlers.
    root = logging.getLogger()
    for handler in root.handlers:
        if isinstance(
            handler,
            (logging.FileHandler, logging.handlers.RotatingFileHandler),
        ):
            handler.setLevel(logging.INFO)
        else:
            handler.setLevel(logging.WARNING)

    # Only attach handler to our namespace so only copaw.* logs are printed.
    logger = logging.getLogger(_LOG_NAMESPACE)
    logger.setLevel(level)
    logger.propagate = False
    if not logger.handlers:
        utf8_stderr = io.TextIOWrapper(
            sys.stderr.buffer,
            encoding="utf-8",
            errors="replace",
        )
        handler = logging.StreamHandler(utf8_stderr)
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


def add_logging_file_handler(log_path: Path) -> None:
    """Add a file handler to the avatar logger for daemon logs.

    Idempotent: if the logger already has a file handler for the same path,
    no new handler is added (avoids duplicate lines and leaked descriptors
    when lifespan runs multiple times in the same process).

    Args:
        log_path: Path to the log file (e.g. WORKING_DIR / "avatar.log").
    """
    log_path = Path(log_path).resolve()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger(_LOG_NAMESPACE)
    for handler in logger.handlers:
        base = getattr(handler, "baseFilename", None)
        if base is not None and Path(base).resolve() == log_path:
            return

    is_windows_or_linux = platform.system() in ("Windows", "Linux")
    if is_windows_or_linux:
        file_handler = logging.FileHandler(
            log_path,
            encoding="utf-8",
            mode="a",
        )
    else:
        file_handler = logging.handlers.RotatingFileHandler(
            log_path,
            encoding="utf-8",
            maxBytes=_LOG_MAX_BYTES,
            backupCount=_LOG_BACKUP_COUNT,
        )

    file_handler.setFormatter(
        logging.Formatter("%(asctime)s | %(message)s", "%Y-%m-%d %H:%M:%S"),
    )
    logger.addHandler(file_handler)