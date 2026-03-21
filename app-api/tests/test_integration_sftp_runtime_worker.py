from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.security import TenantFilter
from app.services.integration_dataset_file_ingestor import DatasetFileIngestionResult
from app.services.integration_sftp_runtime_worker import (
    PreparedSftpFileImport,
    RuntimeConnectionSyncState,
    RuntimeSyncRunExecutionPlan,
    SftpArchiveOperation,
    SftpRemoteFile,
    finalize_sftp_file_import,
    prepare_sftp_file_import,
)

VALID_HOST_KEY_SHA256 = "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
TEST_PRIVATE_KEY = (
    "-----BEGIN"
    " PRIVATE KEY-----\n"
    "key\n"
    "-----END"
    " PRIVATE KEY-----"
)
TEST_SFTP_CREDENTIALS = {
    "host": "sftp.vendor.example.test",
    "username": "praedixa",
    "privateKey": TEST_PRIVATE_KEY,
    "port": 22,
}


class FakeSftpClient:
    def __init__(self) -> None:
        self.archived: list[tuple[str, str]] = []

    def list_files(
        self,
        credentials: dict[str, Any],
        *,
        remote_directory: str,
        host_key_sha256: str,
    ) -> list[SftpRemoteFile]:
        assert credentials["host"] == "sftp.vendor.example.test"
        assert remote_directory == "/exports"
        assert host_key_sha256 == VALID_HOST_KEY_SHA256
        return [
            SftpRemoteFile(
                path="/exports/employees_2026-03-19.csv",
                name="employees_2026-03-19.csv",
                size_bytes=128,
                modified_at=datetime.fromisoformat("2026-03-19T12:00:00+00:00"),
            )
        ]

    def read_bytes(
        self,
        credentials: dict[str, Any],
        *,
        remote_path: str,
        host_key_sha256: str,
    ) -> bytes:
        assert remote_path == "/exports/employees_2026-03-19.csv"
        return b"employee_id;updated_at\n001;2026-03-19T12:00:00Z\n"

    def archive_file(
        self,
        credentials: dict[str, Any],
        *,
        remote_path: str,
        archive_directory: str,
        host_key_sha256: str,
    ) -> str:
        archived_path = f"{archive_directory}/employees_2026-03-19.csv"
        self.archived.append((remote_path, archived_path))
        return archived_path


def _build_sftp_pull_config(
    *,
    host_key_sha256: str = VALID_HOST_KEY_SHA256,
) -> dict[str, Any]:
    return {
        "sourceObject": "Employees",
        "datasetId": "11111111-1111-1111-1111-111111111111",
        "remoteDirectory": "/exports",
        "archiveDirectory": "/processed",
        "filePattern": "*.csv",
        "hostKeySha256": host_key_sha256,
    }


def _build_execution_plan(
    *,
    sync_states: tuple[RuntimeConnectionSyncState, ...] = (),
    host_key_sha256: str = VALID_HOST_KEY_SHA256,
) -> RuntimeSyncRunExecutionPlan:
    return RuntimeSyncRunExecutionPlan(
        run_id="sync-run-sftp-1",
        organization_id="11111111-1111-1111-1111-111111111111",
        connection_id="conn-sftp-1",
        vendor="fourth",
        auth_mode="sftp",
        config={
            "sftpPull": _build_sftp_pull_config(
                host_key_sha256=host_key_sha256,
            )
        },
        source_objects=("Employees",),
        credentials=TEST_SFTP_CREDENTIALS,
        sync_states=sync_states,
    )


@pytest.mark.asyncio
async def test_prepare_sftp_file_import_ingests_matching_files(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_sftp_client = FakeSftpClient()

    async def fake_ingest(
        *args: object,
        **kwargs: object,
    ) -> DatasetFileIngestionResult:
        return DatasetFileIngestionResult(
            dataset_id=cast("Any", kwargs["dataset_id"]),
            dataset_name="fourth_employees",
            rows_received=1,
            rows_inserted=1,
            batch_id=cast("Any", uuid4()),
            warnings=(),
        )

    monkeypatch.setattr(
        "app.services.integration_sftp_runtime_worker.ingest_file_bytes_to_dataset",
        fake_ingest,
    )

    prepared = await prepare_sftp_file_import(
        TenantFilter("11111111-1111-1111-1111-111111111111"),
        AsyncMock(),
        _build_execution_plan(),
        worker_id="queue-worker-sftp-1",
        request_id="req-sftp-1",
        sftp_client=fake_sftp_client,
    )

    assert prepared == PreparedSftpFileImport(
        source_object="Employees",
        rows_received=1,
        rows_inserted=1,
        dataset_name="fourth_employees",
        watermark_text="/exports/employees_2026-03-19.csv",
        watermark_at="2026-03-19T12:00:00+00:00",
        cursor_json=prepared.cursor_json,
        archive_operations=prepared.archive_operations,
    )
    processed = prepared.cursor_json["processedFiles"]
    assert "/exports/employees_2026-03-19.csv" in processed
    assert len(prepared.archive_operations) == 1


@pytest.mark.asyncio
async def test_finalize_sftp_file_import_persists_cursor_with_archived_path() -> None:
    runtime_client = cast(
        "Any",
        SimpleNamespace(
            upsert_sync_run_state=AsyncMock(),
        ),
    )
    fake_sftp_client = FakeSftpClient()
    prepared = PreparedSftpFileImport(
        source_object="Employees",
        rows_received=1,
        rows_inserted=1,
        dataset_name="fourth_employees",
        watermark_text="/exports/employees_2026-03-19.csv",
        watermark_at="2026-03-19T12:00:00+00:00",
        cursor_json={
            "processedFiles": {
                "/exports/employees_2026-03-19.csv": {
                    "fingerprint": "employees-1",
                    "processedAt": "2026-03-19T12:01:00+00:00",
                }
            }
        },
        archive_operations=(
            SftpArchiveOperation(remote_path="/exports/employees_2026-03-19.csv"),
        ),
    )

    result = await finalize_sftp_file_import(
        runtime_client,
        _build_execution_plan(),
        prepared,
        worker_id="queue-worker-sftp-1",
        sftp_client=fake_sftp_client,
    )

    assert result.sync_state_persisted is True
    assert result.archive_errors == ()
    runtime_client.upsert_sync_run_state.assert_awaited_once()
    call = runtime_client.upsert_sync_run_state.await_args
    assert call is not None
    cursor_json = call.kwargs["cursor_json"]
    processed_entry = cursor_json["processedFiles"]["/exports/employees_2026-03-19.csv"]
    assert processed_entry["archivedPath"] == "/processed/employees_2026-03-19.csv"


@pytest.mark.asyncio
async def test_prepare_sftp_file_import_rejects_invalid_host_key_fingerprint() -> None:
    with pytest.raises(ValueError, match="hostKeySha256"):
        await prepare_sftp_file_import(
            TenantFilter("11111111-1111-1111-1111-111111111111"),
            AsyncMock(),
            _build_execution_plan(
                host_key_sha256="SHA256:not-a-real-fingerprint",
            ),
            worker_id="queue-worker-sftp-1",
            request_id="req-sftp-invalid-host-key",
            sftp_client=FakeSftpClient(),
        )
