"""
这里是agent本身的接口和实现，不包含各种与前端交互的配置信息

"""

from agentscope_runtime.engine.app import AgentApp

from .runner import AgentRunner


runner = AgentRunner() # 暂时使用单个runner进行处理，不知道会不会有性能问题



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