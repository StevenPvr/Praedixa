"""Authentication and secret-redaction utilities for connector runtime."""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

REDACTED = "***REDACTED***"
_SENSITIVE_KEY_MARKERS = frozenset(
    {
        "secret",
        "token",
        "password",
        "passphrase",
        "authorization",
        "api_key",
        "client_secret",
        "private_key",
        "refresh_token",
        "access_token",
    }
)


def _normalize_key_name(key: str) -> str:
    return key.strip().lower().replace("-", "_")


def is_sensitive_field(key: str) -> bool:
    """Return True when a field name should be redacted from logs."""
    normalized = _normalize_key_name(key)
    return any(marker in normalized for marker in _SENSITIVE_KEY_MARKERS)


def mask_secret(
    value: str | None,
    *,
    keep_prefix: int = 2,
    keep_suffix: int = 2,
) -> str:
    """Partially mask a secret for logs while preserving short diagnostics."""
    if value is None:
        return REDACTED

    if keep_prefix < 0 or keep_suffix < 0:
        raise ValueError("keep_prefix and keep_suffix must be >= 0")

    if value == "":
        return REDACTED

    if len(value) <= keep_prefix + keep_suffix:
        return REDACTED

    return f"{value[:keep_prefix]}...{value[-keep_suffix:]}"


def _redact_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            key: REDACTED if is_sensitive_field(key) else _redact_value(child)
            for key, child in value.items()
        }
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_redact_value(item) for item in value)
    return value


def redact_sensitive_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Recursively redact sensitive fields from an object used in logs."""
    return {
        key: REDACTED if is_sensitive_field(key) else _redact_value(value)
        for key, value in payload.items()
    }


@dataclass(frozen=True, slots=True)
class ConnectorAuthContext:
    """Runtime auth context for connector calls (safe to serialize for logs)."""

    organization_id: uuid.UUID
    connection_id: uuid.UUID | None = None
    secret_ref: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    api_key: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_safe_log_dict(self) -> dict[str, Any]:
        """Return a redacted representation suitable for application logs."""
        return {
            "organization_id": str(self.organization_id),
            "connection_id": str(self.connection_id) if self.connection_id else None,
            "secret_ref": mask_secret(self.secret_ref, keep_prefix=4, keep_suffix=0),
            "access_token": mask_secret(self.access_token),
            "refresh_token": mask_secret(self.refresh_token),
            "api_key": mask_secret(self.api_key),
            "metadata": redact_sensitive_payload(dict(self.metadata)),
        }
