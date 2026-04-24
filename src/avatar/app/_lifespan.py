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

from ._agent_app import runner
from .utils.logging import add_logging_file_handler,logging
from ..config import get_app_config
logger = logging.getLogger("avatar.lifespan")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """管理服务启动和关闭时的资源"""
    # 启动时：初始化 Session 管理器
    # import fakeredis

    # fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    # # 注意：这个 FakeRedis 实例仅用于开发/测试。
    # # 在生产环境中，请替换为你自己的 Redis 客户端/连接
    # #（例如 aioredis.Redis）。
    # app.state.session = RedisSession(connection_pool=fake_redis.connection_pool)

    # await runner.start()

    # try:
    #     yield  # 服务运行中
    # finally:
    #     await runner.stop()
    add_logging_file_handler(get_app_config().log_path)
    
    logger.info("完成logger模块初始化")
    yield  # 服务运行中
    # 关闭时：可以在此处添加清理逻辑（如关闭数据库连接）
    print("AgentApp is shutting down...")
