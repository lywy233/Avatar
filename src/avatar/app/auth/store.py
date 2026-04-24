from __future__ import annotations

import json
from pathlib import Path

from .models import AuthState

AUTH_STATE_PATH = Path(".avatar/auth-state.json")


def load_auth_state() -> AuthState:
    if not AUTH_STATE_PATH.exists():
        return AuthState()

    payload = json.loads(AUTH_STATE_PATH.read_text(encoding="utf-8"))
    return AuthState.model_validate(payload)


def save_auth_state(state: AuthState) -> AuthState:
    normalized_state = AuthState.model_validate(state)
    AUTH_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUTH_STATE_PATH.write_text(
        normalized_state.model_dump_json(indent=2),
        encoding="utf-8",
    )
    return normalized_state
