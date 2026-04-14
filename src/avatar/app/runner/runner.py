# -*- coding: utf-8 -*-
# pylint: disable=unused-argument too-many-branches too-many-statements
from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

import frontmatter as fm
from agentscope.message import Msg, TextBlock
from agentscope.pipeline import stream_printing_messages
from agentscope_runtime.engine.runner import Runner
from agentscope_runtime.engine.schemas.agent_schemas import AgentRequest
from agentscope_runtime.engine.schemas.exception import (
    AgentException,
    AppBaseException,
)

from avatar.agents.react_agent import AvatarReactAgent
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from agentscope.agent import ReActAgent
from agentscope.model import DashScopeChatModel
from agentscope.formatter import DashScopeChatFormatter
from agentscope.tool import Toolkit, execute_python_code
from agentscope.pipeline import stream_printing_messages
from agentscope.memory import InMemoryMemory
from agentscope.session import RedisSession

from agentscope_runtime.engine import AgentApp
from agentscope_runtime.engine.schemas.agent_schemas import AgentRequest
from agentscope_runtime.engine.deployers import LocalDeployManager

print("✅ 依赖导入成功")


logger = logging.getLogger(__name__)

class AgentRunner(Runner):
    def __init__(
        self,
    ) -> None:
        super().__init__()
        self.framework_type = "agentscope"

    async def init_handler(self, *args, **kwargs):
        """初始化部分"""
        from .session import CustomSession
        self.session = CustomSession()


    async def query_handler(
        self,
        msgs,
        request: AgentRequest = None,
        **kwargs,
    ):
        """
        Handle agent query.
        """
        session_id = request.session_id
        user_id = request.user_id

        agent = AvatarReactAgent(
            name="Avatar"
        )
        agent.set_console_output_enabled(enabled=True)

        await self.session.load_session_state(
            session_id=session_id,
            user_id=user_id,
            agent=agent,
        )

        async for msg, last in stream_printing_messages(
            agents=[agent],
            coroutine_task=agent(msgs),
        ):
            yield msg, last

        await self.session.save_session_state(
            session_id=session_id,
            user_id=user_id,
            agent=agent,
        )