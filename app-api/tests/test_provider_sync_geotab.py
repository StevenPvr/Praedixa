from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest

from app.integrations.connectors.geotab.client import GeotabApiClient
from app.integrations.connectors.geotab.extractor import (
    GeotabPullResult,
    pull_geotab_connection,
)
from app.integrations.provider_sync import (
    ProviderPullResult,
    pull_provider_events_for_sync_run,
)
from app.services.integration_runtime_worker import (
    RuntimeClaimedSyncRun,
    RuntimeProviderAccessContext,
)
from app.services.integration_sftp_runtime_worker import (
    RuntimeConnectionSyncState,
    RuntimeSyncRunExecutionPlan,
)


@pytest.mark.asyncio
async def test_pull_provider_events_for_sync_run_dispatches_geotab(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    execution_plan = RuntimeSyncRunExecutionPlan(
        run_id="sync-run-geotab-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-1",
        vendor="geotab",
        auth_mode="session",
        config={},
        source_objects=("Trip",),
        credentials={},
        sync_states=(),
    )
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            get_connection=AsyncMock(
                return_value={
                    "vendor": "geotab",
                    "config": {
                        "geotabFeeds": {
                            "Trip": {
                                "typeName": "Trip",
                            }
                        }
                    },
                }
            ),
            get_provider_access_context=AsyncMock(
                return_value=RuntimeProviderAccessContext(
                    organization_id="11111111-1111-1111-1111-111111111111",
                    connection_id="conn-geotab-1",
                    vendor="geotab",
                    auth_mode="session",
                    runtime_environment="production",
                    base_url="https://my.geotab.com/apiv1",
                    source_objects=("Trip",),
                    header_name="",
                    header_value="",
                    scopes=(),
                    credential_fields=(
                        ("database", "acme-fleet"),
                        ("userName", "dispatcher@example.com"),
                        ("password", "geotab-password-123"),
                    ),
                )
            ),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-geotab-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )

    geotab_pull = AsyncMock(
        return_value=GeotabPullResult(
            fetched_records=7,
            accepted_events=6,
            duplicate_events=1,
        )
    )
    monkeypatch.setattr(
        "app.integrations.provider_sync.pull_geotab_connection",
        geotab_pull,
    )

    result = await pull_provider_events_for_sync_run(
        runtime_client,
        claimed_run,
        worker_id="queue-worker-geotab-1",
        execution_plan=execution_plan,
    )

    assert result == ProviderPullResult(
        fetched_records=7,
        accepted_events=6,
        duplicate_events=1,
    )
    geotab_pull.assert_awaited_once_with(
        runtime_client,
        {
            "vendor": "geotab",
            "config": {
                "geotabFeeds": {
                    "Trip": {
                        "typeName": "Trip",
                    }
                }
            },
        },
        runtime_client.get_provider_access_context.return_value,
        claimed_run,
        execution_plan=execution_plan,
        worker_id="queue-worker-geotab-1",
    )


@pytest.mark.asyncio
async def test_geotab_api_client_authenticate_and_follow_feed_pagination() -> None:
    request_index = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_index
        request_index += 1
        payload = request.read().decode("utf-8")
        body = httpx.Request(
            request.method,
            request.url,
            content=payload,
        )
        parsed = httpx.Response(200, request=body, text=payload).json()

        if request_index == 1:
            assert parsed["method"] == "Authenticate"
            assert parsed["params"] == {
                "database": "acme-fleet",
                "userName": "dispatcher@example.com",
                "password": "geotab-password-123",
            }
            return httpx.Response(
                200,
                json={
                    "result": {
                        "credentials": {
                            "database": "acme-fleet",
                            "userName": "dispatcher@example.com",
                            "sessionId": "session-123",
                        }
                    }
                },
            )

        assert parsed["method"] == "GetFeed"
        assert parsed["params"]["credentials"]["sessionId"] == "session-123"
        assert parsed["params"]["typeName"] == "Trip"
        if request_index == 2:
            assert parsed["params"]["fromVersion"] == "version-1"
            return httpx.Response(
                200,
                json={
                    "result": {
                        "data": [{"id": "trip-1"}, {"id": "trip-2"}],
                        "toVersion": "version-2",
                    }
                },
            )

        assert parsed["params"]["fromVersion"] == "version-2"
        return httpx.Response(
            200,
            json={
                "result": {
                    "data": [{"id": "trip-3"}],
                    "toVersion": "version-3",
                }
            },
        )

    client = GeotabApiClient(
        base_url="https://my.geotab.com/apiv1",
        transport=httpx.MockTransport(handler),
    )

    try:
        credentials = await client.authenticate(
            database="acme-fleet",
            username="dispatcher@example.com",
            password="geotab-password-123",
        )
        records, next_version = await client.get_feed_records(
            type_name="Trip",
            credentials=credentials,
            from_version="version-1",
            search=None,
            results_limit=2,
        )
    finally:
        await client.aclose()

    assert credentials["sessionId"] == "session-123"
    assert records == [{"id": "trip-1"}, {"id": "trip-2"}, {"id": "trip-3"}]
    assert next_version == "version-3"


