# -*- coding: utf-8 -*-
"""Retry wrapper for ChatModelBase instances.

Transparently retries LLM API calls on transient errors (rate-limit,
timeout, connection) with configurable exponential back-off.

Both normal responses and streaming responses are supported. When a stream
fails mid-consumption, the whole request is re-issued and the stream is
consumed again until retries are exhausted.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, AsyncGenerator

from agentscope.model import ChatModelBase
from agentscope.model._model_response import ChatResponse

logger = logging.getLogger(__name__)

DEFAULT_MAX_RETRIES = 3
DEFAULT_BACKOFF_BASE = 1.0
DEFAULT_BACKOFF_CAP = 8.0

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504, 529}

_openai_retryable: tuple[type[Exception], ...] | None = None
_anthropic_retryable: tuple[type[Exception], ...] | None = None


@dataclass(frozen=True, slots=True)
class RetryConfig:
    """Retry policy for transient LLM API failures."""

    enabled: bool = DEFAULT_MAX_RETRIES > 0
    max_retries: int = DEFAULT_MAX_RETRIES
    backoff_base: float = DEFAULT_BACKOFF_BASE
    backoff_cap: float = DEFAULT_BACKOFF_CAP


def _get_openai_retryable() -> tuple[type[Exception], ...]:
    global _openai_retryable
    if _openai_retryable is None:
        try:
            import openai

            _openai_retryable = (
                openai.RateLimitError,
                openai.APITimeoutError,
                openai.APIConnectionError,
            )
        except ImportError:
            _openai_retryable = ()
    return _openai_retryable


def _get_anthropic_retryable() -> tuple[type[Exception], ...]:
    global _anthropic_retryable
    if _anthropic_retryable is None:
        try:
            import anthropic

            _anthropic_retryable = (
                anthropic.RateLimitError,
                anthropic.APITimeoutError,
                anthropic.APIConnectionError,
            )
        except ImportError:
            _anthropic_retryable = ()
    return _anthropic_retryable


def _is_retryable(exc: Exception) -> bool:
    """Return *True* if *exc* should trigger a retry."""
    retryable = _get_openai_retryable() + _get_anthropic_retryable()
    if retryable and isinstance(exc, retryable):
        return True

    status = getattr(exc, "status_code", None)
    if status is not None and status in RETRYABLE_STATUS_CODES:
        return True

    return False


def _extract_retry_after(exc: Exception) -> float | None:
    """Parse the Retry-After header value (in seconds) from an exception."""
    headers = getattr(exc, "headers", None) or getattr(
        getattr(exc, "response", None),
        "headers",
        None,
    )
    if headers:
        raw = headers.get("Retry-After") or headers.get("retry-after")
        if raw:
            try:
                return float(raw)
            except (TypeError, ValueError):
                pass
    return None


def _normalize_retry_config(retry_config: RetryConfig | None) -> RetryConfig:
    """Normalize externally supplied retry config into safe bounds."""
    if retry_config is None:
        return RetryConfig()
    normalized_backoff_base = max(0.1, retry_config.backoff_base)
    normalized_backoff_cap = max(
        0.5,
        retry_config.backoff_cap,
        normalized_backoff_base,
    )
    return RetryConfig(
        enabled=retry_config.enabled,
        max_retries=max(1, retry_config.max_retries),
        backoff_base=normalized_backoff_base,
        backoff_cap=normalized_backoff_cap,
    )


def _compute_backoff(attempt: int, retry_config: RetryConfig) -> float:
    """Exponential back-off: base * 2^(attempt-1), capped."""
    return min(
        retry_config.backoff_cap,
        retry_config.backoff_base * (2 ** max(0, attempt - 1)),
    )


def _compute_retry_delay(
    attempt: int,
    retry_config: RetryConfig,
    exc: Exception,
) -> float:
    """Compute the delay before the next retry attempt."""
    retry_after = _extract_retry_after(exc)
    backoff_delay = _compute_backoff(attempt, retry_config)
    if retry_after is None:
        return backoff_delay
    return min(retry_config.backoff_cap, max(backoff_delay, retry_after))


class RetryChatModel(ChatModelBase):
    """Transparent retry wrapper around any :class:`ChatModelBase`."""

    def __init__(
        self,
        inner: ChatModelBase,
        retry_config: RetryConfig | None = None,
    ) -> None:
        super().__init__(model_name=inner.model_name, stream=inner.stream)
        self._inner = inner
        self._retry_config = _normalize_retry_config(retry_config)

    @property
    def inner_class(self) -> type:
        """Expose the wrapped model class for downstream compatibility."""
        return self._inner.__class__

    async def __call__(
        self,
        *args: Any,
        **kwargs: Any,
    ) -> ChatResponse | AsyncGenerator[ChatResponse, None]:
        retries = (
            self._retry_config.max_retries if self._retry_config.enabled else 0
        )
        attempts = retries + 1
        last_exc: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                result = await self._inner(*args, **kwargs)
                if isinstance(result, AsyncGenerator):
                    return self._wrap_stream(
                        result,
                        args,
                        kwargs,
                        current_attempt=attempt,
                        max_attempts=attempts,
                    )
                return result
            except Exception as exc:
                last_exc = exc
                if not _is_retryable(exc) or attempt >= attempts:
                    raise

                delay = _compute_retry_delay(attempt, self._retry_config, exc)
                logger.warning(
                    "LLM call failed (attempt %d/%d): %s. Retrying in %.1fs ...",
                    attempt,
                    attempts,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)

        if last_exc is not None:
            raise last_exc
        raise RuntimeError("RetryChatModel exited without a result or exception")

    async def _wrap_stream(
        self,
        stream: AsyncGenerator[ChatResponse, None],
        call_args: tuple[Any, ...],
        call_kwargs: dict[str, Any],
        current_attempt: int,
        max_attempts: int,
    ) -> AsyncGenerator[ChatResponse, None]:
        """Yield a stream, retrying the full request on transient failures."""
        current_stream = stream

        for attempt in range(current_attempt, max_attempts + 1):
            try:
                if attempt > current_attempt:
                    result = await self._inner(*call_args, **call_kwargs)
                    if not isinstance(result, AsyncGenerator):
                        yield result
                        return
                    current_stream = result

                async for chunk in current_stream:
                    yield chunk
                return
            except Exception as exc:
                if not _is_retryable(exc) or attempt >= max_attempts:
                    raise

                delay = _compute_retry_delay(attempt, self._retry_config, exc)
                logger.warning(
                    "LLM stream failed (attempt %d/%d): %s. Retrying in %.1fs ...",
                    attempt,
                    max_attempts,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)
            finally:
                await current_stream.aclose()
