from __future__ import annotations

import logging
from importlib import import_module

import click


logger = logging.getLogger(__name__)


class LazyGroup(click.Group):
    """Click group with on-demand subcommand imports.

    The CLI only imports the module that is needed for the requested
    subcommand. This keeps `avatar --help` and other lightweight commands
    fast even if future subcommands pull in heavier dependencies.
    """

    def __init__(self, *args, lazy_subcommands=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.lazy_subcommands = lazy_subcommands or {}

    def list_commands(self, ctx: click.Context) -> list[str]:
        """Return both eager and lazy command names for help output."""
        base_commands = super().list_commands(ctx)
        return sorted(set(base_commands) | set(self.lazy_subcommands))

    def get_command(
        self,
        ctx: click.Context,
        cmd_name: str,
    ) -> click.Command | None:
        """Resolve a subcommand, importing its module only when needed."""
        command = super().get_command(ctx, cmd_name)
        if command is not None:
            return command

        target = self.lazy_subcommands.get(cmd_name)
        if target is None:
            return None

        module_path, attr_name = target

        try:
            module = import_module(module_path)
            command = getattr(module, attr_name)
        except Exception as exc:  # pragma: no cover - defensive CLI path
            logger.exception("Failed to load command '%s'", cmd_name)
            raise click.ClickException(
                f"Unable to load command '{cmd_name}': {exc}",
            ) from exc

        # Cache the imported command so repeated invocations do not need to
        # import the module again within the same process.
        self.add_command(command, cmd_name)
        return command


@click.group(
    cls=LazyGroup,
    context_settings={"help_option_names": ["-h", "--help"]},
    lazy_subcommands={
        "app": ("avatar.cli.app_cmd", "app_cmd"),
    },
)
def cli() -> None:
    """Avatar command line interface."""
