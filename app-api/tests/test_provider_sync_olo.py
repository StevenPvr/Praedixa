from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.olo.client import OloApiClient
from app.integrations.connectors.olo.extractor import (
    OloPullResult,
    pull_olo_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_olo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "olo",
                    "config": {
                        "oloEndpoints": {
                            "Orders": {
                                "path": "/api/orders",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-olo-1",
                    vendor="olo",
                    auth_mode="api_key",
                    runtime_environment="production",
                    base_url="https://partner.olo.test",
                    source_objects=("Orders",),
                    header_name="x-api-key",
                    header_value="olo-api-key-123",
                    scopes=(),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-olo-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-olo-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    olo_pull = AsyncMock(
        return_value=OloPullResult(
            fetched_records=13,
            accepted_events=12,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_olo_connection",
        olo_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-olo-1",
    )

    assert result == ProviderPullResult(
        fetched_records=13,
        accepted_events=12,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-olo-1",
    )
    olo_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_olo_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "olo-api-key-123"
        if request.url.path == "/api/orders":
            cursor = request.url.params.get("cursor")
            if cursor is None:
                return httpx.Response(
                    200,
                    json={
                        "data": [{"id": "order-001"}],
                        "pagination": {"nextCursor": "cursor-2"},
                    },
                )
            assert cursor == "cursor-2"
            return httpx.Response(
                200,
                json={
                    "data": [{"id": "order-002"}],
                },
            )
        raise AssertionError(f"Unexpected Olo request: {request.url}")

    client = OloApiClient(
        base_url="https://partner.olo.test",
        header_name="x-api-key",
        header_value="olo-api-key-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/orders",
            params={"pageSize": "200"},
            items_path="data",
            next_cursor_path="pagination.nextCursor",
            cursor_param="cursor",
        )
    finally:
        await client.aclose()

    assert records == [{"id": "order-001"}, {"id": "order-002"}]


@pytest.mark.asyncio
async def test_pull_olo_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "id": f"order-{index}",
            "updatedAt": "2026-03-19T12:00:00Z",
            "status": "CLOSED",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: OloApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/orders"
        assert params["pageSize"] == "200"
        assert items_path == "data"
        assert next_cursor_path == "pagination.nextCursor"
        assert cursor_param == "cursor"
        return records

    monkeypatch.setattr(OloApiClient, "get_records", fake_get_records)

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
        id="sync-run-olo-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-olo-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-olo-batch-1",
        vendor="olo",
        auth_mode="api_key",
        runtime_environment="production",
        base_url="https://partner.olo.test",
        source_objects=("Orders",),
        header_name="x-api-key",
        header_value="olo-api-key-123",
        scopes=(),
    )

    result = await pull_olo_connection(
        runtime_client,
        {
            "sourceObjects": ["Orders"],
            "config": {
                "oloEndpoints": {
                    "Orders": {
                        "path": "/api/orders",
                        "itemsPath": "data",
                        "nextCursorPath": "pagination.nextCursor",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-olo-batch-1",
    )

    assert result == OloPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
