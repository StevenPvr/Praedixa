from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.ukg.client import UkgApiClient
from app.integrations.connectors.ukg.extractor import (
    UkgPullResult,
    pull_ukg_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_ukg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "ukg",
                    "config": {
                        "ukgEndpoints": {
                            "Employees": {
                                "path": "/api/v1/employees",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-ukg-1",
                    vendor="ukg",
                    auth_mode="oauth2",
                    runtime_environment="production",
                    base_url="https://tenant.ukg.example.test",
                    source_objects=("Employees",),
                    header_name="authorization",
                    header_value="Bearer token-123",
                    scopes=("employees.read",),
                    additional_headers=(("global-tenant-id", "tenant-123"),),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-ukg-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-ukg-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    ukg_pull = AsyncMock(
        return_value=UkgPullResult(
            fetched_records=9,
            accepted_events=8,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_ukg_connection",
        ukg_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-ukg-1",
    )

    assert result == ProviderPullResult(
        fetched_records=9,
        accepted_events=8,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-ukg-1",
    )
    ukg_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_ukg_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer token-123"
        assert request.headers["global-tenant-id"] == "tenant-123"
        if request.url.path == "/api/v1/employees":
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
        raise AssertionError(f"Unexpected UKG request: {request.url}")

    client = UkgApiClient(
        base_url="https://tenant.ukg.example.test",
        header_name="authorization",
        header_value="Bearer token-123",
        additional_headers={"global-tenant-id": "tenant-123"},
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/v1/employees",
            params={"pageSize": "200"},
            items_path="data",
            next_cursor_path="pagination.nextCursor",
            cursor_param="cursor",
        )
    finally:
        await client.aclose()

    assert records == [{"employeeId": "001"}, {"employeeId": "002"}]


@pytest.mark.asyncio
async def test_pull_ukg_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "employeeId": f"emp-{index}",
            "lastChangedDateTime": "2026-03-19T12:00:00Z",
            "status": "ACTIVE",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: UkgApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/v1/employees"
        assert params["pageSize"] == "200"
        assert items_path == "data"
        assert next_cursor_path == "pagination.nextCursor"
        assert cursor_param == "cursor"
        return records

    monkeypatch.setattr(UkgApiClient, "get_records", fake_get_records)

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
        id="sync-run-ukg-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-ukg-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-ukg-batch-1",
        vendor="ukg",
        auth_mode="oauth2",
        runtime_environment="production",
        base_url="https://tenant.ukg.example.test",
        source_objects=("Employees",),
        header_name="authorization",
        header_value="Bearer token-123",
        scopes=("employees.read",),
        additional_headers=(("global-tenant-id", "tenant-123"),),
    )

    result = await pull_ukg_connection(
        runtime_client,
        {
            "sourceObjects": ["Employees"],
            "config": {
                "ukgEndpoints": {
                    "Employees": {
                        "path": "/api/v1/employees",
                        "itemsPath": "data",
                        "nextCursorPath": "pagination.nextCursor",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-ukg-batch-1",
    )

    assert result == UkgPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2

    first_call = runtime_client.ingest_provider_events.await_args_list[0]
    second_call = runtime_client.ingest_provider_events.await_args_list[1]

    assert first_call.args == (
        "11111111-1111-1111-1111-111111111111",
        "conn-ukg-batch-1",
    )
    assert first_call.kwargs["sync_run_id"] == "sync-run-ukg-batch-1"
    assert first_call.kwargs["worker_id"] == "queue-worker-ukg-batch-1"
    assert first_call.kwargs["schema_version"] == "ukg.workforce.v1"
    assert len(first_call.kwargs["events"]) == 200
    assert first_call.kwargs["events"][0]["sourceObject"] == "Employees"
    assert len(second_call.kwargs["events"]) == 1
