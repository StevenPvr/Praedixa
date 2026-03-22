"""NCR Aloha provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.integrations.connectors._shared import ingest_provider_event_batches
from app.integrations.connectors.ncr_aloha.client import NcrAlohaApiClient
from app.integrations.connectors.ncr_aloha.mapper import (
    build_ncr_aloha_requests,
    map_ncr_aloha_record_to_event,
)
from app.integrations.connectors.ncr_aloha.validator import (
    validate_ncr_aloha_pull_context,
)

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )
_NCR_ALOHA_SCHEMA_VERSION = "ncr_aloha.pos.v1"


@dataclass(frozen=True)
class NcrAlohaPullResult:
    """Summary of one NCR Aloha pull execution."""

    fetched_records: int
    accepted_events: int
    duplicate_events: int

async def pull_ncr_aloha_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> NcrAlohaPullResult:
    source_objects = validate_ncr_aloha_pull_context(connection, access_context)
    requests = build_ncr_aloha_requests(connection, source_objects, claimed_run)
    additional_headers = dict(access_context.additional_headers)

    ncr_aloha_client = NcrAlohaApiClient(
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
            records = await ncr_aloha_client.get_records(
                request.path,
                params=request.params,
                items_path=request.items_path,
                next_cursor_path=request.next_cursor_path,
                cursor_param=request.cursor_param,
            )
            fetched_records += len(records)
            events = [
                map_ncr_aloha_record_to_event(
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
                schema_version=_NCR_ALOHA_SCHEMA_VERSION,
                events=events,
            )
            accepted_events += ingest_totals.accepted_events
            duplicate_events += ingest_totals.duplicate_events
    finally:
        await ncr_aloha_client.aclose()

    return NcrAlohaPullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
