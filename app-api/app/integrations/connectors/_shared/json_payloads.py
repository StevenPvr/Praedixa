"""Typed JSON payload helpers shared by connector clients and mappers."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, cast


def require_object(value: Any, *, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise TypeError(f"{field} must be an object")
    return cast("dict[str, Any]", value)


def require_record_sequence(value: Any, *, field: str) -> Sequence[object]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        raise TypeError(f"{field} must be a list")
    return cast("Sequence[object]", value)


def get_path(value: Any, path: str) -> Any:
    current: object = value
    for segment in path.split("."):
        if not isinstance(current, Mapping):
            return None
        current_mapping = cast("Mapping[str, Any]", current)
        current = current_mapping.get(segment)
    return current
