"""Avatar agent package.

The main agent class is lazy-loaded to avoid pulling AgentScope runtime
dependencies during lightweight imports.
"""

from .react_agent import AvatarReactAgent
from .model_factory import create_model_and_formatter

__all__ = [AvatarReactAgent, create_model_and_formatter]
