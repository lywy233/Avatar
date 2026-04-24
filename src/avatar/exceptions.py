# -*- coding: utf-8 -*-
"""
异常类型定义
需要统一处理的异常类型
"""

from typing import Any, Dict, Optional

from agentscope_runtime.engine.schemas.exception import (
    AgentRuntimeErrorException,
    ModelExecutionException,
    ModelTimeoutException,
    UnauthorizedModelAccessException,
    ModelQuotaExceededException,
    ModelContextLengthExceededException,
    UnknownAgentException,
    ExternalServiceException,
)


# ==================== CoPaw Business Exceptions ====================


class ProviderError(AgentRuntimeErrorException):
    """Exception raised when there's an error with a model provider."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__("PROVIDER_ERROR", message, details)