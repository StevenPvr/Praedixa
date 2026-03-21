"""Blue Yonder provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import islice
from typing import TYPE_CHECKING, Any

from app.integrations.connectors.blue_yonder.client import BlueYonderApiClient
from app.integrations.connectors.blue_yonder.mapper import (
    build_blue_yonder_requests,
    map_blue_yonder_record_to_event,
)
from app.integrations.connectors.blue_yonder.validator import (
    validate_blue_yonder_pull_context,
)

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )

_MAX_PROVIDER_INGEST_BATCH = 200
_BLUE_YONDER_SCHEMA_VERSION = "blue_yonder.supply_chain.v1"


@dataclass(frozen=True)
class BlueYonderPullResult:
    """Summary of one Blue Yonder pull execution."""

    fetched_records: int
    accepted_events: int
    duplicate_events: int


def _chunk_events(
    events: list[dict[str, object]],
    chunk_size: int = _MAX_PROVIDER_INGEST_BATCH,
) -> tuple[list[dict[str, object]], ...]:
    chunks: list[list[dict[str, object]]] = []
    iterator = iter(events)
    while True:
        chunk = list(islice(iterator, chunk_size))
        if not chunk:
            break
        chunks.append(chunk)
    return tuple(chunks)


async def pull_blue_yonder_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> BlueYonderPullResult:
    source_objects = validate_blue_yonder_pull_context(connection, access_context)
    requests = build_blue_yonder_requests(connection, source_objects, claimed_run)
    additional_headers = dict(access_context.additional_headers)

    blue_yonder_client = BlueYonderApiClient(
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
            records = await blue_yonder_client.get_records(
                request.path,
                params=request.params,
                items_path=request.items_path,
                next_cursor_path=request.next_cursor_path,
                cursor_param=request.cursor_param,
            )
            fetched_records += len(records)
            events = [
                map_blue_yonder_record_to_event(
                    request.source_object,
                    record,
                    record_id_field=request.record_id_field,
                    updated_at_field=request.updated_at_field,
                )
                for record in records
            ]
            for chunk in _chunk_events(events):
                ingest_result = await runtime_client.ingest_provider_events(
                    claimed_run.organization_id,
                    claimed_run.connection_id,
                    sync_run_id=claimed_run.id,
                    worker_id=worker_id,
                    schema_version=_BLUE_YONDER_SCHEMA_VERSION,
                    events=chunk,
                )
                accepted_events += int(ingest_result.get("accepted", 0))
                duplicate_events += int(ingest_result.get("duplicates", 0))
    finally:
        await blue_yonder_client.aclose()

    return BlueYonderPullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
