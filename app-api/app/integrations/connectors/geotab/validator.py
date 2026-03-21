"""Validation helpers for Geotab provider pull."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeProviderAccessContext

_SUPPORTED_SOURCE_OBJECTS = frozenset({"Trip", "Device", "FaultData", "StatusData"})


def validate_geotab_pull_context(
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
) -> tuple[str, ...]:
    if access_context.vendor != "geotab":
        raise ValueError("Geotab adapter requires a geotab vendor context")
    if access_context.auth_mode != "session":
        raise ValueError("Geotab pull requires a session connection")

    credential_fields = dict(access_context.credential_fields)
    required_fields = ("database", "userName", "password")
    missing_fields = [
        field
        for field in required_fields
        if not isinstance(credential_fields.get(field), str)
        or not str(credential_fields[field]).strip()
    ]
    if missing_fields:
        raise ValueError(
            f"Geotab pull requires credentialFields: {', '.join(missing_fields)}"
        )

    source_objects = tuple(
        str(item).strip()
        for item in connection.get("sourceObjects", access_context.source_objects)
        if str(item).strip()
    )
    if not source_objects:
        raise ValueError("Geotab pull requires at least one source object")

    unsupported = sorted(
        source_object
        for source_object in source_objects
        if source_object not in _SUPPORTED_SOURCE_OBJECTS
    )
    if unsupported:
        raise ValueError(
            f"Unsupported Geotab source objects: {', '.join(unsupported)}"
        )

    return source_objects
