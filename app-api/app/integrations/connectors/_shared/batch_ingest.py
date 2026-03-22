"""Shared chunked ingest helpers for connector pull extractors."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from itertools import islice
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
    )

DEFAULT_PROVIDER_INGEST_BATCH = 200


@dataclass(frozen=True)
class IngestBatchTotals:
    """Accepted and duplicate counters accumulated across ingest batches."""

    accepted_events: int
    duplicate_events: int


def _chunk_events(
    events: list[dict[str, object]],
    chunk_size: int,
) -> Iterator[list[dict[str, object]]]:
    iterator = iter(events)
    while True:
        chunk = list(islice(iterator, chunk_size))
        if not chunk:
            return
        yield chunk


async def ingest_provider_event_batches(
    runtime_client: ConnectorsRuntimeClient,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
    schema_version: str,
    events: list[dict[str, object]],
    chunk_size: int = DEFAULT_PROVIDER_INGEST_BATCH,
) -> IngestBatchTotals:
    """Ingest provider events in bounded batches and accumulate counters."""

    accepted_events = 0
    duplicate_events = 0
    for chunk in _chunk_events(events, chunk_size):
        ingest_result = await runtime_client.ingest_provider_events(
            claimed_run.organization_id,
            claimed_run.connection_id,
            sync_run_id=claimed_run.id,
            worker_id=worker_id,
            schema_version=schema_version,
            events=chunk,
        )
        accepted_events += int(ingest_result.get("accepted", 0))
        duplicate_events += int(ingest_result.get("duplicates", 0))

    return IngestBatchTotals(
        accepted_events=accepted_events,
        duplicate_events=duplicate_events,
    )
