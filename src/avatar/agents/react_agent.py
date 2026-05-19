from __future__ import annotations

from collections.abc import Callable, Sequence
import logging
from typing import Any

from agentscope.agent import ReActAgent
from agentscope.formatter import FormatterBase
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import ChatModelBase
from agentscope.tool import Toolkit

from avatar.agents.tools import get_weather
from avatar.config.runnning_config import get_running_config

from .model_factory import create_model_and_formatter

ToolFunc = Callable[..., Any]
logger = logging.getLogger(__name__)

class AvatarReactAgent(ReActAgent):
    """Simplified Avatar ReAct agent.
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
        sys_prompt = self._build_sys_prompt()
        model,formatter = create_model_and_formatter()
        toolkit = Toolkit()
        
        toolkit.register_tool_function(
            get_weather
        )
        
        memory = InMemoryMemory()
        max_iters = get_running_config().max_iters
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


    def _build_sys_prompt(self) -> str:
        """Build system prompt from working dir files and env context.

        Returns:
            Complete system prompt string
        """

        return "你是一个Avatar,一个人工智能助手。"


    def rebuild_sys_prompt(self) -> None:
        """
        重建系统提示词，在load state后执行
        
        """
        self._sys_prompt = self._build_sys_prompt()

        if self.memory is None:
            logger.warning(
                "rebuild_sys_prompt: self.memory is None, "
                "skipping in-memory system prompt update.",
            )
            return

        for msg, _marks in self.memory.content:
            if msg.role == "system":
                msg.content = self.sys_prompt
            break


    async def reply(self, msg=None, structured_model=None):
        
        self.rebuild_sys_prompt() # 重建系统提示词，在loadstate之后
        logger.info(self.memory.content)
        logger.info(msg)
        return await super().reply(msg, structured_model)
