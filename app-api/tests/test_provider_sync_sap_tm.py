from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.sap_tm.client import SapTmApiClient
from app.integrations.connectors.sap_tm.extractor import (
    SapTmPullResult,
    pull_sap_tm_connection,
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
async def test_pull_provider_events_for_sync_run_dispatches_sap_tm(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "sap_tm",
                    "config": {
                        "sapTmEndpoints": {
                            "FreightOrder": {
                                "path": "/sap/opu/odata/freight-orders",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-sap-tm-1",
                    vendor="sap_tm",
                    auth_mode="oauth2",
                    runtime_environment="production",
                    base_url="https://sap-tm.example.test",
                    source_objects=("FreightOrder",),
                    header_name="authorization",
                    header_value="Bearer sap-access-token-123",
                    scopes=("freightorder.read",),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-sap-tm-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sap-tm-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    sap_pull = AsyncMock(
        return_value=SapTmPullResult(
            fetched_records=10,
            accepted_events=9,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_sap_tm_connection",
        sap_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-sap-tm-1",
    )

    assert result == ProviderPullResult(
        fetched_records=10,
        accepted_events=9,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-sap-tm-1",
    )
    sap_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_sap_tm_api_client_get_records_follows_odata_next_link() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer sap-access-token-123"
        if (
            request.url.path == "/sap/opu/odata/freight-orders"
            and request.url.query == b"%24top=200&%24skiptoken=page-2"
        ):
            return httpx.Response(
                200,
                json={
                    "d": {
                        "results": [{"FreightOrder": "FO-002"}],
                    }
                },
            )
        if (
            request.url.path == "/sap/opu/odata/freight-orders"
            and request.url.query in (b"", b"%24top=200")
        ):
            return httpx.Response(
                200,
                json={
                    "d": {
                        "results": [{"FreightOrder": "FO-001"}],
                        "__next": "/sap/opu/odata/freight-orders?$skiptoken=page-2",
                    }
                },
            )
        raise AssertionError(f"Unexpected SAP TM request: {request.url}")

    client = SapTmApiClient(
        base_url="https://sap-tm.example.test",
        header_name="authorization",
        header_value="Bearer sap-access-token-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.get_records(
            "/sap/opu/odata/freight-orders",
            params={"$top": "200"},
            items_path="d.results",
            next_cursor_path="d.__next",
            cursor_param="$skiptoken",
        )
    finally:
        await client.aclose()

    assert records == [{"FreightOrder": "FO-001"}, {"FreightOrder": "FO-002"}]


@pytest.mark.asyncio
async def test_pull_sap_tm_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "FreightOrder": f"FO-{index:03d}",
            "ChangedOn": "2026-03-20T08:00:00Z",
            "LifecycleStatus": "EXECUTION",
        }
        for index in range(201)
    ]

    async def fake_get_records(
        self: SapTmApiClient,
        path: str,
        *,
        params: dict[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        assert path == "/sap/opu/odata/freight-orders"
        assert params == {
            "$select": "FreightOrder,ChangedOn,LifecycleStatus",
            "$top": "200",
            "changedAfter": "2026-03-19T00:00:00Z",
            "changedBefore": "2026-03-20T00:00:00Z",
        }
        assert items_path == "d.results"
        assert next_cursor_path == "d.__next"
        assert cursor_param == "$skiptoken"
        return records

    monkeypatch.setattr(SapTmApiClient, "get_records", fake_get_records)

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
        id="sync-run-sap-tm-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sap-tm-batch-1",
        trigger_type="manual",
        source_window_start="2026-03-19T00:00:00Z",
        source_window_end="2026-03-20T00:00:00Z",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sap-tm-batch-1",
        vendor="sap_tm",
        auth_mode="oauth2",
        runtime_environment="production",
        base_url="https://sap-tm.example.test",
        source_objects=("FreightOrder",),
        header_name="authorization",
        header_value="Bearer sap-access-token-123",
        scopes=("freightorder.read",),
    )

    result = await pull_sap_tm_connection(
        runtime_client,
        {
            "sourceObjects": ["FreightOrder"],
            "config": {
                "sapTmEndpoints": {
                    "FreightOrder": {
                        "path": "/sap/opu/odata/freight-orders",
                        "itemsPath": "d.results",
                        "nextCursorPath": "d.__next",
                        "staticParams": {
                            "$select": "FreightOrder,ChangedOn,LifecycleStatus",
                        },
                        "updatedAfterParam": "changedAfter",
                        "updatedBeforeParam": "changedBefore",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-sap-tm-batch-1",
    )

    assert result == SapTmPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2
