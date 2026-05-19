from __future__ import annotations

import importlib.util
from pathlib import Path

from agentscope.formatter import FormatterBase
from agentscope.model import OpenAIChatModel
from avatar.config.runnning_config import get_running_config


def _load_openai_formatter_class():
    """Load the local OpenAI video formatter from the sidecar file."""
    formatter_path = Path(__file__).with_name("model_factory") / "formatter.py"
    spec = importlib.util.spec_from_file_location(
        "avatar_openai_video_formatter",
        formatter_path,
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load formatter module from {formatter_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.OpenAIVideoChatFormatter


def create_model_and_formatter() -> tuple[OpenAIChatModel, FormatterBase]:
    """Create the default AgentScope model and formatter pair.

    This minimal factory uses AgentScope's built-in OpenAI-compatible chat
    model and a local OpenAI-compatible formatter with video support.
    """

    current_running_config = get_running_config()
    model_provider_config = current_running_config.model_provider_config
    api_key = model_provider_config.api_key
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
    formatter_cls = _load_openai_formatter_class()
    formatter = formatter_cls()
    return model, formatter
