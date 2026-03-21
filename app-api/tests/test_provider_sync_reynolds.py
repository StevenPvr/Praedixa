from __future__ import annotations

import base64
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.reynolds.client import ReynoldsApiClient
from app.integrations.connectors.reynolds.extractor import (
    ReynoldsPullResult,
    pull_reynolds_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_reynolds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "reynolds",
                    "config": {
                        "reynoldsEndpoints": {
                            "RepairOrder": {
                                "path": "/api/repair-orders",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-reynolds-1",
                    vendor="reynolds",
                    auth_mode="service_account",
                    runtime_environment="production",
                    base_url="https://reyrey.example.test",
                    source_objects=("RepairOrder",),
                    header_name="",
                    header_value="",
                    scopes=(),
                    credential_fields=(
                        ("clientId", "reynolds-client-id-123"),
                        ("clientSecret", "reynolds-client-secret-1234567890"),
                    ),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-reynolds-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-reynolds-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    reynolds_pull = AsyncMock(
        return_value=ReynoldsPullResult(
            fetched_records=12,
            accepted_events=11,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_reynolds_connection",
        reynolds_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-reynolds-1",
    )

    assert result == ProviderPullResult(
        fetched_records=12,
        accepted_events=11,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-reynolds-1",
    )
    reynolds_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_reynolds_api_client_get_records_follows_cursor_pagination() -> None:
    expected_basic = "Basic " + base64.b64encode(
        b"reynolds-client-id-123:reynolds-client-secret-1234567890"
    ).decode("ascii")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == expected_basic
        if request.url.path == "/api/repair-orders":
            offset = request.url.params.get("offset")
            if offset is None:
                return httpx.Response(
                    200,
                    json={
                        "records": [{"repairOrderId": "RO-001"}],
                        "pagination": {"nextOffset": 200},
                    },
                )
            assert offset == "200"
            return httpx.Response(
                200,
                json={
                    "records": [{"repairOrderId": "RO-002"}],
                },
            )
        raise AssertionError(f"Unexpected Reynolds request: {request.url}")

    client = ReynoldsApiClient(
        base_url="https://reyrey.example.test",
        client_id="reynolds-client-id-123",
        client_secret="reynolds-client-secret-1234567890",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/repair-orders",
            params={"limit": "200"},
            items_path="records",
            next_cursor_path="pagination.nextOffset",
            cursor_param="offset",
        )
    finally:
        await client.aclose()

    assert records == [
        {"repairOrderId": "RO-001"},
        {"repairOrderId": "RO-002"},
    ]


@pytest.mark.asyncio
async def test_pull_reynolds_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "repairOrderId": f"RO-{index:03d}",
            "updatedAt": "2026-03-20T08:00:00Z",
            "status": "OPEN",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: ReynoldsApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/repair-orders"
        assert params == {
            "dealerId": "dealer-123",
            "limit": "200",
            "lastModifiedFrom": "2026-03-19T00:00:00Z",
            "lastModifiedTo": "2026-03-20T00:00:00Z",
        }
        assert items_path == "records"
        assert next_cursor_path == "pagination.nextOffset"
        assert cursor_param == "offset"
        return records

    monkeypatch.setattr(ReynoldsApiClient, "get_records", fake_get_records)

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
        id="sync-run-reynolds-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-reynolds-batch-1",
        trigger_type="manual",
        source_window_start="2026-03-19T00:00:00Z",
        source_window_end="2026-03-20T00:00:00Z",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-reynolds-batch-1",
        vendor="reynolds",
        auth_mode="service_account",
        runtime_environment="production",
        base_url="https://reyrey.example.test",
        source_objects=("RepairOrder",),
        header_name="",
        header_value="",
        scopes=(),
        credential_fields=(
            ("clientId", "reynolds-client-id-123"),
            ("clientSecret", "reynolds-client-secret-1234567890"),
        ),
    )

    result = await pull_reynolds_connection(
        runtime_client,
        {
            "sourceObjects": ["RepairOrder"],
            "config": {
                "reynoldsEndpoints": {
                    "RepairOrder": {
                        "path": "/api/repair-orders",
                        "itemsPath": "records",
                        "nextCursorPath": "pagination.nextOffset",
                        "staticParams": {
                            "dealerId": "dealer-123",
                        },
                        "updatedAfterParam": "lastModifiedFrom",
                        "updatedBeforeParam": "lastModifiedTo",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-reynolds-batch-1",
    )

    assert result == ReynoldsPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
