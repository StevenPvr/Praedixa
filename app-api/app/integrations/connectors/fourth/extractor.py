"""Fourth provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import islice
from typing import TYPE_CHECKING, Any

from app.integrations.connectors.fourth.client import FourthApiClient
from app.integrations.connectors.fourth.mapper import (
    build_fourth_requests,
    map_fourth_record_to_event,
)
from app.integrations.connectors.fourth.validator import (
    validate_fourth_pull_context,
)

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )

_MAX_PROVIDER_INGEST_BATCH = 200
_FOURTH_SCHEMA_VERSION = "fourth.wfm.v1"


@dataclass(frozen=True)
class FourthPullResult:
    """Summary of one Fourth pull execution."""

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


async def pull_fourth_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> FourthPullResult:
    source_objects = validate_fourth_pull_context(connection, access_context)
    requests = build_fourth_requests(connection, source_objects, claimed_run)
    additional_headers = dict(access_context.additional_headers)

    fourth_client = FourthApiClient(
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
            records = await fourth_client.get_records(
                request.path,
                params=request.params,
                items_path=request.items_path,
                next_cursor_path=request.next_cursor_path,
                cursor_param=request.cursor_param,
            )
            fetched_records += len(records)
            events = [
                map_fourth_record_to_event(
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
                    schema_version=_FOURTH_SCHEMA_VERSION,
                    events=chunk,
                )
                accepted_events += int(ingest_result.get("accepted", 0))
                duplicate_events += int(ingest_result.get("duplicates", 0))
    finally:
        await fourth_client.aclose()

    return FourthPullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
