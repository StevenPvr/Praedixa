from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.salesforce.client import SalesforceApiClient
from app.integrations.connectors.salesforce.extractor import (
    SalesforcePullResult,
    pull_salesforce_connection,
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
async def test_pull_provider_events_for_sync_run_skips_disabled_connections() -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "salesforce",
                    "config": {"pullEnabled": False},
                }
            ),
            get_provider_access_context=AsyncMock(),
        ),
    )

    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-disabled-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-disabled-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-disabled-1",
    )

    assert result == ProviderPullResult()
    runtime_client.get_provider_access_context.assert_not_awaited()


@pytest.mark.asyncio
async def test_pull_provider_events_for_sync_run_dispatches_salesforce(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "salesforce",
                    "config": {},
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-salesforce-1",
                    vendor="salesforce",
                    auth_mode="oauth2",
                    runtime_environment="production",
                    base_url="https://example.my.salesforce.com",
                    source_objects=("Account",),
                    header_name="authorization",
                    header_value="Bearer token-123",
                    scopes=("api",),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-salesforce-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-salesforce-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    salesforce_pull = AsyncMock(
        return_value=SalesforcePullResult(
            fetched_records=7,
            accepted_events=6,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_salesforce_connection",
        salesforce_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-salesforce-1",
    )

    assert result == ProviderPullResult(
        fetched_records=7,
        accepted_events=6,
        duplicate_events=1,
    )
    runtime_client.get_provider_access_context.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "conn-salesforce-1",
    )
    salesforce_pull.assert_awaited_once()


@pytest.mark.asyncio
async def test_salesforce_api_client_query_records_follows_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/services/data/v61.0/query":
            assert request.headers["authorization"] == "Bearer token-123"
            assert request.url.params["q"] == "SELECT Id FROM Account"
            return httpx.Response(
                200,
                json={
                    "records": [
                        {
                            "attributes": {"type": "Account"},
                            "Id": "001",
                        }
                    ],
                    "nextRecordsUrl": "/services/data/v61.0/query/01gNEXT",
                },
            )
        if request.url.path == "/services/data/v61.0/query/01gNEXT":
            return httpx.Response(
                200,
                json={
                    "records": [
                        {
                            "attributes": {"type": "Account"},
                            "Id": "002",
                        }
                    ]
                },
            )
        raise AssertionError(f"Unexpected Salesforce request: {request.url}")

    client = SalesforceApiClient(
        base_url="https://example.my.salesforce.com",
        header_name="authorization",
        header_value="Bearer token-123",
        transport=httpx.MockTransport(handler),
    )

    try:
        records = await client.query_records(
            api_version="v61.0",
            soql="SELECT Id FROM Account",
        )
    finally:
        await client.aclose()

    assert records == [{"Id": "001"}, {"Id": "002"}]


@pytest.mark.asyncio
async def test_pull_salesforce_connection_batches_runtime_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "Id": f"001-{index}",
            "Name": f"Account {index}",
            "LastModifiedDate": "2026-03-19T12:00:00Z",
        }
        for index in range(201)
    ]

    async def fake_query_records(
        self: SalesforceApiClient,
        *,
        api_version: str,
        soql: str,
    ) -> list[dict[str, Any]]:
        assert api_version == "v61.0"
        assert "FROM Account" in soql
        return records

    monkeypatch.setattr(
        SalesforceApiClient,
        "query_records",
        fake_query_records,
    )

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
        id="sync-run-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-batch-1",
        vendor="salesforce",
        auth_mode="oauth2",
        runtime_environment="production",
        base_url="https://example.my.salesforce.com",
        source_objects=("Account",),
        header_name="authorization",
        header_value="Bearer token-123",
        scopes=("api",),
    )

    result = await pull_salesforce_connection(
        runtime_client,
        {
            "sourceObjects": ["Account"],
            "config": {},
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-batch-1",
    )

    assert result == SalesforcePullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    assert runtime_client.ingest_provider_events.await_count == 2

    first_call = runtime_client.ingest_provider_events.await_args_list[0]
    second_call = runtime_client.ingest_provider_events.await_args_list[1]

    assert first_call.args == (
        "11111111-1111-1111-1111-111111111111",
        "conn-batch-1",
    )
    assert first_call.kwargs["sync_run_id"] == "sync-run-batch-1"
    assert first_call.kwargs["worker_id"] == "queue-worker-batch-1"
    assert first_call.kwargs["schema_version"] == "salesforce.rest.v1"
    assert len(first_call.kwargs["events"]) == 200
    assert first_call.kwargs["events"][0]["sourceObject"] == "Account"
    assert second_call.kwargs["schema_version"] == "salesforce.rest.v1"
    assert len(second_call.kwargs["events"]) == 1
