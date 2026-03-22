"""Salesforce provider pull orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, cast

from app.integrations.connectors._shared import ingest_provider_event_batches
from app.integrations.connectors.salesforce.client import SalesforceApiClient
from app.integrations.connectors.salesforce.mapper import (
    build_salesforce_queries,
    map_salesforce_record_to_event,
    resolve_salesforce_api_version,
)
from app.integrations.connectors.salesforce.validator import (
    validate_salesforce_pull_context,
)

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
        RuntimeProviderAccessContext,
    )

_SALESFORCE_SCHEMA_VERSION = "salesforce.rest.v1"


@dataclass(frozen=True)
class SalesforcePullResult:
    """Summary of one Salesforce pull execution."""

    fetched_records: int
    accepted_events: int
    duplicate_events: int

async def pull_salesforce_connection(
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: RuntimeProviderAccessContext,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> SalesforcePullResult:
    source_objects = validate_salesforce_pull_context(connection, access_context)
    config = connection.get("config", {})
    if not isinstance(config, dict):
        raise TypeError("Salesforce connection config must be an object")
    api_version = resolve_salesforce_api_version(cast("dict[str, Any]", config))

    salesforce_client = SalesforceApiClient(
        base_url=access_context.base_url,
        header_name=access_context.header_name,
        header_value=access_context.header_value,
    )
    try:
        fetched_records = 0
        accepted_events = 0
        duplicate_events = 0
        for query in build_salesforce_queries(source_objects, claimed_run):
            records = await salesforce_client.query_records(
                api_version=api_version,
                soql=query.soql,
            )
            fetched_records += len(records)
            events = [
                map_salesforce_record_to_event(query.source_object, record)
                for record in records
            ]
            ingest_totals = await ingest_provider_event_batches(
                runtime_client,
                claimed_run,
                worker_id=worker_id,
                schema_version=_SALESFORCE_SCHEMA_VERSION,
                events=events,
            )
            accepted_events += ingest_totals.accepted_events
            duplicate_events += ingest_totals.duplicate_events
    finally:
        await salesforce_client.aclose()

    return SalesforcePullResult(
        fetched_records=fetched_records,
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
