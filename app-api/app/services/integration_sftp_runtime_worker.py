"""SFTP-backed connector sync helpers for CSV/TSV/XLSX runtime ingestion."""

from __future__ import annotations

import asyncio
import base64
import binascii
import fnmatch
import hashlib
import io
import posixpath
import socket
import stat
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Protocol, cast
from uuid import UUID

import paramiko  # type: ignore[import-untyped]

from app.services.integration_dataset_file_ingestor import ingest_file_bytes_to_dataset

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


_MAX_TRACKED_PROCESSED_FILES = 512
_SUPPORTED_FORMAT_HINTS = {"csv", "xlsx", "lucca", "payfit"}
_OPENSSH_SHA256_BASE64_LENGTH = 43
_SHA256_DIGEST_LENGTH = 32


@dataclass(frozen=True)
class RuntimeConnectionSyncState:
    """Persisted runtime cursor for one connection/source object pair."""

    source_object: str
    watermark_text: str | None
    watermark_at: str | None
    cursor_json: dict[str, Any]
    last_run_id: str | None
    updated_by_worker: str | None


@dataclass(frozen=True)
class RuntimeSyncRunExecutionPlan:
    """Internal execution plan returned by connectors runtime for a claimed run."""

    run_id: str
    organization_id: str
    connection_id: str
    vendor: str
    auth_mode: str
    config: dict[str, Any]
    source_objects: tuple[str, ...]
    credentials: dict[str, Any]
    sync_states: tuple[RuntimeConnectionSyncState, ...]


@dataclass(frozen=True)
class SftpRemoteFile:
    """Remote SFTP file metadata."""

    path: str
    name: str
    size_bytes: int
    modified_at: datetime


@dataclass(frozen=True)
class SftpArchiveOperation:
    """Remote file that should be archived after the DB transaction commits."""

    remote_path: str


@dataclass(frozen=True)
class PreparedSftpFileImport:
    """Work prepared before the outer runtime commit happens."""

    source_object: str
    rows_received: int
    rows_inserted: int
    dataset_name: str | None
    watermark_text: str | None
    watermark_at: str | None
    cursor_json: dict[str, Any]
    archive_operations: tuple[SftpArchiveOperation, ...]


@dataclass(frozen=True)
class FinalizedSftpFileImport:
    """Post-commit SFTP finalization outcome."""

    sync_state_persisted: bool
    archive_errors: tuple[str, ...]
    sync_state_error: str | None


@dataclass(frozen=True)
class _ParsedSftpPullConfig:
    source_object: str
    dataset_id: UUID
    remote_directory: str
    archive_directory: str | None
    file_pattern: str
    format_hint: str | None
    sheet_name: str | None
    host_key_sha256: str
    max_files_per_run: int


class SyncStateRuntimeClient(Protocol):
    """Subset of the runtime client needed by the SFTP worker."""

    async def upsert_sync_run_state(
        self,
        organization_id: str,
        run_id: str,
        worker_id: str,
        *,
        source_object: str,
        watermark_text: str | None,
        watermark_at: str | None,
        cursor_json: dict[str, Any],
    ) -> None: ...


class SftpExecutionClient(Protocol):
    """Executes remote SFTP operations with a fresh authenticated session."""

    def list_files(
        self,
        credentials: dict[str, Any],
        *,
        remote_directory: str,
        host_key_sha256: str,
    ) -> list[SftpRemoteFile]: ...

    def read_bytes(
        self,
        credentials: dict[str, Any],
        *,
        remote_path: str,
        host_key_sha256: str,
    ) -> bytes: ...

    def archive_file(
        self,
        credentials: dict[str, Any],
        *,
        remote_path: str,
        archive_directory: str,
        host_key_sha256: str,
    ) -> str: ...


@dataclass
class _ParamikoSession:
    transport: paramiko.Transport
    sftp: paramiko.SFTPClient

    def close(self) -> None:
        self.sftp.close()
        self.transport.close()


