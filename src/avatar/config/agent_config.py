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

from pathlib import Path
from typing import Dict, List

from pydantic import BaseModel, ConfigDict, Field

from .app_config import get_app_config
from .base_config import BaseJsonConfigManager


def build_agent_workspace_dir(user_id: str, agent_id: str) -> Path:
    """Build the canonical workspace path for a user's agent."""
    return get_app_config().agent_workspace / user_id / agent_id


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
                workspace_dir=str(build_agent_workspace_dir("default", "default")),
            ),
        },
        description="Agent profile references (ID and workspace path only)",
    )


class AgentConfigManager(BaseJsonConfigManager[AgentProfileConfig]):
    """智能体配置管理器。"""

    def __init__(self, agent_id: str, user_id: str = "default") -> None:
        """初始化智能体配置管理器。

        Args:
            agent_id: 智能体唯一标识。
            user_id: 所属用户唯一标识。
        """
        super().__init__()
        self.agent_id = agent_id
        self.user_id = user_id

    @property
    def config_model(self) -> type[AgentProfileConfig]:
        """返回当前管理器绑定的配置模型类型。"""
        return AgentProfileConfig

    def get_config_path(self) -> Path:
        """根据智能体信息计算配置文件路径。"""
        return self._get_workspace_dir() / "agent.json"

    def build_default_config(self) -> AgentProfileConfig:
        """构建指定智能体的默认配置。"""
        agent_ref = self._get_agent_profile_ref()
        return AgentProfileConfig.model_validate(agent_ref.model_dump(mode="json"))

    def _get_workspace_dir(self) -> Path:
        """获取智能体工作目录。"""
        agent_ref = self._get_agent_profile_ref(allow_missing=True)
        if agent_ref is not None:
            return Path(agent_ref.workspace_dir)

        from .user_config import load_user_config

        user_config = load_user_config(self.user_id)
        return build_agent_workspace_dir(self.user_id, self.agent_id)

    def _get_agent_profile_ref(
        self,
        allow_missing: bool = False,
    ) -> AgentProfileRef | None:
        """从用户配置中读取智能体引用。"""
        from .user_config import load_user_config, save_user_config

        user_config = load_user_config(self.user_id)
        agent_ref = user_config.agents.profiles.get(self.agent_id)
        if agent_ref is not None:
            return agent_ref
        if allow_missing:
            return None

        workspace_dir = build_agent_workspace_dir(self.user_id, self.agent_id)
        agent_ref = AgentProfileRef(
            id=self.agent_id,
            name=self.agent_id,
            workspace_dir=str(workspace_dir),
        )
        user_config.agents.profiles[self.agent_id] = agent_ref
        if self.agent_id not in user_config.agents.agent_order:
            user_config.agents.agent_order.append(self.agent_id)
        save_user_config(self.user_id, user_config)
        return agent_ref


def get_agent_config_manager(
    agent_id: str,
    user_id: str = "default",
) -> AgentConfigManager:
    """创建智能体配置管理器。"""
    return AgentConfigManager(agent_id=agent_id, user_id=user_id)


def load_agent_config(
    agent_id: str,
    user_id: str = "default",
) -> AgentProfileConfig:
    """从持久化存储加载智能体配置。"""
    return get_agent_config_manager(agent_id, user_id).load_config()


def save_agent_config(
    agent_id: str,
    agent_config: AgentProfileConfig | dict,
    user_id: str = "default",
) -> AgentProfileConfig:
    """保存智能体配置到持久化存储。"""
    validated_config = get_agent_config_manager(agent_id, user_id).save_config(
        agent_config,
    )

    from .user_config import load_user_config, save_user_config

    user_config = load_user_config(user_id)
    user_config.agents.profiles[agent_id] = AgentProfileRef.model_validate(
        validated_config.model_dump(mode="json"),
    )
    if agent_id not in user_config.agents.agent_order:
        user_config.agents.agent_order.append(agent_id)
    save_user_config(user_id, user_config)
    return validated_config
