from __future__ import annotations

import os

from agentscope.formatter import OpenAIChatFormatter
from agentscope.model import OpenAIChatModel
from avatar.config import get_app_config
from avatar.config.runnning_config import get_running_config

def create_model_and_formatter() -> tuple[OpenAIChatModel, OpenAIChatFormatter]:
    """Create the default AgentScope model and formatter pair.

    This minimal factory uses AgentScope's built-in OpenAI-compatible chat
    model and matching formatter directly.
    """
    
    current_running_config = get_running_config()
    model_provider_config = current_running_config.model_provider_config
    api_key = model_provider_config.api_key,
    base_url = model_provider_config.base_url
    model_name = model_provider_config.model_name

    client_kwargs = {
        "base_url": base_url
    }
    client_kwargs.update(model_provider_config.extra_config)

    model = OpenAIChatModel(
        model_name=model_name,
        api_key=api_key,
        stream=True,
        client_kwargs=client_kwargs
    )
    formatter = OpenAIChatFormatter()
    return model, formatter
