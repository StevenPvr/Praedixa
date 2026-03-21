from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.manhattan.client import ManhattanApiClient
from app.integrations.connectors.manhattan.extractor import (
    ManhattanPullResult,
    pull_manhattan_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_manhattan(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "manhattan",
                    "config": {
                        "manhattanEndpoints": {
                            "Wave": {
                                "path": "/api/waves",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-manhattan-1",
                    vendor="manhattan",
                    auth_mode="api_key",
                    runtime_environment="production",
                    base_url="https://manhattan.example.test",
                    source_objects=("Wave",),
                    header_name="x-api-key",
                    header_value="manhattan-api-key-123",
                    scopes=(),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-manhattan-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-manhattan-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    manhattan_pull = AsyncMock(
        return_value=ManhattanPullResult(
            fetched_records=8,
            accepted_events=7,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_manhattan_connection",
        manhattan_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-manhattan-1",
    )

    assert result == ProviderPullResult(
        fetched_records=8,
        accepted_events=7,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-manhattan-1",
    )
    manhattan_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_manhattan_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "manhattan-api-key-123"
        if request.url.path == "/api/waves":
            cursor = request.url.params.get("cursor")
            if cursor is None:
                return httpx.Response(
                    200,
                    json={
                        "data": [{"waveId": "wave-001"}],
                        "pagination": {"nextCursor": "cursor-2"},
                    },
                )
            assert cursor == "cursor-2"
            return httpx.Response(
                200,
                json={
                    "data": [{"waveId": "wave-002"}],
                },
            )
        raise AssertionError(f"Unexpected Manhattan request: {request.url}")

    client = ManhattanApiClient(
        base_url="https://manhattan.example.test",
        header_name="x-api-key",
        header_value="manhattan-api-key-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/waves",
            params={"pageSize": "200"},
            items_path="data",
            next_cursor_path="pagination.nextCursor",
            cursor_param="cursor",
        )
    finally:
        await client.aclose()

    assert records == [{"waveId": "wave-001"}, {"waveId": "wave-002"}]


@pytest.mark.asyncio
async def test_pull_manhattan_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "waveId": f"wave-{index}",
            "updatedAt": "2026-03-20T12:00:00Z",
            "status": "RELEASED",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: ManhattanApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/waves"
        assert params["pageSize"] == "200"
        assert items_path == "data"
        assert next_cursor_path == "pagination.nextCursor"
        assert cursor_param == "cursor"
        return records

    monkeypatch.setattr(ManhattanApiClient, "get_records", fake_get_records)

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
        id="sync-run-manhattan-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-manhattan-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-manhattan-batch-1",
        vendor="manhattan",
        auth_mode="api_key",
        runtime_environment="production",
        base_url="https://manhattan.example.test",
        source_objects=("Wave",),
        header_name="x-api-key",
        header_value="manhattan-api-key-123",
        scopes=(),
    )

    result = await pull_manhattan_connection(
        runtime_client,
        {
            "sourceObjects": ["Wave"],
            "config": {
                "manhattanEndpoints": {
                    "Wave": {
                        "path": "/api/waves",
                        "itemsPath": "data",
                        "nextCursorPath": "pagination.nextCursor",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-manhattan-batch-1",
    )

    assert result == ManhattanPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
