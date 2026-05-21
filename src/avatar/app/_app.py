from __future__ import annotations
from typing import Union

from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from agentscope.message import Msg
from agentscope.pipeline import stream_printing_messages
from agentscope_runtime.engine.runner import Runner
from agentscope_runtime.engine.schemas.agent_schemas import (
    AgentRequest,
    Message as RuntimeMessage,
    RunStatus,
    TextContent,
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from avatar.agents import AvatarReactAgent
from avatar.app.middlewares import AgentContextMiddleware
from ._lifespan import lifespan
from ._agent_app import agent_app
from .auth.dependencies import get_current_request_context, get_current_user
from .router.auth_router import router as auth_router
from .router.file_system_router import router as file_system_router
from .router.model_provider_router import router as model_provider_router
from .router.skills_hub_router import router as skills_hub_router
from .router.user_config_settings_router import router as user_config_settings_router

app = FastAPI(
    lifespan=lifespan,
    # docs_url="/docs" if DOCS_ENABLED else None,
    # redoc_url="/redoc" if DOCS_ENABLED else None,
    # openapi_url="/openapi.json" if DOCS_ENABLED else None,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.add_middleware(
    AgentContextMiddleware
)



@app.get("/")
async def root() -> dict[str, str]:
    """Return a simple welcome payload for quick smoke checks."""
    return {
        "name": "avatar",
        "message": "Avatar FastAPI service is running.",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    """Expose a lightweight health endpoint for status checks."""
    return {"status": "ok"}


# 临时处理，仅仅为了防止页面报错
@app.get("/get_example_agent_request")
async def get_example_agent_request(
    request_data: AgentRequest,
    request: Request,
) -> dict[str, str]:
    return {"status": "ok"}


app.include_router(
    agent_app.router,
    prefix="/api/agent",
    dependencies=[Depends(get_current_request_context)],
    tags=["agent"],
)

app.include_router(
    auth_router,
    prefix="/api/auth",
)

app.include_router(
    skills_hub_router,
    prefix="/api/skills-hub",
    dependencies=[Depends(get_current_request_context)],
)

app.include_router(
    file_system_router,
    prefix="/api/file-system",
    dependencies=[Depends(get_current_request_context)],
)

app.include_router(
    model_provider_router,
    prefix="/api/model-provider",
    dependencies=[Depends(get_current_request_context)],
)

app.include_router(
    user_config_settings_router,
    prefix="/api/settings",
    dependencies=[Depends(get_current_request_context)],
)
