from __future__ import annotations

import os

from agentscope.formatter import OpenAIChatFormatter
from agentscope.model import OpenAIChatModel

from avatar.config import get_settings


def create_model_and_formatter() -> tuple[OpenAIChatModel, OpenAIChatFormatter]:
    """Create the default AgentScope model and formatter pair.

    This minimal factory uses AgentScope's built-in OpenAI-compatible chat
    model and matching formatter directly.
    """

    settings = get_settings()
    api_key = settings.api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "Missing API key for the default AgentScope model. "
            "Set AVATAR_API_KEY or OPENAI_API_KEY before creating the agent.",
        )

    model = OpenAIChatModel(
        model_name=settings.model_name,
        api_key=api_key,
        stream=settings.model_stream,
        client_kwargs={"base_url": settings.base_url} if settings.base_url else None,
    )
    formatter = OpenAIChatFormatter()
    return model, formatter
