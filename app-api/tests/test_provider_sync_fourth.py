from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.fourth.client import FourthApiClient
from app.integrations.connectors.fourth.extractor import (
    FourthPullResult,
    pull_fourth_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_fourth(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "fourth",
                    "config": {
                        "fourthEndpoints": {
                            "Employees": {
                                "path": "/api/employees",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-fourth-1",
                    vendor="fourth",
                    auth_mode="api_key",
                    runtime_environment="production",
                    base_url="https://api.fourth.example.test",
                    source_objects=("Employees",),
                    header_name="x-api-key",
                    header_value="fourth-api-key-123",
                    scopes=(),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-fourth-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-fourth-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    fourth_pull = AsyncMock(
        return_value=FourthPullResult(
            fetched_records=10,
            accepted_events=9,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_fourth_connection",
        fourth_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-fourth-1",
    )

    assert result == ProviderPullResult(
        fetched_records=10,
        accepted_events=9,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-fourth-1",
    )
    fourth_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_fourth_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "fourth-api-key-123"
        if request.url.path == "/api/employees":
            cursor = request.url.params.get("cursor")
            if cursor is None:
                return httpx.Response(
                    200,
                    json={
                        "data": [{"employeeId": "001"}],
                        "pagination": {"nextCursor": "cursor-2"},
                    },
                )
            assert cursor == "cursor-2"
            return httpx.Response(
                200,
                json={
                    "data": [{"employeeId": "002"}],
                },
            )
        raise AssertionError(f"Unexpected Fourth request: {request.url}")

    client = FourthApiClient(
        base_url="https://api.fourth.example.test",
        header_name="x-api-key",
        header_value="fourth-api-key-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/employees",
            params={"pageSize": "200"},
            items_path="data",
            next_cursor_path="pagination.nextCursor",
            cursor_param="cursor",
        )
    finally:
        await client.aclose()

    assert records == [{"employeeId": "001"}, {"employeeId": "002"}]


@pytest.mark.asyncio
async def test_pull_fourth_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "employeeId": f"emp-{index}",
            "updatedAt": "2026-03-19T12:00:00Z",
            "status": "ACTIVE",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: FourthApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/employees"
        assert params["pageSize"] == "200"
        assert items_path == "data"
        assert next_cursor_path == "pagination.nextCursor"
        assert cursor_param == "cursor"
        return records

    monkeypatch.setattr(FourthApiClient, "get_records", fake_get_records)

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
        id="sync-run-fourth-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-fourth-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-fourth-batch-1",
        vendor="fourth",
        auth_mode="api_key",
        runtime_environment="production",
        base_url="https://api.fourth.example.test",
        source_objects=("Employees",),
        header_name="x-api-key",
        header_value="fourth-api-key-123",
        scopes=(),
    )

    result = await pull_fourth_connection(
        runtime_client,
        {
            "sourceObjects": ["Employees"],
            "config": {
                "fourthEndpoints": {
                    "Employees": {
                        "path": "/api/employees",
                        "itemsPath": "data",
                        "nextCursorPath": "pagination.nextCursor",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-fourth-batch-1",
    )

    assert result == FourthPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
