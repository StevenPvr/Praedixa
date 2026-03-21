from __future__ import annotations

import asyncio
import json
import logging
import uuid
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import settings
from app.core.security import TenantFilter
from app.core.telemetry import TelemetryContext, get_telemetry_logger
from app.services.integration_runtime_worker import (
    ConnectorsRuntimeClient,
    RuntimeClaimedRawEvent,
    RuntimeClaimedSyncRun,
    RuntimeDrainResult,
    RuntimeSyncRunResult,
    build_default_runtime_client,
    drain_connector_connection,
    process_claimed_sync_run,
)
from app.services.integration_runtime_worker import (
    logger as runtime_worker_logger,
)
from app.services.integration_sftp_runtime_worker import RuntimeSyncRunExecutionPlan

TEST_PRIVATE_KEY = (
    "-----BEGIN"
    " PRIVATE KEY-----\n"
    "key\n"
    "-----END"
    " PRIVATE KEY-----"
)

VALID_HOST_KEY_SHA256 = "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"


def _build_sftp_execution_plan() -> RuntimeSyncRunExecutionPlan:
    return RuntimeSyncRunExecutionPlan(
        run_id="sync-run-sftp-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sftp-1",
        vendor="fourth",
        auth_mode="sftp",
        config={
            "sftpPull": {
                "sourceObject": "Employees",
                "datasetId": "11111111-1111-1111-1111-111111111111",
                "remoteDirectory": "/exports",
                "archiveDirectory": "/processed",
                "filePattern": "*.csv",
                "hostKeySha256": VALID_HOST_KEY_SHA256,
            }
        },
        source_objects=("Employees",),
        credentials={
            "host": "sftp.vendor.example.test",
            "username": "praedixa",
            "privateKey": TEST_PRIVATE_KEY,
            "port": 22,
        },
        sync_states=(),
    )


@pytest.mark.asyncio
async def test_drain_connector_connection_marks_claimed_events_processed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "id": "conn-1",
                    "config": {
                        "datasetMapping": {
                            "dataset": {
                                "name": "salesforce_accounts",
                                "table_name": "salesforce_accounts",
                                "temporal_index": "updated_at",
                                "group_by": ["record_id"],
                                "pipeline_config": {},
                            },
                            "fields": [
                                {
                                    "source_field": "account.id",
                                    "target_column": "record_id",
                                    "dtype": "text",
                                    "role": "id",
                                },
                                {
                                    "source_field": "account.updated_at",
                                    "target_column": "updated_at",
                                    "dtype": "date",
                                    "role": "temporal_index",
                                },
                            ],
                        }
                    },
                }
            ),
            claim_raw_events=AsyncMock(
                return_value=[
                    RuntimeClaimedRawEvent(
                        id="raw-1",
                        object_store_key="org-1/conn-1/evt-1.json",
                    )
                ]
            ),
            get_raw_event_payload=AsyncMock(
                return_value={
                    "account": {
                        "id": "001",
                        "updated_at": "2026-03-06T10:00:00Z",
                    }
                }
            ),
            mark_raw_event_processed=AsyncMock(),
            mark_raw_event_failed=AsyncMock(),
        ),
    )

    async def fake_ingest(*args: object, **kwargs: object) -> object:
        return SimpleNamespace(
            dataset_name="salesforce_accounts",
            rows_inserted=1,
            batch_id=uuid.uuid4(),
        )

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.ingest_raw_events_to_dataset",
        fake_ingest,
    )

    result = await drain_connector_connection(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        session=AsyncMock(),
        runtime_client=runtime_client,
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-1",
        worker_id="worker-bronze",
        limit=25,
    )

    assert result == RuntimeDrainResult(
        claimed=1,
        processed=1,
        failed=0,
        dataset_name="salesforce_accounts",
    )
    runtime_client.claim_raw_events.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-1",
        "worker-bronze",
        limit=25,
    )
    runtime_client.mark_raw_event_processed.assert_awaited_once()
    runtime_client.mark_raw_event_failed.assert_not_awaited()


