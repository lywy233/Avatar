from __future__ import annotations

import click

from avatar.config import get_app_config


@click.command("app")
@click.option(
    "--host",
    default="127.0.0.1",
    show_default=True,
    help="Host interface used by the FastAPI server.",
)
@click.option(
    "--port",
    default=None,
    show_default="from AVATAR_PORT or 8000",
    type=int,
    help="Port used by the FastAPI server.",
)
@click.option(
    "--reload",
    is_flag=True,
    help="Enable auto reload for local development.",
)
def app_cmd(host: str, port: int | None, reload: bool) -> None:
    """Start the Avatar FastAPI application.

    FastAPI and Uvicorn are imported inside the command so the top-level CLI
    stays lightweight until the user actually asks to run the web app.
    """
    try:
        import uvicorn
    except ImportError as exc:  # pragma: no cover - depends on local env
        raise click.ClickException(
            "uvicorn is required to run `avatar app`.",
        ) from exc

    app_config = get_app_config()
    resolved_port = app_config.port if port is None else port

    # Use the in-process app object directly. This is the smallest working
    # setup and is enough for a simple local service entrypoint.
    uvicorn.run(
        "avatar.app._app:app",
        host=host,
        port=resolved_port,
        reload=reload,
        # reload_excludes=["reference_codes/**"], # 无效,根本起不来
    )
