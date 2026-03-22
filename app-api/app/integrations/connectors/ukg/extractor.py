"""UKG provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.integrations.connectors._shared import ingest_provider_event_batches
from app.integrations.connectors.ukg.client import UkgApiClient
from app.integrations.connectors.ukg.mapper import (
    build_ukg_requests,
    map_ukg_record_to_event,
)
from app.integrations.connectors.ukg.validator import validate_ukg_pull_context

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )

_UKG_SCHEMA_VERSION = "ukg.workforce.v1"


@dataclass(frozen=True)
class UkgPullResult:
    """Summary of one UKG pull execution."""

    fetched_records: int
    accepted_events: int
    duplicate_events: int

async def pull_ukg_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> UkgPullResult:
    source_objects = validate_ukg_pull_context(connection, access_context)
    requests = build_ukg_requests(connection, source_objects, claimed_run)
    additional_headers = dict(access_context.additional_headers)

    ukg_client = UkgApiClient(
        base_url=access_context.base_url,
        header_name=access_context.header_name,
        header_value=access_context.header_value,
        additional_headers=additional_headers,
    )
    try:
        fetched_records = 0
        accepted_events = 0
        duplicate_events = 0
        for request in requests:
            records = await ukg_client.get_records(
                request.path,
                params=request.params,
                items_path=request.items_path,
                next_cursor_path=request.next_cursor_path,
                cursor_param=request.cursor_param,
            )
            fetched_records += len(records)
            events = [
                map_ukg_record_to_event(
                    request.source_object,
                    record,
                    record_id_field=request.record_id_field,
                    updated_at_field=request.updated_at_field,
                )
                for record in records
            ]
            ingest_totals = await ingest_provider_event_batches(
                runtime_client,
                claimed_run,
                worker_id=worker_id,
                schema_version=_UKG_SCHEMA_VERSION,
                events=events,
            )
            accepted_events += ingest_totals.accepted_events
            duplicate_events += ingest_totals.duplicate_events
    finally:
        await ukg_client.aclose()

    return UkgPullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