@pytest.mark.asyncio
async def test_drain_connector_connection_marks_claimed_events_failed_on_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "id": "conn-2",
                    "config": {
                        "datasetMapping": {
                            "dataset": {
                                "name": "salesforce_accounts",
                                "table_name": "salesforce_accounts",
                                "temporal_index": "updated_at",
                                "group_by": ["record_id"],
                                "pipeline_config": {},
                            },
                            "fields": [
                                {
                                    "source_field": "account.id",
                                    "target_column": "record_id",
                                    "dtype": "text",
                                    "role": "id",
                                }
                            ],
                        }
                    },
                }
            ),
            claim_raw_events=AsyncMock(
                return_value=[
                    RuntimeClaimedRawEvent(
                        id="raw-2",
                        object_store_key="org-1/conn-2/evt-2.json",
                    )
                ]
            ),
            get_raw_event_payload=AsyncMock(return_value={"account": {"id": "001"}}),
            mark_raw_event_processed=AsyncMock(),
            mark_raw_event_failed=AsyncMock(),
        ),
    )

    async def failing_ingest(*args: object, **kwargs: object) -> object:
        raise ValueError("mapping exploded")

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.ingest_raw_events_to_dataset",
        failing_ingest,
    )

    with pytest.raises(ValueError, match="mapping exploded"):
        await drain_connector_connection(
            TenantFilter("11111111-1111-1111-1111-111111111111"),
            session=AsyncMock(),
            runtime_client=runtime_client,
            organization_id="11111111-1111-1111-1111-111111111111",
            connection_id="conn-2",
            worker_id="worker-bronze",
            limit=25,
        )

    runtime_client.mark_raw_event_failed.assert_awaited_once()
    failure_call = runtime_client.mark_raw_event_failed.await_args
    assert failure_call is not None
    assert failure_call.args[-1] == "invalid_mapping_or_payload"
    runtime_client.mark_raw_event_processed.assert_not_awaited()


@pytest.mark.asyncio
async def test_drain_connector_connection_clamps_batch_size(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "CONNECTORS_RUNTIME_MAX_BATCH_SIZE", 10)
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "id": "conn-3",
                    "config": {
                        "datasetMapping": {
                            "dataset": {
                                "name": "salesforce_accounts",
                                "table_name": "salesforce_accounts",
                                "temporal_index": "updated_at",
                                "group_by": ["record_id"],
                                "pipeline_config": {},
                            },
                            "fields": [
                                {
                                    "source_field": "account.id",
                                    "target_column": "record_id",
                                    "dtype": "text",
                                    "role": "id",
                                }
                            ],
                        }
                    },
                }
            ),
            claim_raw_events=AsyncMock(return_value=[]),
            mark_raw_event_processed=AsyncMock(),
            mark_raw_event_failed=AsyncMock(),
        ),
    )

    result = await drain_connector_connection(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        session=AsyncMock(),
        runtime_client=runtime_client,
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-3",
        worker_id="worker-bronze",
        limit=5_000,
    )

    assert result == RuntimeDrainResult(
        claimed=0,
        processed=0,
        failed=0,
        dataset_name=None,
    )
    runtime_client.claim_raw_events.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-3",
        "worker-bronze",
        limit=10,
    )


