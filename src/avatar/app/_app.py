from __future__ import annotations

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create the FastAPI application used by `avatar app`.

    Keeping app construction in its own module makes the HTTP layer reusable
    for tests and future ASGI deployments.
    """
    app = FastAPI(
        title="Avatar API",
        version="0.1.0",
        description="Simple FastAPI service for the Avatar project.",
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

    return app
