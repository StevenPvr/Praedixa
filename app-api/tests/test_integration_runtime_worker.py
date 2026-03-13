from __future__ import annotations

import asyncio
import json
import logging
import uuid
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

from app.core.config import settings
from app.core.security import TenantFilter
from app.core.telemetry import TelemetryContext, get_telemetry_logger
from app.services.integration_runtime_worker import (
    ConnectorsRuntimeClient,
    RuntimeClaimedRawEvent,
    RuntimeDrainResult,
    build_default_runtime_client,
    drain_connector_connection,
)
from app.services.integration_runtime_worker import (
    logger as runtime_worker_logger,
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
