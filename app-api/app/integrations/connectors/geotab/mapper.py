"""Mapping helpers for Geotab pull -> connector raw events."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.integrations.connectors._shared import require_object

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeClaimedSyncRun
    from app.services.integration_sftp_runtime_worker import RuntimeConnectionSyncState

_SUPPORTED_SOURCE_OBJECTS = frozenset({"Trip", "Device", "FaultData", "StatusData"})
_DEFAULT_RESULTS_LIMIT = 5_000
_MAX_RESULTS_LIMIT = 50_000
_DEFAULT_FROM_DATE_FIELDS = {
    "Trip": "fromDate",
    "FaultData": "fromDate",
    "StatusData": "fromDate",
}
_DEFAULT_TO_DATE_FIELDS = {
    "Trip": "toDate",
    "FaultData": "toDate",
    "StatusData": "toDate",
}
_DEFAULT_RECORD_ID_FIELDS = {
    "Trip": ("id",),
    "Device": ("id", "serialNumber", "vehicleIdentificationNumber"),
    "FaultData": ("id",),
    "StatusData": ("id",),
}
_DEFAULT_UPDATED_AT_FIELDS = {
    "Trip": ("stop", "start", "version"),
    "Device": ("version",),
    "FaultData": ("dateTime", "version"),
    "StatusData": ("dateTime", "version"),
}


@dataclass(frozen=True)
class GeotabFeedRequest:
    source_object: str
    type_name: str
    results_limit: int
    search: dict[str, Any] | None
    record_id_field: str | None
    updated_at_field: str | None
    use_get_on_initial_sync: bool


def build_geotab_requests(
    connection: dict[str, Any],
    source_objects: tuple[str, ...],
    claimed_run: RuntimeClaimedSyncRun,
) -> tuple[GeotabFeedRequest, ...]:
    config = require_object(
        connection.get("config", {}),
        field="Geotab connection config",
    )
    raw_feeds = require_object(
        config.get("geotabFeeds"),
        field="Geotab config.geotabFeeds",
    )

    requests: list[GeotabFeedRequest] = []
    for source_object in source_objects:
        if source_object not in _SUPPORTED_SOURCE_OBJECTS:
            raise ValueError(f"Unsupported Geotab source object: {source_object}")

        raw_feed = require_object(
            raw_feeds.get(source_object),
            field=f"Geotab config.geotabFeeds.{source_object}",
        )

        type_name = _optional_string(raw_feed.get("typeName")) or source_object
        results_limit = _normalize_results_limit(raw_feed.get("resultsLimit"))
        search = _build_search(source_object, raw_feed, claimed_run)
        use_get_on_initial_sync = _normalize_use_get_on_initial_sync(
            source_object,
            raw_feed.get("useGetOnInitialSync"),
        )
        requests.append(
            GeotabFeedRequest(
                source_object=source_object,
                type_name=type_name,
                results_limit=results_limit,
                search=search,
                record_id_field=_optional_string(raw_feed.get("recordIdField")),
                updated_at_field=_optional_string(raw_feed.get("updatedAtField")),
                use_get_on_initial_sync=use_get_on_initial_sync,
            )
        )

    return tuple(requests)


def map_geotab_record_to_event(
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
        raise ValueError(f"Geotab {source_object} record is missing an identifier")

    source_updated_at = _resolve_record_value(
        record,
        updated_at_field,
        _DEFAULT_UPDATED_AT_FIELDS[source_object],
    )
    event_id = f"geotab:{source_object}:{record_id}:{source_updated_at or 'na'}"

    return {
        "eventId": event_id,
        "sourceObject": source_object,
        "sourceRecordId": record_id,
        "sourceUpdatedAt": source_updated_at,
        "contentType": "application/json",
        "payload": {
            "provider": "geotab",
            "sourceObject": source_object,
            "record": record,
        },
    }


def resolve_geotab_from_version(
    sync_states: tuple[RuntimeConnectionSyncState, ...],
    source_object: str,
) -> str | None:
    for sync_state in sync_states:
        if sync_state.source_object != source_object:
            continue
        raw_from_version = sync_state.cursor_json.get("fromVersion")
        if not isinstance(raw_from_version, str):
            continue
        text = raw_from_version.strip()
        if text:
            return text
    return None


def _build_search(
    source_object: str,
    raw_feed: dict[str, Any],
    claimed_run: RuntimeClaimedSyncRun,
) -> dict[str, Any] | None:
    base_search = _normalize_search(raw_feed.get("search"), source_object)
    if claimed_run.force_full_sync:
        return base_search or None

    search = dict(base_search)
    from_date_field = _optional_string(raw_feed.get("fromDateField"))
    if from_date_field is None:
        from_date_field = _DEFAULT_FROM_DATE_FIELDS.get(source_object)
    to_date_field = _optional_string(raw_feed.get("toDateField"))
    if to_date_field is None:
        to_date_field = _DEFAULT_TO_DATE_FIELDS.get(source_object)

    if from_date_field is not None and claimed_run.source_window_start is not None:
        search[from_date_field] = claimed_run.source_window_start
    if to_date_field is not None and claimed_run.source_window_end is not None:
        search[to_date_field] = claimed_run.source_window_end
    return search or None


def _normalize_search(value: Any, source_object: str) -> dict[str, Any]:
    if value is None:
        return {}
    return require_object(value, field=f"Geotab {source_object} feed search")


def _normalize_results_limit(value: Any) -> int:
    if value is None:
        return _DEFAULT_RESULTS_LIMIT
    if not isinstance(value, int) or value < 1 or value > _MAX_RESULTS_LIMIT:
        raise ValueError(
            f"Geotab resultsLimit must be an integer between 1 and {_MAX_RESULTS_LIMIT}"
        )
    return value


def _normalize_use_get_on_initial_sync(source_object: str, value: Any) -> bool:
    if value is None:
        return source_object == "Device"
    if not isinstance(value, bool):
        raise TypeError("Geotab useGetOnInitialSync must be a boolean")
    return value


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


def _optional_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None
