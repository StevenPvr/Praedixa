"""Validation helpers for Oracle TM provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOURCE_OBJECTS = frozenset({"Shipment", "OrderRelease", "Route", "Stop"})


def validate_oracle_tm_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "oracle_tm":
        raise ValueError("Oracle TM adapter requires an oracle_tm vendor context")
    if access_context.auth_mode != "oauth2":
        raise ValueError("Oracle TM pull requires an oauth2 connection")
    if access_context.header_name.lower() != "authorization":
        raise ValueError("Oracle TM pull requires a bearer authorization header")
    if not access_context.header_value.startswith("Bearer "):
        raise ValueError("Oracle TM pull requires a Bearer access token")

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("Oracle TM pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOURCE_OBJECTS
    )
    if unsupported:
        raise ValueError(
            f"Unsupported Oracle TM source objects: {', '.join(unsupported)}"
        )

    return source_objects
