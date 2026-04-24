from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

from avatar.config import get_app_config

from .models import AuthState, AuthenticatedUser, StoredUserRecord
from .store import load_auth_state, save_auth_state


def register_user(username: str, password: str) -> AuthenticatedUser:
    normalized_username = normalize_username(username)
    state = load_auth_state()
    existing_user = find_user_record(state, normalized_username)
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Username already exists.")

    password_salt = secrets.token_hex(16)
    password_hash = hash_password(password=password, salt=password_salt)
    state.users.append(
        StoredUserRecord(
            username=normalized_username,
            password_hash=password_hash,
            password_salt=password_salt,
        )
    )
    save_auth_state(state)
    return AuthenticatedUser(username=normalized_username)


def authenticate_user(username: str, password: str) -> str:
    normalized_username = normalize_username(username)
    state = load_auth_state()
    user_record = find_user_record(state, normalized_username)
    if user_record is None:
        raise_invalid_credentials()

    expected_hash = hash_password(password=password, salt=user_record.password_salt)
    if not hmac.compare_digest(expected_hash, user_record.password_hash):
        raise_invalid_credentials()

    return create_access_token(subject=normalized_username)


def get_authenticated_user(token: str) -> AuthenticatedUser:
    claims = decode_access_token(token)
    username = claims.get("sub")
    if not isinstance(username, str) or not username:
        raise_invalid_token()

    state = load_auth_state()
    user_record = find_user_record(state, username)
    if user_record is None:
        raise_invalid_token()
    return AuthenticatedUser(username=user_record.username)


def normalize_username(username: str) -> str:
    normalized_username = username.strip()
    if not normalized_username:
        raise HTTPException(status_code=400, detail="Username cannot be blank.")
    return normalized_username


def find_user_record(state: AuthState, username: str) -> StoredUserRecord | None:
    for user in state.users:
        if user.username == username:
            return user
    return None


def hash_password(*, password: str, salt: str) -> str:
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    )
    return base64.urlsafe_b64encode(derived_key).decode("utf-8")


def create_access_token(*, subject: str) -> str:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=get_app_config().auth_access_token_expire_minutes)
    payload = {
        "sub": subject,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return encode_jwt(payload)


def encode_jwt(payload: dict[str, int | str]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    encoded_header = encode_jwt_segment(header)
    encoded_payload = encode_jwt_segment(payload)
    signature = sign_jwt_message(f"{encoded_header}.{encoded_payload}")
    return f"{encoded_header}.{encoded_payload}.{signature}"


def decode_access_token(token: str) -> dict[str, object]:
    parts = token.split(".")
    if len(parts) != 3:
        raise_invalid_token()

    encoded_header, encoded_payload, encoded_signature = parts
    expected_signature = sign_jwt_message(f"{encoded_header}.{encoded_payload}")
    if not hmac.compare_digest(expected_signature, encoded_signature):
        raise_invalid_token()

    header = decode_jwt_segment(encoded_header)
    if header.get("alg") != "HS256" or header.get("typ") != "JWT":
        raise_invalid_token()

    payload = decode_jwt_segment(encoded_payload)
    expiration = payload.get("exp")
    if not isinstance(expiration, int):
        raise_invalid_token()
    if expiration < int(datetime.now(UTC).timestamp()):
        raise_invalid_token(detail="Access token has expired.")
    return payload


def encode_jwt_segment(value: dict[str, object]) -> str:
    raw_bytes = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw_bytes).rstrip(b"=").decode("utf-8")


def decode_jwt_segment(value: str) -> dict[str, object]:
    padding = "=" * (-len(value) % 4)
    try:
        decoded_bytes = base64.urlsafe_b64decode(f"{value}{padding}")
        decoded_value = json.loads(decoded_bytes)
    except (ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.") from error

    if not isinstance(decoded_value, dict):
        raise_invalid_token()
    return decoded_value


def sign_jwt_message(message: str) -> str:
    signature = hmac.new(
        get_app_config().auth_jwt_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(signature).rstrip(b"=").decode("utf-8")


def raise_invalid_credentials() -> None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")


def raise_invalid_token(*, detail: str = "Invalid access token.") -> None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
