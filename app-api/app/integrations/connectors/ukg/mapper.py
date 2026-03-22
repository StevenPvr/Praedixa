"""Mapping helpers for UKG pull -> connector raw events."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.integrations.connectors._shared import require_object

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeClaimedSyncRun

_SUPPORTED_SOURCE_OBJECTS = frozenset(
    {"Employees", "Schedules", "Timesheets", "Absences"}
)
_DEFAULT_PAGE_SIZE = 200
_MAX_PAGE_SIZE = 1000
_DEFAULT_UPDATED_AFTER_PARAM = "updatedAfter"
_DEFAULT_UPDATED_BEFORE_PARAM = "updatedBefore"
_DEFAULT_PAGE_SIZE_PARAM = "pageSize"
_DEFAULT_CURSOR_PARAM = "cursor"
_DEFAULT_RECORD_ID_FIELDS = {
    "Employees": ("employeeId", "personId", "employeeNumber", "id"),
    "Schedules": ("scheduleId", "shiftId", "id"),
    "Timesheets": ("timesheetId", "timecardId", "punchId", "id"),
    "Absences": ("absenceId", "leaveId", "requestId", "id"),
}
_DEFAULT_UPDATED_AT_FIELDS = {
    "Employees": (
        "lastChangedDateTime",
        "updatedAt",
        "modifiedAt",
        "lastModifiedDateTime",
    ),
    "Schedules": (
        "lastChangedDateTime",
        "updatedAt",
        "modifiedAt",
        "lastModifiedDateTime",
        "startDateTime",
    ),
    "Timesheets": (
        "lastChangedDateTime",
        "updatedAt",
        "modifiedAt",
        "lastModifiedDateTime",
        "clockInDateTime",
    ),
    "Absences": (
        "lastChangedDateTime",
        "updatedAt",
        "modifiedAt",
        "lastModifiedDateTime",
        "startDateTime",
    ),
}


@dataclass(frozen=True)
class UkgObjectRequest:
    source_object: str
    path: str
    params: dict[str, str]
    items_path: str | None
    next_cursor_path: str | None
    cursor_param: str | None
    record_id_field: str | None
    updated_at_field: str | None


def build_ukg_requests(
    connection: dict[str, Any],
    source_objects: tuple[str, ...],
    claimed_run: RuntimeClaimedSyncRun,
) -> tuple[UkgObjectRequest, ...]:
    config = require_object(connection.get("config", {}), field="connection config")

    raw_endpoints = require_object(
        config.get("ukgEndpoints"),
        field="config.ukgEndpoints",
    )

    requests: list[UkgObjectRequest] = []
    for source_object in source_objects:
        if source_object not in _SUPPORTED_SOURCE_OBJECTS:
            raise ValueError(f"Unsupported UKG source object: {source_object}")
        raw_endpoint = require_object(
            raw_endpoints.get(source_object),
            field=f"config.ukgEndpoints.{source_object}",
        )

        path = _required_string(raw_endpoint.get("path"), f"{source_object}.path")
        params = _build_request_params(raw_endpoint, claimed_run)
        requests.append(
            UkgObjectRequest(
                source_object=source_object,
                path=path,
                params=params,
                items_path=_optional_string(raw_endpoint.get("itemsPath")),
                next_cursor_path=_optional_string(raw_endpoint.get("nextCursorPath")),
                cursor_param=(
                    _optional_string(raw_endpoint.get("cursorParam"))
                    or _DEFAULT_CURSOR_PARAM
                ),
                record_id_field=_optional_string(raw_endpoint.get("recordIdField")),
                updated_at_field=_optional_string(raw_endpoint.get("updatedAtField")),
            )
        )
    return tuple(requests)


def map_ukg_record_to_event(
    source_object: str,
    record: dict[str, Any],
    *,
    record_id_field: str | None,
    updated_at_field: str | None,
) -> dict[str, object]:
    record_id = _resolve_record_value(
        record,
        record_id_field,
        _DEFAULT_RECORD_ID_FIELDS[source_object],
    )
    if record_id is None:
        raise ValueError(f"UKG {source_object} record is missing an identifier")

    source_updated_at = _resolve_record_value(
        record,
        updated_at_field,
        _DEFAULT_UPDATED_AT_FIELDS[source_object],
    )
    event_id = f"ukg:{source_object}:{record_id}:{source_updated_at or 'na'}"

    return {
        "eventId": event_id,
        "sourceObject": source_object,
        "sourceRecordId": record_id,
        "sourceUpdatedAt": source_updated_at,
        "contentType": "application/json",
        "payload": {
            "provider": "ukg",
            "sourceObject": source_object,
            "record": record,
        },
    }


def _build_request_params(
    raw_endpoint: dict[str, Any],
    claimed_run: RuntimeClaimedSyncRun,
) -> dict[str, str]:
    params = _normalize_string_map(raw_endpoint.get("staticParams"), "staticParams")

    page_size = raw_endpoint.get("pageSize", _DEFAULT_PAGE_SIZE)
    if not isinstance(page_size, int) or page_size < 1 or page_size > _MAX_PAGE_SIZE:
        raise ValueError(
            f"UKG endpoint pageSize must be an integer between 1 and {_MAX_PAGE_SIZE}"
        )
    page_size_param = (
        _optional_string(raw_endpoint.get("pageSizeParam")) or _DEFAULT_PAGE_SIZE_PARAM
    )
    params[page_size_param] = str(page_size)

    if claimed_run.force_full_sync:
        return params

    updated_after_param = (
        _optional_string(raw_endpoint.get("updatedAfterParam"))
        or _DEFAULT_UPDATED_AFTER_PARAM
    )
    updated_before_param = (
        _optional_string(raw_endpoint.get("updatedBeforeParam"))
        or _DEFAULT_UPDATED_BEFORE_PARAM
    )
    if claimed_run.source_window_start is not None:
        params[updated_after_param] = claimed_run.source_window_start
    if claimed_run.source_window_end is not None:
        params[updated_before_param] = claimed_run.source_window_end
    return params


def _normalize_string_map(value: Any, field: str) -> dict[str, str]:
    if value is None:
        return {}

    mapping = require_object(value, field=f"endpoint {field}")
    normalized: dict[str, str] = {}
    for raw_key, raw_value in mapping.items():
        key = str(raw_key).strip()
        if not key:
            raise ValueError(f"endpoint {field} contains an empty key")
        if isinstance(raw_value, bool):
            normalized[key] = "true" if raw_value else "false"
            continue
        if isinstance(raw_value, (int, float)):
            normalized[key] = str(raw_value)
            continue
        text_value = _optional_string(raw_value)
        if text_value is None:
            raise ValueError(
                f"endpoint {field}.{key} must be a string, number or boolean"
            )
        normalized[key] = text_value
    return normalized


def _resolve_record_value(
    record: dict[str, Any],
    explicit_field: str | None,
    fallback_fields: tuple[str, ...],
) -> str | None:
    candidate_fields = (
        (explicit_field,) if explicit_field is not None else fallback_fields
    )
    for field in candidate_fields:
        raw_value = record.get(field)
        if raw_value is None:
            continue
        text = str(raw_value).strip()
        if text:
            return text
    return None


def _required_string(value: Any, field: str) -> str:
    text = _optional_string(value)
    if text is None:
        raise ValueError(f"UKG endpoint {field} must be configured")
    if not text.startswith("/"):
        raise ValueError(f"UKG endpoint {field} must start with '/'")
    return text


def _optional_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None
