"""Validation helpers for NCR Aloha provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOURCE_OBJECTS = frozenset({"Check", "Item", "Labor", "Inventory"})


def validate_ncr_aloha_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "ncr_aloha":
        raise ValueError("NCR Aloha adapter requires an ncr_aloha vendor context")
    if access_context.auth_mode != "api_key":
        raise ValueError("NCR Aloha pull requires an api_key connection")

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("NCR Aloha pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOURCE_OBJECTS
    )
    if unsupported:
        raise ValueError(
            f"Unsupported NCR Aloha source objects: {', '.join(unsupported)}"
        )

    return source_objects
