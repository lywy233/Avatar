"""Agent-level configuration models and helpers.

This module stores the per-agent configuration that lives in each
workspace directory as ``agent.json``. It intentionally keeps the first
implementation small and compatible with the current Avatar codebase while
following the same broad layering used in QwenPaw:

- root/app config: process-level paths and bootstrap settings
- agent profile ref: lightweight entry in the global agent registry
- agent profile config: full per-agent configuration in workspace
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field

from .app_config import get_app_config


# class ContextCompactConfig(BaseModel):
#     """Configuration for context compaction behavior."""

#     model_config = ConfigDict(extra="ignore")

#     context_compact_enabled: bool = Field(
#         default=True,
#         description="Whether compacted summaries should be written back.",
#     )
#     token_count_model: str = Field(
#         default="default",
#         description="Tokenizer model used for token counting when needed.",
#     )
#     token_count_use_mirror: bool = Field(
#         default=False,
#         description="Whether to use a HuggingFace mirror for tokenizer load.",
#     )
#     token_count_estimate_divisor: float = Field(
#         default=4.0,
#         ge=1.0,
#         description="Byte-length divisor used by estimated token counting.",
#     )


# class ToolResultCompactConfig(BaseModel):
#     """Configuration for compacting large historical tool results."""

#     model_config = ConfigDict(extra="ignore")

#     enabled: bool = Field(
#         default=True,
#         description="Whether old tool results should be pruned/compacted.",
#     )
#     recent_n: int = Field(
#         default=3,
#         ge=0,
#         description="Number of most recent tool results to preserve.",
#     )
#     old_max_bytes: int = Field(
#         default=8 * 1024,
#         ge=0,
#         description="Maximum bytes kept for older tool results.",
#     )
#     recent_max_bytes: int = Field(
#         default=64 * 1024,
#         ge=0,
#         description="Maximum bytes kept for recent tool results.",
#     )
#     retention_days: int = Field(
#         default=7,
#         ge=0,
#         description="Retention window for historical tool results.",
#     )


# class MemorySummaryConfig(BaseModel):
#     """Configuration for asynchronous memory summarization."""

#     model_config = ConfigDict(extra="ignore")

#     memory_summary_enabled: bool = Field(
#         default=False,
#         description="Whether to generate background memory summaries.",
#     )


# class AgentRunningConfig(BaseModel):
#     """Agent runtime configuration stored in ``agent.json``."""

#     model_config = ConfigDict(extra="allow")

#     max_iters: int = Field(
#         default=10,
#         ge=1,
#         description="Maximum reasoning iterations for the agent.",
#     )
#     memory_manager_backend: str = Field(
#         default="default",
#         description="Memory manager backend identifier.",
#     )
#     context_manager_backend: str = Field(
#         default="default",
#         description="Context manager backend identifier.",
#     )
#     memory_compact_threshold: int = Field(
#         default=24_000,
#         ge=1,
#         description="Token threshold that triggers memory compaction.",
#     )
#     memory_compact_reserve: int = Field(
#         default=2_000,
#         ge=0,
#         description="Reserved token budget kept after compaction.",
#     )
#     context_compact: ContextCompactConfig = Field(
#         default_factory=ContextCompactConfig,
#         description="Context compaction configuration.",
#     )
#     tool_result_compact: ToolResultCompactConfig = Field(
#         default_factory=ToolResultCompactConfig,
#         description="Tool result compaction configuration.",
#     )
#     memory_summary: MemorySummaryConfig = Field(
#         default_factory=MemorySummaryConfig,
#         description="Memory summarization configuration.",
#     )


# class ChannelInstanceConfig(BaseModel):
#     """Single channel configuration.

#     Avatar does not yet have a stable built-in channel matrix, so the model
#     stays intentionally permissive and accepts extra transport-specific
#     fields.
#     """

#     model_config = ConfigDict(extra="allow")

#     enabled: bool = Field(default=False)
#     bot_prefix: str = Field(default="")


# class ChannelConfig(BaseModel):
#     """Container for all configured channels of one agent."""

#     model_config = ConfigDict(extra="allow")


# class MCPClientConfig(BaseModel):
#     """Configuration for a single MCP client."""

#     model_config = ConfigDict(extra="allow", populate_by_name=True)

#     name: str = Field(..., description="Display name of the MCP client.")
#     description: str = Field(default="")
#     enabled: bool = Field(default=True)
#     transport: str = Field(
#         default="stdio",
#         description="Transport type such as stdio, sse, or streamable_http.",
#     )
#     url: str = Field(default="")
#     headers: dict[str, str] = Field(default_factory=dict)
#     command: str = Field(default="")
#     args: list[str] = Field(default_factory=list)
#     env: dict[str, str] = Field(default_factory=dict)
#     cwd: str = Field(default="")


# class MCPConfig(BaseModel):
#     """Collection of MCP clients configured for one agent."""

#     model_config = ConfigDict(extra="ignore")

#     clients: dict[str, MCPClientConfig] = Field(default_factory=dict)


# class LastDispatchConfig(BaseModel):
#     """Last known dispatch target for active outbound messaging."""

#     model_config = ConfigDict(extra="ignore")

#     channel: str = Field(default="")
#     user_id: str = Field(default="")
#     session_id: str = Field(default="")
#     agent_id: str = Field(default="")





class AgentProfileRef(BaseModel):
    """Agent profile reference stored in the global agent registry."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique agent ID")
    name: str = Field(..., description="Human-readable agent name.")
    description: str = Field(default="", description="Agent description.")
    
    workspace_dir: str = Field(
        ...,
        description="Path to the agent workspace directory.",
    )
    enabled: bool = Field(
        default=True,
        description="Whether this agent is enabled for loading.",
    )


class AgentProfileConfig(AgentProfileRef):
    """Complete per-agent configuration stored in workspace ``agent.json``."""

    model_config = ConfigDict(extra="allow")
    # channels: ChannelConfig | None = Field(
    #     default=None,
    #     description="Channel configuration for this agent.",
    # )
    # mcp: MCPConfig | None = Field(
    #     default=None,
    #     description="MCP client configuration for this agent.",
    # )
    # last_dispatch: LastDispatchConfig | None = Field(
    #     default=None,
    #     description="Last dispatch target used by the channel system.",
    # )
    # running: AgentRunningConfig = Field(
    #     default_factory=AgentRunningConfig,
    #     description="Runtime behavior configuration.",
    # )

class AgentsConfig(BaseModel):
    """Agents configuration (root config.json only contains references)."""

    active_agent: str = Field(
        default="default",
        description="Currently active agent ID",
    )
    agent_order: List[str] = Field(
        default_factory=lambda: ["default"],
        description="Persisted UI order for configured agents",
    )
    profiles: Dict[str, AgentProfileRef] = Field(
        default_factory=lambda: {
            "default": AgentProfileRef(
                id="default",
                name="default",
                workspace_dir=f"{get_app_config().agent_workspace}/default",
            ),
        },
        description="Agent profile references (ID and workspace path only)",
    )