@pytest.mark.asyncio
async def test_drain_connector_connection_emits_structured_completion_log(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(
        "app.services.integration_runtime_worker.logger",
        get_telemetry_logger("app.services.integration_runtime_worker"),
    )
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "id": "conn-telemetry",
                    "config": {
                        "datasetMapping": {
                            "dataset": {
                                "name": "salesforce_accounts",
                                "table_name": "salesforce_accounts",
                                "temporal_index": "updated_at",
                                "group_by": ["record_id"],
                                "pipeline_config": {},
                            },
                            "fields": [
                                {
                                    "source_field": "account.id",
                                    "target_column": "record_id",
                                    "dtype": "text",
                                    "role": "id",
                                }
                            ],
                        }
                    },
                }
            ),
            claim_raw_events=AsyncMock(
                return_value=[
                    RuntimeClaimedRawEvent(
                        id="raw-telemetry",
                        object_store_key="org-1/conn-telemetry/evt-1.json",
                    )
                ]
            ),
            get_raw_event_payload=AsyncMock(return_value={"account": {"id": "001"}}),
            mark_raw_event_processed=AsyncMock(),
            mark_raw_event_failed=AsyncMock(),
        ),
    )

    async def fake_ingest(*args: object, **kwargs: object) -> object:
        return SimpleNamespace(
            dataset_name="salesforce_accounts",
            rows_inserted=1,
            batch_id=uuid.uuid4(),
        )

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.ingest_raw_events_to_dataset",
        fake_ingest,
    )

    with caplog.at_level(logging.INFO, logger=runtime_worker_logger.logger.name):
        await drain_connector_connection(
            TenantFilter("11111111-1111-1111-1111-111111111111"),
            session=AsyncMock(),
            runtime_client=runtime_client,
            organization_id="11111111-1111-1111-1111-111111111111",
            connection_id="conn-telemetry",
            worker_id="worker-bronze",
            connector_run_id="sync-run-123",
            request_id="req-telemetry-123",
            trace_id="trace-telemetry-123",
        )

    completed_records = [
        record
        for record in caplog.records
        if '"event": "connector.runtime.drain.completed"' in record.getMessage()
    ]
    assert len(completed_records) == 1
    payload = json.loads(completed_records[0].getMessage())
    assert payload["request_id"] == "req-telemetry-123"
    assert payload["connector_run_id"] == "sync-run-123"
    assert payload["organization_id"] == "11111111-1111-1111-1111-111111111111"
    assert payload["trace_id"] == "trace-telemetry-123"
    assert payload["processed_count"] == 1


def test_build_default_runtime_client_requires_allowlist_outside_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        settings,
        "CONNECTORS_RUNTIME_URL",
        "https://runtime.example.com",
    )
    monkeypatch.setattr(settings, "CONNECTORS_RUNTIME_TOKEN", "x" * 32)
    monkeypatch.setattr(settings, "CONNECTORS_RUNTIME_ALLOWED_HOSTS", "")

    with pytest.raises(ValueError, match="ALLOWED_HOSTS"):
        build_default_runtime_client()


def test_build_default_runtime_client_allows_local_http_in_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(
        settings,
        "CONNECTORS_RUNTIME_URL",
        "http://127.0.0.1:8100",
    )
    monkeypatch.setattr(settings, "CONNECTORS_RUNTIME_TOKEN", "x" * 32)
    monkeypatch.setattr(settings, "CONNECTORS_RUNTIME_ALLOWED_HOSTS", "")

    client = build_default_runtime_client()

    assert client.base_url == "http://127.0.0.1:8100"
    asyncio.run(client.aclose())


@pytest.mark.asyncio
async def test_runtime_client_forwards_business_correlation_headers() -> None:
    request = AsyncMock()
    request.return_value = SimpleNamespace(
        raise_for_status=lambda: None,
        json=lambda: {
            "success": True,
            "data": {
                "id": "conn-1",
                "config": {},
            },
        },
    )

    client = ConnectorsRuntimeClient("https://runtime.example.com", "x" * 32)
    cast("Any", client.client).request = request

    try:
        bound_client = client.with_telemetry_context(
            TelemetryContext(
                request_id="req-123",
                run_id="run-456",
                connector_run_id="sync-789",
            )
        )
        await bound_client.get_connection("org-1", "conn-1")
    finally:
        await client.aclose()

    request.assert_awaited_once_with(
        "GET",
        "/v1/organizations/org-1/connections/conn-1",
        json=None,
        headers={
            "X-Request-ID": "req-123",
            "X-Run-ID": "run-456",
            "X-Connector-Run-ID": "sync-789",
        },
    )


