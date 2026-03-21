from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

from app.services.integration_runtime_worker import (
    RuntimeClaimedSyncRun,
    RuntimeSyncRunResult,
)
from app.services.integration_sync_queue_worker import (
    RuntimeSyncQueueBatchResult,
    drain_sync_queue_once,
)


@pytest.mark.asyncio
async def test_drain_sync_queue_once_processes_claimed_runs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            claim_sync_runs=AsyncMock(
                return_value=[
                    RuntimeClaimedSyncRun(
                        id="sync-run-1",
                        organization_id="11111111-1111-1111-1111-111111111111",
                        connection_id="conn-1",
                        trigger_type="manual",
                        attempts=1,
                        max_attempts=8,
                    )
                ]
            ),
            mark_sync_run_failed=AsyncMock(),
        ),
    )
    runtime_client.with_telemetry_context = lambda telemetry_context: runtime_client
    session = AsyncMock()

    @asynccontextmanager
    async def fake_session_factory():
        yield session

    async def fake_process(
        tenant,
        session_arg,
        runtime_client_arg,
        claimed_run,
        *,
        worker_id: str,
        limit: int,
        request_id: str | None,
        run_id: str | None,
        trace_id: str | None,
    ) -> RuntimeSyncRunResult:
        assert tenant.organization_id == "11111111-1111-1111-1111-111111111111"
        assert session_arg is session
        assert runtime_client_arg is runtime_client
        assert claimed_run.id == "sync-run-1"
        assert worker_id == "queue-worker-1"
        assert limit == 75
        assert request_id == "req-batch-1"
        assert run_id == "batch-run-1"
        assert trace_id == "trace-batch-1"
        return RuntimeSyncRunResult(
            run_id="sync-run-1",
            organization_id="11111111-1111-1111-1111-111111111111",
            connection_id="conn-1",
            status="success",
            claimed=4,
            processed=4,
            failed=0,
            dataset_name="salesforce_accounts",
        )

    monkeypatch.setattr(
        "app.services.integration_sync_queue_worker.process_claimed_sync_run",
        fake_process,
    )

    result = await drain_sync_queue_once(
        runtime_client,
        fake_session_factory,
        worker_id="queue-worker-1",
        claim_limit=10,
        lease_seconds=180,
        drain_limit=75,
        request_id="req-batch-1",
        run_id="batch-run-1",
        trace_id="trace-batch-1",
    )

    assert result == RuntimeSyncQueueBatchResult(
        claimed_runs=1,
        completed_runs=1,
        failed_runs=0,
        retried_runs=0,
        claimed_records=4,
        processed_records=4,
        results=(
            RuntimeSyncRunResult(
                run_id="sync-run-1",
                organization_id="11111111-1111-1111-1111-111111111111",
                connection_id="conn-1",
                status="success",
                claimed=4,
                processed=4,
                failed=0,
                dataset_name="salesforce_accounts",
            ),
        ),
    )
    runtime_client.claim_sync_runs.assert_awaited_once_with(
        "queue-worker-1",
        limit=10,
        lease_seconds=180,
    )
    session.execute.assert_awaited_once()
    execute_call = session.execute.await_args
    assert execute_call is not None
    assert execute_call.args[1] == {
        "org_id": "11111111-1111-1111-1111-111111111111"
    }
    runtime_client.mark_sync_run_failed.assert_not_awaited()


@pytest.mark.asyncio
async def test_drain_sync_queue_once_fails_invalid_org_ids_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            claim_sync_runs=AsyncMock(
                return_value=[
                    RuntimeClaimedSyncRun(
                        id="sync-run-invalid",
                        organization_id="not-a-uuid",
                        connection_id="conn-invalid",
                        trigger_type="manual",
                        attempts=1,
                        max_attempts=8,
                    )
                ]
            ),
            mark_sync_run_failed=AsyncMock(),
        ),
    )
    runtime_client.with_telemetry_context = lambda telemetry_context: runtime_client

    @asynccontextmanager
    async def fake_session_factory():
        raise AssertionError("session factory must not be called on invalid org ids")
        yield

    async def unexpected_process(
        *args: object,
        **kwargs: object,
    ) -> RuntimeSyncRunResult:
        raise AssertionError("process_claimed_sync_run must not run")

    monkeypatch.setattr(
        "app.services.integration_sync_queue_worker.process_claimed_sync_run",
        unexpected_process,
    )

    result = await drain_sync_queue_once(
        runtime_client,
        fake_session_factory,
        worker_id="queue-worker-2",
        request_id="req-batch-2",
        run_id="batch-run-2",
        trace_id="trace-batch-2",
    )

    assert result.claimed_runs == 1
    assert result.completed_runs == 0
    assert result.failed_runs == 1
    assert result.retried_runs == 0
    assert result.claimed_records == 0
    assert result.processed_records == 0
    assert result.results[0].error_class == "validation"
    assert result.results[0].status == "failed"
    runtime_client.mark_sync_run_failed.assert_awaited_once_with(
        "not-a-uuid",
        "sync-run-invalid",
        "queue-worker-2",
        "badly formed hexadecimal UUID string",
        error_class="validation",
        retryable=False,
        retry_delay_seconds=None,
    )
