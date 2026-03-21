"""Batch worker for claimed connector sync runs.

This module sits above ``integration_runtime_worker.py`` and is responsible for:

- claiming queued sync runs from ``app-connectors``
- binding each claimed run to an isolated DB session / tenant context
- delegating the actual raw-event drain to ``process_claimed_sync_run``
- returning an operational summary suitable for one-shot or watch-mode scripts
"""

from __future__ import annotations

from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
from dataclasses import dataclass
from typing import cast
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantFilter
from app.core.telemetry import TelemetryContext, get_telemetry_logger
from app.services.integration_runtime_worker import (
    ConnectorsRuntimeClient,
    RuntimeClaimedSyncRun,
    RuntimeSyncRunResult,
    _classify_sync_run_failure,
    _compute_sync_retry_delay_seconds,
    process_claimed_sync_run,
)

logger = get_telemetry_logger(__name__)
SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]


@dataclass(frozen=True)
class RuntimeSyncQueueBatchResult:
    """Operational summary for one sync-queue batch claim."""

    claimed_runs: int
    completed_runs: int
    failed_runs: int
    retried_runs: int
    claimed_records: int
    processed_records: int
    results: tuple[RuntimeSyncRunResult, ...]


def _normalize_organization_id(raw_value: str) -> str:
    return str(UUID(raw_value))


async def _bind_session_tenant_context(
    session: AsyncSession,
    organization_id: str,
) -> None:
    await session.execute(
        text("SET LOCAL app.current_organization_id = :org_id"),
        {"org_id": organization_id},
    )


def _bind_runtime_client_telemetry(
    runtime_client: ConnectorsRuntimeClient,
    telemetry_context: TelemetryContext,
) -> ConnectorsRuntimeClient:
    bind_telemetry = getattr(runtime_client, "with_telemetry_context", None)
    if callable(bind_telemetry):
        return cast("ConnectorsRuntimeClient", bind_telemetry(telemetry_context))
    return runtime_client


async def _fail_preflight_run(
    runtime_client: ConnectorsRuntimeClient,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
    request_id: str | None,
    run_id: str | None,
    trace_id: str | None,
    exc: Exception,
) -> RuntimeSyncRunResult:
    telemetry_context = TelemetryContext(
        request_id=request_id,
        run_id=run_id,
        connector_run_id=claimed_run.id,
        organization_id=claimed_run.organization_id,
        trace_id=trace_id,
    )
    telemetry = logger.bind(**telemetry_context.as_log_fields())
    bound_runtime_client = _bind_runtime_client_telemetry(
        runtime_client,
        telemetry_context,
    )
    error_message = str(exc)[:400] or "sync run preflight failed"
    if isinstance(exc, ValueError):
        error_class = "validation"
        retryable = False
    else:
        error_class, retryable = _classify_sync_run_failure(exc)
    retry_delay_seconds = (
        _compute_sync_retry_delay_seconds(claimed_run.attempts)
        if retryable
        else None
    )

    await bound_runtime_client.mark_sync_run_failed(
        claimed_run.organization_id,
        claimed_run.id,
        worker_id,
        error_message,
        error_class=error_class,
        retryable=retryable,
        retry_delay_seconds=retry_delay_seconds,
    )
    telemetry.exception(
        "Connector sync run preflight failed",
        event="connector.runtime.sync_run.preflight_failed",
        status="queued" if retryable else "failed",
        connection_id=claimed_run.connection_id,
        worker_id=worker_id,
        sync_error_class=error_class,
        retryable=retryable,
        retry_delay_seconds=retry_delay_seconds,
    )
    return RuntimeSyncRunResult(
        run_id=claimed_run.id,
        organization_id=claimed_run.organization_id,
        connection_id=claimed_run.connection_id,
        status="queued" if retryable else "failed",
        claimed=0,
        processed=0,
        failed=1,
        dataset_name=None,
        error_class=error_class,
        error_message=error_message,
        retryable=retryable,
    )


async def drain_sync_queue_once(
    runtime_client: ConnectorsRuntimeClient,
    session_factory: SessionFactory,
    *,
    worker_id: str,
    claim_limit: int = 25,
    lease_seconds: int = 300,
    drain_limit: int = 50,
    request_id: str | None = None,
    run_id: str | None = None,
    trace_id: str | None = None,
) -> RuntimeSyncQueueBatchResult:
    """Claim and process one batch of queued connector sync runs."""

    telemetry_context = TelemetryContext(
        request_id=request_id,
        run_id=run_id,
        trace_id=trace_id,
    )
    telemetry = logger.bind(**telemetry_context.as_log_fields())
    bound_runtime_client = _bind_runtime_client_telemetry(
        runtime_client,
        telemetry_context,
    )

    claimed_runs = await bound_runtime_client.claim_sync_runs(
        worker_id,
        limit=claim_limit,
        lease_seconds=lease_seconds,
    )
    if not claimed_runs:
        telemetry.info(
            "Connector sync queue batch completed with no claimed runs",
            event="connector.runtime.sync_queue.completed",
            status="success",
            worker_id=worker_id,
            claimed_runs=0,
            completed_runs=0,
            failed_runs=0,
            retried_runs=0,
            claimed_records=0,
            processed_records=0,
        )
        return RuntimeSyncQueueBatchResult(
            claimed_runs=0,
            completed_runs=0,
            failed_runs=0,
            retried_runs=0,
            claimed_records=0,
            processed_records=0,
            results=(),
        )

    results: list[RuntimeSyncRunResult] = []
    for claimed_run in claimed_runs:
        try:
            normalized_org_id = _normalize_organization_id(
                claimed_run.organization_id
            )
            normalized_run = RuntimeClaimedSyncRun(
                id=claimed_run.id,
                organization_id=normalized_org_id,
                connection_id=claimed_run.connection_id,
                trigger_type=claimed_run.trigger_type,
                attempts=claimed_run.attempts,
                max_attempts=claimed_run.max_attempts,
            )
            async with session_factory() as session:
                await _bind_session_tenant_context(session, normalized_org_id)
                result = await process_claimed_sync_run(
                    TenantFilter(normalized_org_id),
                    session,
                    bound_runtime_client,
                    normalized_run,
                    worker_id=worker_id,
                    limit=drain_limit,
                    request_id=request_id,
                    run_id=run_id,
                    trace_id=trace_id,
                )
        except Exception as exc:
            result = await _fail_preflight_run(
                bound_runtime_client,
                claimed_run,
                worker_id=worker_id,
                request_id=request_id,
                run_id=run_id,
                trace_id=trace_id,
                exc=exc,
            )
        results.append(result)

    completed_runs = sum(1 for result in results if result.status == "success")
    retried_runs = sum(1 for result in results if result.retryable)
    failed_runs = sum(
        1
        for result in results
        if result.status != "success" and not result.retryable
    )
    claimed_records = sum(result.claimed for result in results)
    processed_records = sum(result.processed for result in results)

    telemetry.info(
        "Connector sync queue batch completed",
        event="connector.runtime.sync_queue.completed",
        status="success",
        worker_id=worker_id,
        claimed_runs=len(claimed_runs),
        completed_runs=completed_runs,
        failed_runs=failed_runs,
        retried_runs=retried_runs,
        claimed_records=claimed_records,
        processed_records=processed_records,
    )
    return RuntimeSyncQueueBatchResult(
        claimed_runs=len(claimed_runs),
        completed_runs=completed_runs,
        failed_runs=failed_runs,
        retried_runs=retried_runs,
        claimed_records=claimed_records,
        processed_records=processed_records,
        results=tuple(results),
    )
