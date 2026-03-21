"""Validation helpers for Olo provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOURCE_OBJECTS = frozenset({"Orders", "Stores", "Products", "Promotions"})


def validate_olo_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "olo":
        raise ValueError("Olo adapter requires an olo vendor context")
    if access_context.auth_mode != "api_key":
        raise ValueError("Olo pull requires an api_key connection")

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("Olo pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOURCE_OBJECTS
    )
    if unsupported:
        raise ValueError(f"Unsupported Olo source objects: {', '.join(unsupported)}")

    return source_objects
