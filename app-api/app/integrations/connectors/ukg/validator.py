"""Validation helpers for UKG provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOURCE_OBJECTS = frozenset(
    {"Employees", "Schedules", "Timesheets", "Absences"}
)


def validate_ukg_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "ukg":
        raise ValueError("UKG adapter requires a ukg vendor context")
    if access_context.auth_mode not in {"oauth2", "api_key"}:
        raise ValueError("UKG pull requires an oauth2 or api_key connection")

    additional_headers = {
        name.lower(): value for name, value in access_context.additional_headers
    }
    if not additional_headers.get("global-tenant-id"):
        raise ValueError("UKG pull requires a global-tenant-id header")

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("UKG pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOURCE_OBJECTS
    )
    if unsupported:
        raise ValueError(f"Unsupported UKG source objects: {', '.join(unsupported)}")

    return source_objects
