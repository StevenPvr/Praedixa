"""Pagination utilities for connector extractors (cursor/keyset safe helpers)."""

from __future__ import annotations

import base64
import json
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

_MAX_CURSOR_CHARS = 4096
_MAX_CURSOR_BYTES = 8192
_MAX_CURSOR_ITEMS = 32
_MAX_CURSOR_DEPTH = 4
_MAX_CURSOR_KEY_CHARS = 128
_MAX_CURSOR_STRING_CHARS = 1024


def _raise_invalid_cursor() -> None:
    raise ValueError("Invalid cursor")


def sanitize_limit(
    raw_limit: str | int | None,
    *,
    default_limit: int = 200,
    max_limit: int = 1000,
) -> int:
    """Parse and clamp page size to a safe upper bound."""
    if default_limit <= 0:
        raise ValueError("default_limit must be > 0")
    if max_limit <= 0:
        raise ValueError("max_limit must be > 0")
    if max_limit < default_limit:
        raise ValueError("max_limit must be >= default_limit")

    if raw_limit is None:
        return default_limit

    if isinstance(raw_limit, int):
        parsed = raw_limit
    else:
        value = raw_limit.strip()
        if value == "":
            return default_limit
        parsed = int(value)

    if parsed < 1:
        return 1
    if parsed > max_limit:
        return max_limit
    return parsed


def encode_cursor(payload: Mapping[str, Any]) -> str:
    """Encode a JSON cursor as URL-safe base64 without padding."""
    serialized = json.dumps(
        payload,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return base64.urlsafe_b64encode(serialized).decode("utf-8").rstrip("=")


def decode_cursor(cursor: str | None) -> dict[str, Any] | None:
    """Decode a URL-safe base64 cursor and validate object shape."""
    if cursor is None:
        return None

    normalized = cursor.strip()
    if normalized == "":
        return None
    if len(normalized) > _MAX_CURSOR_CHARS:
        raise ValueError("Invalid cursor")

    padding = "=" * ((4 - len(normalized) % 4) % 4)
    try:
        raw = base64.urlsafe_b64decode(f"{normalized}{padding}".encode())
        if len(raw) > _MAX_CURSOR_BYTES:
            _raise_invalid_cursor()
        decoded = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid cursor") from exc

    if not isinstance(decoded, dict):
        raise TypeError("Invalid cursor payload type")
    _validate_cursor_payload(decoded, depth=0)

    return decoded


def _validate_cursor_payload(value: Any, *, depth: int) -> None:
    if depth > _MAX_CURSOR_DEPTH:
        raise ValueError("Invalid cursor")

    if isinstance(value, dict):
        if len(value) > _MAX_CURSOR_ITEMS:
            raise ValueError("Invalid cursor")
        for key, child in value.items():
            if not isinstance(key, str) or len(key) > _MAX_CURSOR_KEY_CHARS:
                raise ValueError("Invalid cursor")
            _validate_cursor_payload(child, depth=depth + 1)
        return

    if isinstance(value, list):
        if len(value) > _MAX_CURSOR_ITEMS:
            raise ValueError("Invalid cursor")
        for child in value:
            _validate_cursor_payload(child, depth=depth + 1)
        return

    if isinstance(value, str):
        if len(value) > _MAX_CURSOR_STRING_CHARS:
            raise ValueError("Invalid cursor")
        return

    if isinstance(value, (int, float, bool)) or value is None:
        return

    raise TypeError("Invalid cursor payload type")


@dataclass(frozen=True, slots=True)
class PageWindow:
    """Normalized connector pagination window."""

    limit: int
    cursor: dict[str, Any] | None


def parse_page_window(
    query: Mapping[str, str | int | None],
    *,
    default_limit: int = 200,
    max_limit: int = 1000,
) -> PageWindow:
    """Build a normalized page-window object from untrusted query parameters."""
    return PageWindow(
        limit=sanitize_limit(
            query.get("limit"),
            default_limit=default_limit,
            max_limit=max_limit,
        ),
        cursor=decode_cursor(
            query.get("cursor") if isinstance(query.get("cursor"), str) else None
        ),
    )