class ParamikoSftpExecutionClient:
    """Fresh-session Paramiko adapter with strict host-key pinning."""

    def _open_session(
        self,
        credentials: dict[str, Any],
        *,
        host_key_sha256: str,
    ) -> _ParamikoSession:
        host = _require_non_empty_string(credentials.get("host"), field="host")
        username = _require_non_empty_string(
            credentials.get("username"),
            field="username",
        )
        private_key = _require_non_empty_string(
            credentials.get("privateKey"),
            field="privateKey",
        )
        port = _require_int(credentials.get("port", 22), field="port")
        sock = socket.create_connection((host, port), timeout=10.0)
        transport = paramiko.Transport(sock)
        try:
            transport.start_client(timeout=10.0)
            remote_key = transport.get_remote_server_key()
            actual_fingerprint = _host_key_sha256(remote_key)
            if actual_fingerprint != host_key_sha256:
                _raise_value_error("Remote SFTP host key fingerprint mismatch")
            transport.auth_publickey(username, _load_private_key(private_key))
            if not transport.is_authenticated():
                _raise_value_error("SFTP public-key authentication failed")
            sftp = paramiko.SFTPClient.from_transport(transport)
            return _ParamikoSession(transport=transport, sftp=sftp)
        except Exception:
            transport.close()
            raise

    def list_files(
        self,
        credentials: dict[str, Any],
        *,
        remote_directory: str,
        host_key_sha256: str,
    ) -> list[SftpRemoteFile]:
        session = self._open_session(
            credentials,
            host_key_sha256=host_key_sha256,
        )
        try:
            files: list[SftpRemoteFile] = []
            for item in session.sftp.listdir_attr(remote_directory):
                mode = getattr(item, "st_mode", 0)
                if mode and not stat.S_ISREG(mode):
                    continue
                file_path = posixpath.join(remote_directory, item.filename)
                files.append(
                    SftpRemoteFile(
                        path=file_path,
                        name=item.filename,
                        size_bytes=int(item.st_size),
                        modified_at=datetime.fromtimestamp(
                            int(item.st_mtime),
                            tz=UTC,
                        ),
                    )
                )
            return files
        finally:
            session.close()

    def read_bytes(
        self,
        credentials: dict[str, Any],
        *,
        remote_path: str,
        host_key_sha256: str,
    ) -> bytes:
        session = self._open_session(
            credentials,
            host_key_sha256=host_key_sha256,
        )
        try:
            with session.sftp.file(remote_path, "rb") as handle:
                return bytes(handle.read())
        finally:
            session.close()

    def archive_file(
        self,
        credentials: dict[str, Any],
        *,
        remote_path: str,
        archive_directory: str,
        host_key_sha256: str,
    ) -> str:
        session = self._open_session(
            credentials,
            host_key_sha256=host_key_sha256,
        )
        try:
            _ensure_remote_directory(session.sftp, archive_directory)
            base_name = posixpath.basename(remote_path)
            candidate = posixpath.join(archive_directory, base_name)
            if _remote_path_exists(session.sftp, candidate):
                stem, dot, ext = base_name.partition(".")
                timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
                suffix = f".{ext}" if dot else ""
                candidate = posixpath.join(
                    archive_directory,
                    f"{stem}-{timestamp}{suffix}",
                )
            session.sftp.rename(remote_path, candidate)
            return candidate
        finally:
            session.close()


def uses_sftp_file_pull(plan: RuntimeSyncRunExecutionPlan) -> bool:
    """Return whether a claimed run should use the SFTP file-pull path."""

    return plan.auth_mode == "sftp" and isinstance(plan.config.get("sftpPull"), dict)


def _raise_value_error(message: str) -> None:
    raise ValueError(message)


def _raise_type_error(message: str) -> None:
    raise TypeError(message)


