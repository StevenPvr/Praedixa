"""Geotab provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.integrations.connectors._shared import ingest_provider_event_batches
from app.integrations.connectors.geotab.client import GeotabApiClient
from app.integrations.connectors.geotab.mapper import (
    build_geotab_requests,
    map_geotab_record_to_event,
    resolve_geotab_from_version,
)
from app.integrations.connectors.geotab.validator import (
    validate_geotab_pull_context,
)

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )
    from app.services.integration_sftp_runtime_worker import RuntimeSyncRunExecutionPlan

_GEOTAB_SCHEMA_VERSION = "geotab.feed.v1"


@dataclass(frozen=True)
class GeotabPullResult:
    """Summary of one Geotab pull execution."""

    fetched_records: int
    accepted_events: int
    duplicate_events: int

async def pull_geotab_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
    execution_plan: RuntimeSyncRunExecutionPlan | None,
) -> GeotabPullResult:
    if execution_plan is None:
        raise ValueError("Geotab pull requires the claimed execution plan")

    source_objects = validate_geotab_pull_context(connection, access_context)
    requests = build_geotab_requests(connection, source_objects, claimed_run)
    credential_fields = dict(access_context.credential_fields)

    geotab_client = GeotabApiClient(base_url=access_context.base_url)
    try:
        credentials = await geotab_client.authenticate(
            database=credential_fields["database"],
            username=credential_fields["userName"],
            password=credential_fields["password"],
        )
        fetched_records = 0
        accepted_events = 0
        duplicate_events = 0
        for request in requests:
            from_version = None
            if not claimed_run.force_full_sync:
                from_version = resolve_geotab_from_version(
                    execution_plan.sync_states,
                    request.source_object,
                )

            if from_version is not None:
                records, next_version = await geotab_client.get_feed_records(
                    type_name=request.type_name,
                    credentials=credentials,
                    from_version=from_version,
                    search=None,
                    results_limit=request.results_limit,
                )
            elif request.use_get_on_initial_sync:
                records = await geotab_client.get_records(
                    type_name=request.type_name,
                    credentials=credentials,
                    search=request.search,
                )
                next_version = await geotab_client.get_feed_tail_version(
                    type_name=request.type_name,
                    credentials=credentials,
                )
            else:
                records, next_version = await geotab_client.get_feed_records(
                    type_name=request.type_name,
                    credentials=credentials,
                    from_version=None,
                    search=request.search,
                    results_limit=request.results_limit,
                )

            fetched_records += len(records)
            events = [
                map_geotab_record_to_event(
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
                schema_version=_GEOTAB_SCHEMA_VERSION,
                events=events,
            )
            accepted_events += ingest_totals.accepted_events
            duplicate_events += ingest_totals.duplicate_events

            if next_version is not None:
                await runtime_client.upsert_sync_run_state(
                    claimed_run.organization_id,
                    claimed_run.id,
                    worker_id,
                    source_object=request.source_object,
                    watermark_text=next_version,
                    watermark_at=claimed_run.source_window_end,
                    cursor_json={"fromVersion": next_version},
                )
    finally:
        await geotab_client.aclose()

    return GeotabPullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
