"""Validation helpers for Blue Yonder provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOURCE_OBJECTS = frozenset(
    {"DemandPlan", "LaborPlan", "Store", "SKU"}
)


def validate_blue_yonder_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "blue_yonder":
        raise ValueError(
            "Blue Yonder adapter requires a blue_yonder vendor context"
        )
    if access_context.auth_mode != "api_key":
        raise ValueError("Blue Yonder pull requires an api_key connection")

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("Blue Yonder pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOURCE_OBJECTS
    )
    if unsupported:
        raise ValueError(
            f"Unsupported Blue Yonder source objects: {', '.join(unsupported)}"
        )

    return source_objects
