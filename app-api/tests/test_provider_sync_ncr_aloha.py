from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.ncr_aloha.client import NcrAlohaApiClient
from app.integrations.connectors.ncr_aloha.extractor import (
    NcrAlohaPullResult,
    pull_ncr_aloha_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_ncr_aloha(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "ncr_aloha",
                    "config": {
                        "alohaEndpoints": {
                            "Check": {
                                "path": "/api/checks",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-aloha-1",
                    vendor="ncr_aloha",
                    auth_mode="api_key",
                    runtime_environment="production",
                    base_url="https://aloha.example.test",
                    source_objects=("Check",),
                    header_name="x-api-key",
                    header_value="aloha-api-key-123",
                    scopes=(),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-aloha-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-aloha-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    aloha_pull = AsyncMock(
        return_value=NcrAlohaPullResult(
            fetched_records=10,
            accepted_events=9,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_ncr_aloha_connection",
        aloha_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-aloha-1",
    )

    assert result == ProviderPullResult(
        fetched_records=10,
        accepted_events=9,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-aloha-1",
    )
    aloha_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_ncr_aloha_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "aloha-api-key-123"
        if request.url.path == "/api/checks":
            cursor = request.url.params.get("cursor")
            if cursor is None:
                return httpx.Response(
                    200,
                    json={
                        "data": [{"checkId": "check-001"}],
                        "pagination": {"nextCursor": "cursor-2"},
                    },
                )
            assert cursor == "cursor-2"
            return httpx.Response(
                200,
                json={
                    "data": [{"checkId": "check-002"}],
                },
            )
        raise AssertionError(f"Unexpected NCR Aloha request: {request.url}")

    client = NcrAlohaApiClient(
        base_url="https://aloha.example.test",
        header_name="x-api-key",
        header_value="aloha-api-key-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/checks",
            params={"pageSize": "200"},
            items_path="data",
            next_cursor_path="pagination.nextCursor",
            cursor_param="cursor",
        )
    finally:
        await client.aclose()

    assert records == [{"checkId": "check-001"}, {"checkId": "check-002"}]


@pytest.mark.asyncio
async def test_pull_ncr_aloha_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "checkId": f"check-{index}",
            "updatedAt": "2026-03-20T12:00:00Z",
            "status": "CLOSED",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: NcrAlohaApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/checks"
        assert params["pageSize"] == "200"
        assert items_path == "data"
        assert next_cursor_path == "pagination.nextCursor"
        assert cursor_param == "cursor"
        return records

    monkeypatch.setattr(NcrAlohaApiClient, "get_records", fake_get_records)

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
        id="sync-run-aloha-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-aloha-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-aloha-batch-1",
        vendor="ncr_aloha",
        auth_mode="api_key",
        runtime_environment="production",
        base_url="https://aloha.example.test",
        source_objects=("Check",),
        header_name="x-api-key",
        header_value="aloha-api-key-123",
        scopes=(),
    )

    result = await pull_ncr_aloha_connection(
        runtime_client,
        {
            "sourceObjects": ["Check"],
            "config": {
                "alohaEndpoints": {
                    "Check": {
                        "path": "/api/checks",
                        "itemsPath": "data",
                        "nextCursorPath": "pagination.nextCursor",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-aloha-batch-1",
    )

    assert result == NcrAlohaPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
