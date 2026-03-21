"""Validation helpers for Salesforce provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOBJECTS = frozenset({"Account", "Opportunity", "Case", "Task"})


def validate_salesforce_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "salesforce":
        raise ValueError("Salesforce adapter requires a salesforce vendor context")
    if access_context.auth_mode != "oauth2":
        raise ValueError("Salesforce pull requires an oauth2 connection")
    if access_context.header_name.lower() != "authorization":
        raise ValueError("Salesforce pull requires a bearer authorization header")
    if not access_context.header_value.startswith("Bearer "):
        raise ValueError("Salesforce pull requires a Bearer access token")

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("Salesforce pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOBJECTS
    )
    if unsupported:
        raise ValueError(
            f"Unsupported Salesforce source objects: {', '.join(unsupported)}"
        )

    return source_objects
