"""Pagination utilities for connector extractors (cursor/keyset safe helpers)."""

from __future__ import annotations

import base64
import json
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, cast

_MAX_CURSOR_CHARS = 4096
_MAX_CURSOR_BYTES = 8192
_MAX_CURSOR_ITEMS = 32
_MAX_CURSOR_DEPTH = 4
_MAX_CURSOR_KEY_CHARS = 128
_MAX_CURSOR_STRING_CHARS = 1024
INVALID_CURSOR_MESSAGE = "Invalid cursor"
INVALID_CURSOR_PAYLOAD_TYPE_MESSAGE = "Invalid cursor payload type"


def _raise_invalid_cursor() -> None:
    raise ValueError(INVALID_CURSOR_MESSAGE)


def _require_cursor_mapping(value: Any) -> dict[Any, Any]:
    if not isinstance(value, dict):
        raise TypeError(INVALID_CURSOR_PAYLOAD_TYPE_MESSAGE)
    return cast("dict[Any, Any]", value)  # type: ignore[redundant-cast]


def _require_cursor_list(value: Any) -> list[Any]:
    if not isinstance(value, list):
        raise TypeError(INVALID_CURSOR_PAYLOAD_TYPE_MESSAGE)
    return cast("list[Any]", value)  # type: ignore[redundant-cast]


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
        raise ValueError(INVALID_CURSOR_MESSAGE)

    padding = "=" * ((4 - len(normalized) % 4) % 4)
    try:
        raw = base64.urlsafe_b64decode(f"{normalized}{padding}".encode())
        if len(raw) > _MAX_CURSOR_BYTES:
            _raise_invalid_cursor()
        decoded = json.loads(raw.decode("utf-8"))
    except ValueError as exc:
        raise ValueError(INVALID_CURSOR_MESSAGE) from exc

    if not isinstance(decoded, dict):
        raise TypeError(INVALID_CURSOR_PAYLOAD_TYPE_MESSAGE)
    _validate_cursor_payload(decoded, depth=0)

    return cast("dict[str, Any]", decoded)


def _validate_cursor_payload(value: Any, *, depth: int) -> None:
    if depth > _MAX_CURSOR_DEPTH:
        raise ValueError(INVALID_CURSOR_MESSAGE)

    if isinstance(value, dict):
        _validate_cursor_dict_payload(value, depth=depth)
        return

    if isinstance(value, list):
        _validate_cursor_list_payload(value, depth=depth)
        return

    if isinstance(value, str):
        _validate_cursor_string_payload(value)
        return

    if isinstance(value, (int, float, bool)) or value is None:
        return

    raise TypeError(INVALID_CURSOR_PAYLOAD_TYPE_MESSAGE)


def _validate_cursor_dict_payload(value: dict[Any, Any], *, depth: int) -> None:
    typed_value = _require_cursor_mapping(value)
    if len(typed_value) > _MAX_CURSOR_ITEMS:
        raise ValueError(INVALID_CURSOR_MESSAGE)
    for key, child in typed_value.items():
        if not isinstance(key, str) or len(key) > _MAX_CURSOR_KEY_CHARS:
            raise ValueError(INVALID_CURSOR_MESSAGE)
        _validate_cursor_payload(child, depth=depth + 1)


def _validate_cursor_list_payload(value: list[Any], *, depth: int) -> None:
    typed_items = _require_cursor_list(value)
    if len(typed_items) > _MAX_CURSOR_ITEMS:
        raise ValueError(INVALID_CURSOR_MESSAGE)
    for child in typed_items:
        _validate_cursor_payload(child, depth=depth + 1)


def _validate_cursor_string_payload(value: str) -> None:
    if len(value) > _MAX_CURSOR_STRING_CHARS:
        raise ValueError(INVALID_CURSOR_MESSAGE)


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
    raw_cursor = query.get("cursor")
    return PageWindow(
        limit=sanitize_limit(
            query.get("limit"),
            default_limit=default_limit,
            max_limit=max_limit,
        ),
        cursor=decode_cursor(raw_cursor if isinstance(raw_cursor, str) else None),
    )
