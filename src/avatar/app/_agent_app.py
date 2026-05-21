"""
这里是agent本身的接口和实现，不包含各种与前端交互的配置信息

"""

from agentscope_runtime.engine.app import AgentApp

from avatar.app.agent_manager import AgentManager

from .runner import AgentRunner


runner = AgentRunner() # 暂时使用单个runner进行处理，不知道会不会有性能问题


import logging
import uuid

from ..config import set_running_config,get_running_config,RunningConfig
logger = logging.getLogger("avatar.agent_app")

from .multi_agent_manager import MultiAgentManager
# Dynamic runner that selects the correct workspace runner based on request
class DynamicMultiAgentRunner:
    """Runner wrapper that dynamically routes to the correct workspace runner.

    This allows AgentApp to work with multiple agents by inspecting
    the X-Agent-Id header on each request.
    """

    def __init__(self):
        self.framework_type = "agentscope"
        self._multi_agent_manager = MultiAgentManager()

    # def set_multi_agent_manager(self, manager):
    #     """Set the MultiAgentManager instance after initialization."""
    #     self._multi_agent_manager = manager

    async def _get_workspace(self):
        """Get the correct workspace based on request.

        Returns:
            Workspace: The workspace instance for the current agent.
        """
        from ..agents.agent_context import get_agent_context

        # Get agent_id from context (set by middleware or header)
        running_config = get_agent_context()
        agent_id = running_config.agent_id
        user_id = running_config.user_id

        logger.debug(f"_get_agent: user_id={user_id}, agent_id={agent_id}")

        # Get the correct workspace
        # if not self._multi_agent_manager:
        #     raise RuntimeError("MultiAgentManager not initialized")

        try:
            agent_manager = await self._multi_agent_manager.get_agent(agent_id, user_id)
            logger.debug(
                "Got workspace: %s, runner: %s",
                agent_manager.agent_id,
                agent_manager.runner,
            )
            return agent_manager
        except Exception as e:
            logger.error(
                f"Error getting workspace: {e}",
                exc_info=True,
            )
            raise

    async def _get_workspace_runner(self, request):
        """Get the correct workspace runner based on request."""
        workspace = await self._get_workspace()
        return workspace.runner

    async def stream_query(self, request, *args, **kwargs):
        """Dynamically route to the correct workspace runner.

        Registers the task with the workspace's TaskTracker so that
        graceful shutdown during agent reload can detect in-flight
        background tasks (fixes #3275).
        """
        logger.debug("DynamicMultiAgentRunner.stream_query called")
        
        workspace = None
        run_key = None
        try:
            workspace = await self._get_workspace()
            runner = workspace.runner
            logger.debug(f"Got runner: {runner}, type: {type(runner)}")

            # Register this task with the workspace's TaskTracker so
            # _graceful_stop_old_instance() can see it during reload.
            run_key = f"ext-{uuid.uuid4().hex}"
            await workspace.task_tracker.register_external_task(run_key)

            # Delegate to the actual runner's stream_query generator
            count = 0
            async for item in runner.stream_query(request, *args, **kwargs):
                count += 1
                logger.debug(f"Yielding item #{count}: {type(item)}")
                yield item
            logger.debug(f"stream_query completed, yielded {count} items")
        except Exception as e:
            logger.error(
                f"Error in stream_query: {e}",
                exc_info=True,
            )
            # Yield error message to client
            yield {
                "error": str(e),
                "type": "error",
            }
        finally:
            # Always unregister the task when done (success, error,
            # or cancellation).
            if workspace is not None and run_key is not None:
                await workspace.task_tracker.unregister_external_task(run_key)

    async def query_handler(self, request, *args, **kwargs):
        """Dynamically route to the correct workspace runner.

        Registers the task with the workspace's TaskTracker so that
        graceful shutdown during agent reload can detect in-flight
        requests (fixes #3275).
        """
        workspace = None
        run_key = None
        try:
            workspace = await self._get_workspace()
            runner = workspace.runner

            run_key = f"ext-{uuid.uuid4().hex}"
            await workspace.task_tracker.register_external_task(run_key)

            async for item in runner.query_handler(request, *args, **kwargs):
                yield item
        finally:
            # Always unregister the task when done (success, error,
            # or cancellation).
            if workspace is not None and run_key is not None:
                await workspace.task_tracker.unregister_external_task(run_key)

    # Async context manager support for AgentApp lifecycle
    async def __aenter__(self):
        """
        No-op context manager entry (workspaces manage their own runners).
        """
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """No-op context manager exit (workspaces manage their own runners)."""
        return None


# Use dynamic runner for AgentApp
runner = DynamicMultiAgentRunner()



agent_app = AgentApp(
    app_name="Avatar",
    app_description="A helpful assistant with background task support",
    runner=runner,
    enable_stream_task=True,
    stream_task_queue="stream_query",
    stream_task_timeout=300,
)






# import os
# from contextlib import asynccontextmanager

# from fastapi import FastAPI
# from agentscope.agent import ReActAgent
# from agentscope.model import DashScopeChatModel
# from agentscope.formatter import DashScopeChatFormatter
# from agentscope.tool import Toolkit, execute_python_code
# from agentscope.pipeline import stream_printing_messages
# from agentscope.memory import InMemoryMemory
# from agentscope.session import RedisSession

# from agentscope_runtime.engine import AgentApp
# from agentscope_runtime.engine.schemas.agent_schemas import AgentRequest
# from agentscope_runtime.engine.deployers import LocalDeployManager

# print("✅ 依赖导入成功")
# @agent_app.query(framework="agentscope")
# async def query_func(
#     self,
#     msgs,
#     request: AgentRequest = None,
#     **kwargs,
# ):
#     session_id = request.session_id
#     user_id = request.user_id

#     toolkit = Toolkit()
#     toolkit.register_tool_function(execute_python_code)

#     agent = ReActAgent(
#         name="Friday",
#         model=DashScopeChatModel(
#             "qwen-turbo",
#             api_key=os.getenv("DASHSCOPE_API_KEY"),
#             stream=True,
#         ),
#         sys_prompt="You're a helpful assistant named Friday.",
#         toolkit=toolkit,
#         memory=InMemoryMemory(),
#         formatter=DashScopeChatFormatter(),
#     )
#     agent.set_console_output_enabled(enabled=False)

#     await agent_app.state.session.load_session_state(
#         session_id=session_id,
#         user_id=user_id,
#         agent=agent,
#     )

#     async for msg, last in stream_printing_messages(
#         agents=[agent],
#         coroutine_task=agent(msgs),
#     ):
#         yield msg, last

#     await agent_app.state.session.save_session_state(
#         session_id=session_id,
#         user_id=user_id,
#         agent=agent,
#     )
