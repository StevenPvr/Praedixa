from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.oracle_tm.client import OracleTmApiClient
from app.integrations.connectors.oracle_tm.extractor import (
    OracleTmPullResult,
    pull_oracle_tm_connection,
)
from app.integrations.provider_sync import (
    ProviderPullResult,
    pull_provider_events_for_sync_run,
)
from app.services.integration_runtime_worker import (
    RuntimeClaimedSyncRun,
    RuntimeProviderAccessContext,
)


@pytest.mark.asyncio
async def test_pull_provider_events_for_sync_run_dispatches_oracle_tm(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "oracle_tm",
                    "config": {
                        "oracleTmEndpoints": {
                            "Shipment": {
                                "path": "/rest/v1/shipments",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-oracle-tm-1",
                    vendor="oracle_tm",
                    auth_mode="oauth2",
                    runtime_environment="production",
                    base_url="https://otm.example.test",
                    source_objects=("Shipment",),
                    header_name="authorization",
                    header_value="Bearer oracle-access-token-123",
                    scopes=("shipment.read",),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-oracle-tm-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-oracle-tm-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    oracle_pull = AsyncMock(
        return_value=OracleTmPullResult(
            fetched_records=10,
            accepted_events=9,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_oracle_tm_connection",
        oracle_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-oracle-tm-1",
    )

    assert result == ProviderPullResult(
        fetched_records=10,
        accepted_events=9,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-oracle-tm-1",
    )
    oracle_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_oracle_tm_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer oracle-access-token-123"
        if request.url.path == "/rest/v1/shipments":
            offset = request.url.params.get("offset")
            if offset is None:
                return httpx.Response(
                    200,
                    json={
                        "data": [{"shipmentGid": "SHIPMENT-001"}],
                        "pagination": {"nextOffset": 200},
                    },
                )
            assert offset == "200"
            return httpx.Response(
                200,
                json={
                    "data": [{"shipmentGid": "SHIPMENT-002"}],
                },
            )
        raise AssertionError(f"Unexpected Oracle TM request: {request.url}")

    client = OracleTmApiClient(
        base_url="https://otm.example.test",
        header_name="authorization",
        header_value="Bearer oracle-access-token-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/rest/v1/shipments",
            params={"limit": "200"},
            items_path="data",
            next_cursor_path="pagination.nextOffset",
            cursor_param="offset",
        )
    finally:
        await client.aclose()

    assert records == [
        {"shipmentGid": "SHIPMENT-001"},
        {"shipmentGid": "SHIPMENT-002"},
    ]


@pytest.mark.asyncio
async def test_pull_oracle_tm_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "shipmentGid": f"SHIPMENT-{index:03d}",
            "lastUpdateDate": "2026-03-20T08:00:00Z",
            "status": "IN_TRANSIT",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: OracleTmApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/rest/v1/shipments"
        assert params == {
            "domainName": "PUBLIC",
            "limit": "200",
            "lastUpdateFrom": "2026-03-19T00:00:00Z",
            "lastUpdateTo": "2026-03-20T00:00:00Z",
        }
        assert items_path == "data"
        assert next_cursor_path == "pagination.nextOffset"
        assert cursor_param == "offset"
        return records

    monkeypatch.setattr(OracleTmApiClient, "get_records", fake_get_records)

    runtime_client = cast(
        "Any",
        SimpleNamespace(
            ingest_provider_events=AsyncMock(
                side_effect=[
                    {"accepted": 200, "duplicates": 0},
                    {"accepted": 1, "duplicates": 0},
                ]
            )
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-oracle-tm-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-oracle-tm-batch-1",
        trigger_type="manual",
        source_window_start="2026-03-19T00:00:00Z",
        source_window_end="2026-03-20T00:00:00Z",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-oracle-tm-batch-1",
        vendor="oracle_tm",
        auth_mode="oauth2",
        runtime_environment="production",
        base_url="https://otm.example.test",
        source_objects=("Shipment",),
        header_name="authorization",
        header_value="Bearer oracle-access-token-123",
        scopes=("shipment.read",),
    )

    result = await pull_oracle_tm_connection(
        runtime_client,
        {
            "sourceObjects": ["Shipment"],
            "config": {
                "oracleTmEndpoints": {
                    "Shipment": {
                        "path": "/rest/v1/shipments",
                        "itemsPath": "data",
                        "nextCursorPath": "pagination.nextOffset",
                        "staticParams": {
                            "domainName": "PUBLIC",
                        },
                        "updatedAfterParam": "lastUpdateFrom",
                        "updatedBeforeParam": "lastUpdateTo",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-oracle-tm-batch-1",
    )

    assert result == OracleTmPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
