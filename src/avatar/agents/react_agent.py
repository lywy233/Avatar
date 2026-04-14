from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

from agentscope.agent import ReActAgent
from agentscope.formatter import FormatterBase
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import ChatModelBase
from agentscope.tool import Toolkit

from .model_factory import create_model_and_formatter

ToolFunc = Callable[..., Any]


class AvatarReactAgent(ReActAgent):
    """Simplified Avatar ReAct agent.

    This implementation keeps the same high-level shape as the reference
    `CoPawAgent`: it builds a system prompt, prepares a toolkit, and creates
    an in-memory agent runtime. It intentionally omits skills, hooks, MCP,
    and advanced memory management for now.
    """

    def __init__(
        self,
        name,
        # sys_prompt,
        # model,
        # formatter,
        # toolkit=None,
        # memory=None,
        # long_term_memory=None,
        # long_term_memory_mode="both",
        # enable_meta_tool=False,
        # parallel_tool_calls=False,
        # knowledge=None,
        # enable_rewrite_query=True,
        # plan_notebook=None,
        # print_hint_msg=False,
        # max_iters=10,
        # tts_model=None,
        # compression_config=None,
    ):  
        sys_prompt = "你是一个智能体。"
        model,formatter = create_model_and_formatter()
        toolkit = Toolkit()
        memory = InMemoryMemory()
        max_iters = 10
        super().__init__(
            name,
            sys_prompt,
            model,
            formatter,
            toolkit,
            memory,
            max_iters=max_iters,
            # long_term_memory,
            # long_term_memory_mode,
            # enable_meta_tool,
            # parallel_tool_calls,
            # knowledge,
            # enable_rewrite_query,
            # plan_notebook,
            # print_hint_msg,
            # max_iters,
            # tts_model,
            # compression_config,
        )

    async def reply(self, msg=None, structured_model=None):
        return await super().reply(msg, structured_model)
