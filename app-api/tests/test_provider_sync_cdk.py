from __future__ import annotations

import base64
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.cdk.client import CdkApiClient
from app.integrations.connectors.cdk.extractor import (
    CdkPullResult,
    pull_cdk_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_cdk(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "cdk",
                    "config": {
                        "cdkEndpoints": {
                            "ServiceOrders": {
                                "path": "/api/service-orders",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-cdk-1",
                    vendor="cdk",
                    auth_mode="service_account",
                    runtime_environment="production",
                    base_url="https://fortellis.example.test",
                    source_objects=("ServiceOrders",),
                    header_name="",
                    header_value="",
                    scopes=(),
                    credential_fields=(
                        ("clientId", "cdk-client-id-123"),
                        ("clientSecret", "cdk-client-secret-1234567890"),
                    ),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-cdk-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-cdk-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    cdk_pull = AsyncMock(
        return_value=CdkPullResult(
            fetched_records=12,
            accepted_events=11,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr("app.integrations.provider_sync.pull_cdk_connection", cdk_pull)

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-cdk-1",
    )

    assert result == ProviderPullResult(
        fetched_records=12,
        accepted_events=11,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-cdk-1",
    )
    cdk_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_cdk_api_client_get_records_follows_cursor_pagination() -> None:
    expected_basic = "Basic " + base64.b64encode(
        b"cdk-client-id-123:cdk-client-secret-1234567890"
    ).decode("ascii")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == expected_basic
        if request.url.path == "/api/service-orders":
            offset = request.url.params.get("offset")
            if offset is None:
                return httpx.Response(
                    200,
                    json={
                        "records": [{"serviceOrderId": "RO-001"}],
                        "pagination": {"nextOffset": 200},
                    },
                )
            assert offset == "200"
            return httpx.Response(
                200,
                json={
                    "records": [{"serviceOrderId": "RO-002"}],
                },
            )
        raise AssertionError(f"Unexpected CDK request: {request.url}")

    client = CdkApiClient(
        base_url="https://fortellis.example.test",
        client_id="cdk-client-id-123",
        client_secret="cdk-client-secret-1234567890",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/api/service-orders",
            params={"limit": "200"},
            items_path="records",
            next_cursor_path="pagination.nextOffset",
            cursor_param="offset",
        )
    finally:
        await client.aclose()

    assert records == [
        {"serviceOrderId": "RO-001"},
        {"serviceOrderId": "RO-002"},
    ]


@pytest.mark.asyncio
async def test_pull_cdk_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "serviceOrderId": f"RO-{index:03d}",
            "updatedAt": "2026-03-20T08:00:00Z",
            "status": "OPEN",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: CdkApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/api/service-orders"
        assert params == {
            "tenantId": "dealer-123",
            "limit": "200",
            "lastModifiedFrom": "2026-03-19T00:00:00Z",
            "lastModifiedTo": "2026-03-20T00:00:00Z",
        }
        assert items_path == "records"
        assert next_cursor_path == "pagination.nextOffset"
        assert cursor_param == "offset"
        return records

    monkeypatch.setattr(CdkApiClient, "get_records", fake_get_records)

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
        id="sync-run-cdk-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-cdk-batch-1",
        trigger_type="manual",
        source_window_start="2026-03-19T00:00:00Z",
        source_window_end="2026-03-20T00:00:00Z",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-cdk-batch-1",
        vendor="cdk",
        auth_mode="service_account",
        runtime_environment="production",
        base_url="https://fortellis.example.test",
        source_objects=("ServiceOrders",),
        header_name="",
        header_value="",
        scopes=(),
        credential_fields=(
            ("clientId", "cdk-client-id-123"),
            ("clientSecret", "cdk-client-secret-1234567890"),
        ),
    )

    result = await pull_cdk_connection(
        runtime_client,
        {
            "sourceObjects": ["ServiceOrders"],
            "config": {
                "cdkEndpoints": {
                    "ServiceOrders": {
                        "path": "/api/service-orders",
                        "itemsPath": "records",
                        "nextCursorPath": "pagination.nextOffset",
                        "staticParams": {
                            "tenantId": "dealer-123",
                        },
                        "updatedAfterParam": "lastModifiedFrom",
                        "updatedBeforeParam": "lastModifiedTo",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-cdk-batch-1",
    )

    assert result == CdkPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
