from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.toast.client import ToastApiClient
from app.integrations.connectors.toast.extractor import (
    ToastPullResult,
    pull_toast_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_toast(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "toast",
                    "config": {
                        "toastEndpoints": {
                            "Orders": {
                                "path": "/orders/v1/orders",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-toast-1",
                    vendor="toast",
                    auth_mode="api_key",
                    runtime_environment="production",
                    base_url="https://ws-api.toasttab.com",
                    source_objects=("Orders",),
                    header_name="x-api-key",
                    header_value="toast-api-key-123",
                    scopes=(),
                    additional_headers=(
                        ("Toast-Restaurant-External-ID", "restaurant-ext-123"),
                    ),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-toast-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-toast-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    toast_pull = AsyncMock(
        return_value=ToastPullResult(
            fetched_records=11,
            accepted_events=10,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_toast_connection",
        toast_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-toast-1",
    )

    assert result == ProviderPullResult(
        fetched_records=11,
        accepted_events=10,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-toast-1",
    )
    toast_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_toast_api_client_get_records_follows_cursor_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "toast-api-key-123"
        assert (
            request.headers["Toast-Restaurant-External-ID"] == "restaurant-ext-123"
        )
        if request.url.path == "/orders/v1/orders":
            page_token = request.url.params.get("pageToken")
            if page_token is None:
                return httpx.Response(
                    200,
                    json={
                        "data": [{"orderGuid": "001"}],
                        "meta": {"nextCursor": "token-2"},
                    },
                )
            assert page_token == "token-2"
            return httpx.Response(
                200,
                json={
                    "data": [{"orderGuid": "002"}],
                },
            )
        raise AssertionError(f"Unexpected Toast request: {request.url}")

    client = ToastApiClient(
        base_url="https://ws-api.toasttab.com",
        header_name="x-api-key",
        header_value="toast-api-key-123",
        additional_headers={
            "Toast-Restaurant-External-ID": "restaurant-ext-123",
        },
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/orders/v1/orders",
            params={"pageSize": "200"},
            items_path="data",
            next_cursor_path="meta.nextCursor",
            cursor_param="pageToken",
        )
    finally:
        await client.aclose()

    assert records == [{"orderGuid": "001"}, {"orderGuid": "002"}]


@pytest.mark.asyncio
async def test_pull_toast_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "orderGuid": f"order-{index}",
            "modifiedDate": "2026-03-19T12:00:00Z",
            "status": "CLOSED",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: ToastApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/orders/v1/orders"
        assert params["pageSize"] == "200"
        assert items_path == "data"
        assert next_cursor_path == "meta.nextCursor"
        assert cursor_param == "pageToken"
        return records

    monkeypatch.setattr(ToastApiClient, "get_records", fake_get_records)

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
        id="sync-run-toast-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-toast-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-toast-batch-1",
        vendor="toast",
        auth_mode="api_key",
        runtime_environment="production",
        base_url="https://ws-api.toasttab.com",
        source_objects=("Orders",),
        header_name="x-api-key",
        header_value="toast-api-key-123",
        scopes=(),
        additional_headers=(("Toast-Restaurant-External-ID", "restaurant-ext-123"),),
    )

    result = await pull_toast_connection(
        runtime_client,
        {
            "sourceObjects": ["Orders"],
            "config": {
                "toastEndpoints": {
                    "Orders": {
                        "path": "/orders/v1/orders",
                        "itemsPath": "data",
                        "nextCursorPath": "meta.nextCursor",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-toast-batch-1",
    )

    assert result == ToastPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2

    first_call = runtime_client.ingest_provider_events.await_args_list[0]
    second_call = runtime_client.ingest_provider_events.await_args_list[1]

    assert first_call.args == (
        "11111111-1111-1111-1111-111111111111",
        "conn-toast-batch-1",
    )
    assert first_call.kwargs["sync_run_id"] == "sync-run-toast-batch-1"
    assert first_call.kwargs["worker_id"] == "queue-worker-toast-batch-1"
    assert first_call.kwargs["schema_version"] == "toast.pos.v1"
    assert len(first_call.kwargs["events"]) == 200
    assert first_call.kwargs["events"][0]["sourceObject"] == "Orders"
    assert len(second_call.kwargs["events"]) == 1