@pytest.mark.asyncio
async def test_process_claimed_sync_run_marks_completed_after_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_sync_run_execution_plan=AsyncMock(
                return_value=RuntimeSyncRunExecutionPlan(
                    run_id="sync-run-1",
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-queue-1",
                    vendor="salesforce",
                    auth_mode="api_key",
                    config={},
                    source_objects=("Accounts",),
                    credentials={"apiKey": "provider-key"},
                    sync_states=(),
                )
            ),
            get_connection=AsyncMock(
                return_value={
                    "vendor": "salesforce",
                    "config": {"pullEnabled": False},
                }
            ),
            mark_sync_run_completed=AsyncMock(),
            mark_sync_run_failed=AsyncMock(),
        ),
    )
    runtime_client.with_telemetry_context = lambda telemetry_context: runtime_client
    session = AsyncMock()
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-queue-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    drain_calls = 0

    async def fake_drain(*args: object, **kwargs: object) -> RuntimeDrainResult:
        nonlocal drain_calls
        drain_calls += 1
        if drain_calls == 1:
            return RuntimeDrainResult(
                claimed=3,
                processed=3,
                failed=0,
                dataset_name="salesforce_accounts",
            )
        return RuntimeDrainResult(
            claimed=0,
            processed=0,
            failed=0,
            dataset_name="salesforce_accounts",
        )

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.drain_connector_connection",
        fake_drain,
    )
    result = await process_claimed_sync_run(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        session,
        runtime_client,
        claimed_run,
        worker_id="queue-worker-1",
        request_id="req-queue-1",
        run_id="batch-run-1",
        trace_id="trace-queue-1",
    )

    assert result == RuntimeSyncRunResult(
        run_id="sync-run-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-queue-1",
        status="success",
        claimed=3,
        processed=3,
        failed=0,
        dataset_name="salesforce_accounts",
    )
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()
    runtime_client.mark_sync_run_completed.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "sync-run-1",
        "queue-worker-1",
        records_fetched=3,
        records_written=3,
    )
    runtime_client.mark_sync_run_failed.assert_not_awaited()


@pytest.mark.asyncio
async def test_process_claimed_sync_run_requeues_retryable_failures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_sync_run_execution_plan=AsyncMock(
                return_value=RuntimeSyncRunExecutionPlan(
                    run_id="sync-run-2",
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-queue-2",
                    vendor="salesforce",
                    auth_mode="api_key",
                    config={},
                    source_objects=("Accounts",),
                    credentials={"apiKey": "provider-key"},
                    sync_states=(),
                )
            ),
            get_connection=AsyncMock(
                return_value={
                    "vendor": "salesforce",
                    "config": {"pullEnabled": False},
                }
            ),
            mark_sync_run_completed=AsyncMock(),
            mark_sync_run_failed=AsyncMock(),
        ),
    )
    runtime_client.with_telemetry_context = lambda telemetry_context: runtime_client
    session = AsyncMock()
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-2",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-queue-2",
        trigger_type="manual",
        attempts=2,
        max_attempts=8,
    )
    request = httpx.Request("GET", "https://runtime.example.com/health")
    connect_error = httpx.ConnectError("runtime offline", request=request)

    async def failing_drain(*args: object, **kwargs: object) -> RuntimeDrainResult:
        raise connect_error

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.drain_connector_connection",
        failing_drain,
    )
    result = await process_claimed_sync_run(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        session,
        runtime_client,
        claimed_run,
        worker_id="queue-worker-2",
        request_id="req-queue-2",
        run_id="batch-run-2",
        trace_id="trace-queue-2",
    )

    assert result == RuntimeSyncRunResult(
        run_id="sync-run-2",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-queue-2",
        status="queued",
        claimed=0,
        processed=0,
        failed=1,
        dataset_name=None,
        error_class="transient",
        error_message="runtime offline",
        retryable=True,
    )
    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()
    runtime_client.mark_sync_run_completed.assert_not_awaited()
    runtime_client.mark_sync_run_failed.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "sync-run-2",
        "queue-worker-2",
        "runtime offline",
        error_class="transient",
        retryable=True,
        retry_delay_seconds=60,
    )