@pytest.mark.asyncio
async def test_pull_geotab_connection_batches_runtime_ingest_and_persists_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    records = [
        {
            "id": f"trip-{index}",
            "stop": "2026-03-19T12:00:00Z",
            "distance": 12.4,
        }
        for index in range(201)
    ]

    async def fake_authenticate(
        self: GeotabApiClient,
        *,
        database: str,
        username: str,
        password: str,
    ) -> dict[str, str]:
        assert database == "acme-fleet"
        assert username == "dispatcher@example.com"
        assert password == "geotab-password-123"
        return {
            "database": database,
            "userName": username,
            "sessionId": "session-123",
        }

    async def fake_get_feed_records(
        self: GeotabApiClient,
        *,
        type_name: str,
        credentials: dict[str, str],
        from_version: str | None,
        search: dict[str, Any] | None,
        results_limit: int,
    ) -> tuple[list[dict[str, Any]], str | None]:
        assert type_name == "Trip"
        assert credentials["sessionId"] == "session-123"
        assert from_version == "version-1"
        assert search is None
        assert results_limit == 5_000
        return records, "version-2"

    monkeypatch.setattr(GeotabApiClient, "authenticate", fake_authenticate)
    monkeypatch.setattr(GeotabApiClient, "get_feed_records", fake_get_feed_records)

    runtime_client = cast(
        "Any",
        SimpleNamespace(
            ingest_provider_events=AsyncMock(
                side_effect=[
                    {"accepted": 200, "duplicates": 0},
                    {"accepted": 1, "duplicates": 0},
                ]
            ),
            upsert_sync_run_state=AsyncMock(),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-geotab-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-batch-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-batch-1",
        vendor="geotab",
        auth_mode="session",
        runtime_environment="production",
        base_url="https://my.geotab.com/apiv1",
        source_objects=("Trip",),
        header_name="",
        header_value="",
        scopes=(),
        credential_fields=(
            ("database", "acme-fleet"),
            ("userName", "dispatcher@example.com"),
            ("password", "geotab-password-123"),
        ),
    )
    execution_plan = RuntimeSyncRunExecutionPlan(
        run_id="sync-run-geotab-batch-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-batch-1",
        vendor="geotab",
        auth_mode="session",
        config={},
        source_objects=("Trip",),
        credentials={},
        sync_states=(
            RuntimeConnectionSyncState(
                source_object="Trip",
                watermark_text="version-1",
                watermark_at=None,
                cursor_json={"fromVersion": "version-1"},
                last_run_id="run-prev",
                updated_by_worker="worker-prev",
            ),
        ),
    )

    result = await pull_geotab_connection(
        runtime_client,
        {
            "sourceObjects": ["Trip"],
            "config": {
                "geotabFeeds": {
                    "Trip": {
                        "typeName": "Trip",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-geotab-batch-1",
        execution_plan=execution_plan,
    )

    assert result == GeotabPullResult(
        fetched_records=201,
        accepted_events=201,
        duplicate_events=0,
    )
    runtime_client.upsert_sync_run_state.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "sync-run-geotab-batch-1",
        "queue-worker-geotab-batch-1",
        source_object="Trip",
        watermark_text="version-2",
        watermark_at=None,
        cursor_json={"fromVersion": "version-2"},
    )


@pytest.mark.asyncio
async def test_pull_geotab_connection_bootstraps_devices_with_get_and_tail_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_authenticate(
        self: GeotabApiClient,
        *,
        database: str,
        username: str,
        password: str,
    ) -> dict[str, str]:
        return {
            "database": database,
            "userName": username,
            "sessionId": "session-123",
        }

    async def fake_get_records(
        self: GeotabApiClient,
        *,
        type_name: str,
        credentials: dict[str, str],
        search: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        assert type_name == "Device"
        assert search is None
        return [{"id": "device-1", "version": "42"}]

    async def fake_get_feed_tail_version(
        self: GeotabApiClient,
        *,
        type_name: str,
        credentials: dict[str, str],
    ) -> str | None:
        assert type_name == "Device"
        return "version-42"

    monkeypatch.setattr(GeotabApiClient, "authenticate", fake_authenticate)
    monkeypatch.setattr(GeotabApiClient, "get_records", fake_get_records)
    monkeypatch.setattr(
        GeotabApiClient,
        "get_feed_tail_version",
        fake_get_feed_tail_version,
    )

    runtime_client = cast(
        "Any",
        SimpleNamespace(
            ingest_provider_events=AsyncMock(
                return_value={"accepted": 1, "duplicates": 0}
            ),
            upsert_sync_run_state=AsyncMock(),
        ),
    )
    claimed_run = RuntimeClaimedSyncRun(
        id="sync-run-geotab-device-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-device-1",
        trigger_type="manual",
        attempts=1,
        max_attempts=8,
    )
    access_context = RuntimeProviderAccessContext(
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-device-1",
        vendor="geotab",
        auth_mode="session",
        runtime_environment="production",
        base_url="https://my.geotab.com/apiv1",
        source_objects=("Device",),
        header_name="",
        header_value="",
        scopes=(),
        credential_fields=(
            ("database", "acme-fleet"),
            ("userName", "dispatcher@example.com"),
            ("password", "geotab-password-123"),
        ),
    )
    execution_plan = RuntimeSyncRunExecutionPlan(
        run_id="sync-run-geotab-device-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-geotab-device-1",
        vendor="geotab",
        auth_mode="session",
        config={},
        source_objects=("Device",),
        credentials={},
        sync_states=(),
    )

    result = await pull_geotab_connection(
        runtime_client,
        {
            "sourceObjects": ["Device"],
            "config": {
                "geotabFeeds": {
                    "Device": {
                        "typeName": "Device",
                    }
                }
            },
        },
        access_context,
        claimed_run,
        worker_id="queue-worker-geotab-device-1",
        execution_plan=execution_plan,
    )

    assert result == GeotabPullResult(
        fetched_records=1,
        accepted_events=1,
        duplicate_events=0,
    )
    runtime_client.upsert_sync_run_state.assert_awaited_once_with(
        "11111111-1111-1111-1111-111111111111",
        "sync-run-geotab-device-1",
        "queue-worker-geotab-device-1",
        source_object="Device",
        watermark_text="version-42",
        watermark_at=None,
        cursor_json={"fromVersion": "version-42"},
    )
