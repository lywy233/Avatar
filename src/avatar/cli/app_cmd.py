from __future__ import annotations

import click


@click.command("app")
@click.option(
    "--host",
    default="127.0.0.1",
    show_default=True,
    help="Host interface used by the FastAPI server.",
)
@click.option(
    "--port",
    default=8000,
    show_default=True,
    type=int,
    help="Port used by the FastAPI server.",
)
@click.option(
    "--reload",
    is_flag=True,
    help="Enable auto reload for local development.",
)
def app_cmd(host: str, port: int, reload: bool) -> None:
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

    from avatar.app import create_app

    app = create_app()

    # Use the in-process app object directly. This is the smallest working
    # setup and is enough for a simple local service entrypoint.
    uvicorn.run(app, host=host, port=port, reload=reload)