@pytest.mark.asyncio
async def test_process_claimed_sync_run_prefers_provider_fetched_count(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_sync_run_execution_plan=AsyncMock(
                return_value=RuntimeSyncRunExecutionPlan(
                    run_id="sync-run-provider-1",
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-provider-1",
                    vendor="salesforce",
                    auth_mode="oauth2",
                    config={},
                    source_objects=("Account",),
                    credentials={"clientId": "salesforce-client"},
                    sync_states=(),
                )
            ),
            mark_sync_run_completed=AsyncMock(),
            mark_sync_run_failed=AsyncMock(),
        ),
    )
    runtime_client.with_telemetry_context = lambda telemetry_context: runtime_client
    session = AsyncMock()
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-provider-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-provider-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    drain_results = iter(
        (
            RuntimeDrainResult(
                claimed=2,
                processed=2,
                failed=0,
                dataset_name="salesforce_accounts",
            ),
            RuntimeDrainResult(
                claimed=0,
                processed=0,
                failed=0,
                dataset_name=None,
            ),
        )
    )

    async def fake_drain(*args: object, **kwargs: object) -> RuntimeDrainResult:
        return next(drain_results)

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.drain_connector_connection",
        fake_drain,
    )
    monkeypatch.setattr(
        "app.services.integration_runtime_worker.pull_provider_events_for_sync_run",
        AsyncMock(
            return_value=SimpleNamespace(
                fetched_records=5,
                accepted_events=2,
                duplicate_events=0,
            )
        ),
    )

    result = await process_claimed_sync_run(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        session,
        runtime_client,
        claimed_run,
        worker_id="queue-worker-provider-1",
        request_id="req-provider-1",
        run_id="batch-provider-1",
        trace_id="trace-provider-1",
    )

    assert result == RuntimeSyncRunResult(
        run_id="sync-run-provider-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-provider-1",
        status="success",
        claimed=2,
        processed=2,
        failed=0,
        dataset_name="salesforce_accounts",
    )
    session.commit.assert_awaited_once()
    runtime_client.mark_sync_run_completed.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "sync-run-provider-1",
        "queue-worker-provider-1",
        records_fetched=5,
        records_written=2,
    )
    runtime_client.mark_sync_run_failed.assert_not_awaited()


@pytest.mark.asyncio
async def test_process_claimed_sync_run_uses_sftp_file_pull_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_sync_run_execution_plan=AsyncMock(
                return_value=_build_sftp_execution_plan()
            ),
            mark_sync_run_completed=AsyncMock(),
            mark_sync_run_failed=AsyncMock(),
            upsert_sync_run_state=AsyncMock(),
        ),
    )
    runtime_client.with_telemetry_context = lambda telemetry_context: runtime_client
    session = AsyncMock()
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-sftp-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sftp-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    async def fake_prepare(*args: object, **kwargs: object) -> object:
        from app.services.integration_sftp_runtime_worker import PreparedSftpFileImport

        return PreparedSftpFileImport(
            source_object="Employees",
            rows_received=12,
            rows_inserted=12,
            dataset_name="fourth_employees",
            watermark_text="/exports/employees_2026-03-19.csv",
            watermark_at="2026-03-19T12:00:00+00:00",
            cursor_json={"processedFiles": {}},
            archive_operations=(),
        )

    async def fake_finalize(*args: object, **kwargs: object) -> object:
        from app.services.integration_sftp_runtime_worker import FinalizedSftpFileImport

        return FinalizedSftpFileImport(
            sync_state_persisted=True,
            archive_errors=(),
            sync_state_error=None,
        )

    monkeypatch.setattr(
        "app.services.integration_runtime_worker.prepare_sftp_file_import",
        fake_prepare,
    )
    monkeypatch.setattr(
        "app.services.integration_runtime_worker.finalize_sftp_file_import",
        fake_finalize,
    )
    monkeypatch.setattr(
        "app.services.integration_runtime_worker.pull_provider_events_for_sync_run",
        AsyncMock(
            side_effect=AssertionError(
                "provider pull path must not run for sftp file-pull connections"
            )
        ),
    )

    result = await process_claimed_sync_run(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        session,
        runtime_client,
        claimed_run,
        worker_id="queue-worker-sftp-1",
        request_id="req-sftp-1",
        run_id="batch-run-sftp-1",
        trace_id="trace-sftp-1",
    )

    assert result == RuntimeSyncRunResult(
        run_id="sync-run-sftp-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sftp-1",
        status="success",
        claimed=12,
        processed=12,
        failed=0,
        dataset_name="fourth_employees",
    )
    session.commit.assert_awaited_once()
    runtime_client.mark_sync_run_completed.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "sync-run-sftp-1",
        "queue-worker-sftp-1",
        records_fetched=12,
        records_written=12,
    )
    runtime_client.mark_sync_run_failed.assert_not_awaited()
