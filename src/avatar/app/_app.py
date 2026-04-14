from __future__ import annotations
from typing import Union

from fastapi import FastAPI, HTTPException, Request
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
from ._lifespan import lifespan
from ._agent_app import agent_app

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


@app.get("/get_example_agent_request")
async def get_example_agent_request(
    request_data: AgentRequest,
    request: Request,
) -> dict[str, str]:
    return {"status": "ok"}


app.include_router(
    agent_app.router,
    prefix="/api/agent",
    # tags=["agent"],
)
