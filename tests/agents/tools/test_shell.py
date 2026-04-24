from __future__ import annotations

import asyncio

from avatar.agents.tools.shell import (
    _prepare_command_for_shell,
    execute_shell_command,
)


def _response_text(response) -> str:
    return response.content[0]["text"]


def test_prepare_command_rewrites_compound_background() -> None:
    assert _prepare_command_for_shell("printf one && sleep 1 &") == "printf one && { sleep 1 & }"
    assert _prepare_command_for_shell("printf one || sleep 1 &") == "printf one || { sleep 1 & }"


def test_prepare_command_preserves_quoted_control_operators() -> None:
    command = "printf '%s' 'A && B &'"

    assert _prepare_command_for_shell(command) == command


def test_execute_shell_command_supports_bash_syntax_and_quoted_spaces() -> None:
    response = asyncio.run(
        execute_shell_command(
            'if [[ "alpha beta" == "alpha beta" ]]; then printf "%s" "works"; fi',
        ),
    )

    assert _response_text(response) == "works"


def test_execute_shell_command_preserves_argument_spaces() -> None:
    response = asyncio.run(
        execute_shell_command(
            'python -c "import sys; print(sys.argv[1])" "hello spaced world"',
        ),
    )

    assert _response_text(response) == "hello spaced world"