def _require_object(value: Any, *, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        _raise_type_error(f"{field} must be an object")
    return cast("dict[str, Any]", value)


def _require_non_empty_string(value: Any, *, field: str) -> str:
    normalized = str(value).strip()
    if not normalized:
        raise ValueError(f"{field} must be a non-empty string")
    return normalized


def _require_optional_non_empty_string(value: Any, *, field: str) -> str | None:
    if value is None:
        return None
    return _require_non_empty_string(value, field=field)


def _require_int(value: Any, *, field: str) -> int:
    if isinstance(value, bool):
        _raise_type_error(f"{field} must be an integer")
    try:
        normalized = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer") from exc
    return normalized


def _require_host_key_sha256(value: Any, *, field: str) -> str:
    fingerprint = _require_non_empty_string(value, field=field)
    if not fingerprint.startswith("SHA256:"):
        raise ValueError("hostKeySha256 must use the OpenSSH SHA256:<base64> form")
    encoded = fingerprint.removeprefix("SHA256:")
    if len(encoded) != _OPENSSH_SHA256_BASE64_LENGTH:
        raise ValueError("hostKeySha256 must be a SHA256 fingerprint without padding")
    try:
        decoded = base64.b64decode(f"{encoded}=", validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("hostKeySha256 must contain valid base64 characters") from exc
    if len(decoded) != _SHA256_DIGEST_LENGTH:
        raise ValueError("hostKeySha256 must decode to a 32-byte SHA256 digest")
    return fingerprint


def _resolve_source_object(
    raw_config: dict[str, Any],
    plan: RuntimeSyncRunExecutionPlan,
) -> str:
    configured_source_object = raw_config.get("sourceObject")
    if configured_source_object is not None:
        source_object = _require_non_empty_string(
            configured_source_object,
            field="sourceObject",
        )
    elif plan.source_objects:
        source_object = plan.source_objects[0]
    else:
        source_object = ""

    if source_object not in plan.source_objects:
        raise ValueError(
            "sftpPull.sourceObject must belong to connection.sourceObjects"
        )
    return source_object


def _parse_sftp_pull_config(
    plan: RuntimeSyncRunExecutionPlan,
) -> _ParsedSftpPullConfig:
    raw_config = _require_object(plan.config.get("sftpPull"), field="config.sftpPull")
    source_object = _resolve_source_object(raw_config, plan)
    dataset_id = UUID(
        _require_non_empty_string(raw_config.get("datasetId"), field="datasetId")
    )
    remote_directory = _require_non_empty_string(
        raw_config.get("remoteDirectory"),
        field="remoteDirectory",
    )
    archive_directory = _require_optional_non_empty_string(
        raw_config.get("archiveDirectory"),
        field="archiveDirectory",
    )
    file_pattern = str(raw_config.get("filePattern") or "*.csv").strip() or "*.csv"
    format_hint = _require_optional_non_empty_string(
        raw_config.get("formatHint"),
        field="formatHint",
    )
    if format_hint is not None and format_hint not in _SUPPORTED_FORMAT_HINTS:
        raise ValueError("formatHint must be one of csv, xlsx, lucca or payfit")
    sheet_name = _require_optional_non_empty_string(
        raw_config.get("sheetName"),
        field="sheetName",
    )
    host_key_sha256 = _require_host_key_sha256(
        raw_config.get("hostKeySha256"),
        field="hostKeySha256",
    )
    raw_max_files_per_run = _require_int(
        raw_config.get("maxFilesPerRun", 5),
        field="maxFilesPerRun",
    )
    max_files_per_run = max(
        1,
        min(50, raw_max_files_per_run),
    )
    return _ParsedSftpPullConfig(
        source_object=source_object,
        dataset_id=dataset_id,
        remote_directory=remote_directory,
        archive_directory=archive_directory,
        file_pattern=file_pattern,
        format_hint=format_hint,
        sheet_name=sheet_name,
        host_key_sha256=host_key_sha256,
        max_files_per_run=max_files_per_run,
    )


def _host_key_sha256(key: paramiko.PKey) -> str:
    digest = hashlib.sha256(key.asbytes()).digest()
    return f"SHA256:{base64.b64encode(digest).decode('ascii').rstrip('=')}"


def _load_private_key(private_key: str) -> paramiko.PKey:
    for key_cls in (
        paramiko.RSAKey,
        paramiko.Ed25519Key,
        paramiko.ECDSAKey,
        paramiko.DSSKey,
    ):
        try:
            return key_cls.from_private_key(io.StringIO(private_key))
        except paramiko.SSHException:
            continue
    raise ValueError("Unsupported SFTP privateKey format")


def _remote_path_exists(sftp: paramiko.SFTPClient, remote_path: str) -> bool:
    try:
        sftp.stat(remote_path)
    except OSError:
        return False
    return True


def _ensure_remote_directory(
    sftp: paramiko.SFTPClient,
    remote_directory: str,
) -> None:
    current = "/"
    for part in [segment for segment in remote_directory.split("/") if segment]:
        current = posixpath.join(current, part)
        if _remote_path_exists(sftp, current):
            continue
        sftp.mkdir(current)


def _build_remote_file_fingerprint(remote_file: SftpRemoteFile) -> str:
    return (
        f"{remote_file.path}|{remote_file.size_bytes}|"
        f"{int(remote_file.modified_at.timestamp())}"
    )


def _normalize_processed_files(
    cursor_json: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    raw_files = cursor_json.get("processedFiles")
    if not isinstance(raw_files, dict):
        return {}
    normalized: dict[str, dict[str, Any]] = {}
    for path, payload in raw_files.items():
        if isinstance(path, str) and isinstance(payload, dict):
            normalized[path] = dict(payload)
    return normalized


def _prune_processed_files(
    processed_files: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    ordered = sorted(
        processed_files.items(),
        key=lambda item: str(item[1].get("processedAt") or ""),
        reverse=True,
    )
    return dict(ordered[:_MAX_TRACKED_PROCESSED_FILES])


def _find_sync_state(
    plan: RuntimeSyncRunExecutionPlan,
    source_object: str,
) -> RuntimeConnectionSyncState | None:
    for state in plan.sync_states:
        if state.source_object == source_object:
            return state
    return None


def _should_skip_file(
    processed_files: dict[str, dict[str, Any]],
    remote_file: SftpRemoteFile,
) -> bool:
    existing = processed_files.get(remote_file.path)
    if existing is None:
        return False
    return existing.get("fingerprint") == _build_remote_file_fingerprint(remote_file)


async def prepare_sftp_file_import(
    tenant: TenantFilter,
    session: AsyncSession,
    execution_plan: RuntimeSyncRunExecutionPlan,
    *,
    worker_id: str,
    request_id: str | None,
    sftp_client: SftpExecutionClient | None = None,
) -> PreparedSftpFileImport:
    """Download and ingest new SFTP files before the outer commit."""

    client = sftp_client or ParamikoSftpExecutionClient()
    pull_config = _parse_sftp_pull_config(execution_plan)
    state = _find_sync_state(execution_plan, pull_config.source_object)
    cursor_json = dict(state.cursor_json) if state is not None else {}
    processed_files = _normalize_processed_files(cursor_json)
    listed_files = await asyncio.to_thread(
        client.list_files,
        execution_plan.credentials,
        remote_directory=pull_config.remote_directory,
        host_key_sha256=pull_config.host_key_sha256,
    )
    candidates = sorted(
        (
            remote_file
            for remote_file in listed_files
            if fnmatch.fnmatch(remote_file.name, pull_config.file_pattern)
            and not _should_skip_file(processed_files, remote_file)
        ),
        key=lambda remote_file: (remote_file.modified_at, remote_file.path),
    )[: pull_config.max_files_per_run]

    latest_watermark_at = state.watermark_at if state is not None else None
    latest_watermark_text = state.watermark_text if state is not None else None
    rows_received = 0
    rows_inserted = 0
    dataset_name: str | None = None
    archive_operations: list[SftpArchiveOperation] = []

    for remote_file in candidates:
        content = await asyncio.to_thread(
            client.read_bytes,
            execution_plan.credentials,
            remote_path=remote_file.path,
            host_key_sha256=pull_config.host_key_sha256,
        )
        ingestion = await ingest_file_bytes_to_dataset(
            tenant,
            session,
            dataset_id=pull_config.dataset_id,
            file_name=remote_file.path,
            content=content,
            format_hint=pull_config.format_hint,
            sheet_name=pull_config.sheet_name,
            request_id=request_id,
            triggered_by="integration_sftp",
        )
        processed_files[remote_file.path] = {
            "fingerprint": _build_remote_file_fingerprint(remote_file),
            "modifiedAt": remote_file.modified_at.isoformat(),
            "processedAt": datetime.now(UTC).isoformat(),
            "sizeBytes": remote_file.size_bytes,
            "datasetName": ingestion.dataset_name,
            "rowsReceived": ingestion.rows_received,
            "rowsInserted": ingestion.rows_inserted,
        }
        rows_received += ingestion.rows_received
        rows_inserted += ingestion.rows_inserted
        dataset_name = ingestion.dataset_name
        latest_watermark_at = remote_file.modified_at.isoformat()
        latest_watermark_text = remote_file.path
        if pull_config.archive_directory is not None:
            archive_operations.append(
                SftpArchiveOperation(remote_path=remote_file.path)
            )

    cursor_json["processedFiles"] = _prune_processed_files(processed_files)
    return PreparedSftpFileImport(
        source_object=pull_config.source_object,
        rows_received=rows_received,
        rows_inserted=rows_inserted,
        dataset_name=dataset_name,
        watermark_text=latest_watermark_text,
        watermark_at=latest_watermark_at,
        cursor_json=cursor_json,
        archive_operations=tuple(archive_operations),
    )


async def finalize_sftp_file_import(
    runtime_client: SyncStateRuntimeClient,
    execution_plan: RuntimeSyncRunExecutionPlan,
    prepared_import: PreparedSftpFileImport,
    *,
    worker_id: str,
    sftp_client: SftpExecutionClient | None = None,
) -> FinalizedSftpFileImport:
    """Persist the sync cursor and best-effort archive imported files."""

    client = sftp_client or ParamikoSftpExecutionClient()
    pull_config = _parse_sftp_pull_config(execution_plan)
    archive_errors: list[str] = []
    cursor_json = dict(prepared_import.cursor_json)
    processed_files = _normalize_processed_files(cursor_json)

    if pull_config.archive_directory is not None:
        for operation in prepared_import.archive_operations:
            try:
                archived_path = await asyncio.to_thread(
                    client.archive_file,
                    execution_plan.credentials,
                    remote_path=operation.remote_path,
                    archive_directory=pull_config.archive_directory,
                    host_key_sha256=pull_config.host_key_sha256,
                )
                entry = processed_files.get(operation.remote_path)
                if entry is not None:
                    entry["archivedPath"] = archived_path
            except Exception as exc:  # pragma: no cover - exercised via caller paths
                archive_errors.append(str(exc)[:400] or "SFTP archive failed")

    cursor_json["processedFiles"] = _prune_processed_files(processed_files)
    sync_state_error: str | None = None
    try:
        await runtime_client.upsert_sync_run_state(
            execution_plan.organization_id,
            execution_plan.run_id,
            worker_id,
            source_object=prepared_import.source_object,
            watermark_text=prepared_import.watermark_text,
            watermark_at=prepared_import.watermark_at,
            cursor_json=cursor_json,
        )
        sync_state_persisted = True
    except Exception as exc:
        sync_state_persisted = False
        sync_state_error = str(exc)[:400] or "sync state persistence failed"

    return FinalizedSftpFileImport(
        sync_state_persisted=sync_state_persisted,
        archive_errors=tuple(archive_errors),
        sync_state_error=sync_state_error,
    )
