"""CDK provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.integrations.connectors._shared import ingest_provider_event_batches
from app.integrations.connectors.cdk.client import CdkApiClient
from app.integrations.connectors.cdk.mapper import (
    build_cdk_requests,
    map_cdk_record_to_event,
)
from app.integrations.connectors.cdk.validator import validate_cdk_pull_context

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )

_CDK_SCHEMA_VERSION = "cdk.dms.v1"


@dataclass(frozen=True)
class CdkPullResult:
    """Summary of one CDK pull execution."""

    fetched_records: int
    accepted_events: int
    duplicate_events: int

async def pull_cdk_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> CdkPullResult:
    source_objects = validate_cdk_pull_context(connection, access_context)
    requests = build_cdk_requests(connection, source_objects, claimed_run)
    credential_fields = dict(access_context.credential_fields)
    additional_headers = dict(access_context.additional_headers)

    cdk_client = CdkApiClient(
        base_url=access_context.base_url,
        client_id=credential_fields["clientId"],
        client_secret=credential_fields["clientSecret"],
        additional_headers=additional_headers,
    )
    try:
        fetched_records = 0
        accepted_events = 0
        duplicate_events = 0
        for request in requests:
            records = await cdk_client.get_records(
                request.path,
                params=request.params,
                items_path=request.items_path,
                next_cursor_path=request.next_cursor_path,
                cursor_param=request.cursor_param,
            )
            fetched_records += len(records)
            events = [
                map_cdk_record_to_event(
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
                schema_version=_CDK_SCHEMA_VERSION,
                events=events,
            )
            accepted_events += ingest_totals.accepted_events
            duplicate_events += ingest_totals.duplicate_events
    finally:
        await cdk_client.aclose()

    return CdkPullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
