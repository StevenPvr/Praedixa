"""Worker orchestration between connectors runtime and Python dataset pipeline."""

from __future__ import annotations

import ipaddress
import time
import urllib.parse
from dataclasses import dataclass
from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, cast

import httpx

from app.core.config import settings
from app.core.telemetry import TelemetryContext, get_telemetry_logger
from app.services.integration_event_ingestor import (
    ConnectorPayloadLoader,
    ingest_raw_events_to_dataset,
)
from app.services.integration_sftp_runtime_worker import (
    RuntimeConnectionSyncState,
    RuntimeSyncRunExecutionPlan,
    finalize_sftp_file_import,
    prepare_sftp_file_import,
    uses_sftp_file_pull,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter

logger = get_telemetry_logger(__name__)
_MIN_RUNTIME_TOKEN_LENGTH = 32
_RUNTIME_ERROR_INVALID_INPUT = "invalid_mapping_or_payload"
_RUNTIME_ERROR_HTTP = "connectors_runtime_http_error"
_RUNTIME_ERROR_UNREACHABLE = "connectors_runtime_unreachable"
_RUNTIME_ERROR_GENERIC = "connector_ingestion_failed"
_HTTP_STATUS_RETRYABLE = {408, 425, 429}
_HTTP_STATUS_SERVER_ERROR_MIN = 500
_MAX_SYNC_RETRY_DELAY_SECONDS = 3600
IPAddress = ipaddress.IPv4Address | ipaddress.IPv6Address


@dataclass(frozen=True)
class RuntimeClaimedRawEvent:
    """Claimed raw-event metadata returned by connectors runtime."""

    id: str
    object_store_key: str


@dataclass(frozen=True)
class RuntimeDrainResult:
    """Summary of one worker drain iteration."""

    claimed: int
    processed: int
    failed: int
    dataset_name: str | None = None


@dataclass(frozen=True)
class RuntimeClaimedSyncRun:
    """Claimed sync-run metadata returned by connectors runtime."""

    id: str
    organization_id: str
    connection_id: str
    trigger_type: str
    attempts: int
    max_attempts: int
    source_window_start: str | None = None
    source_window_end: str | None = None
    force_full_sync: bool = False


@dataclass(frozen=True)
class RuntimeSyncRunResult:
    """Summary of one claimed sync-run execution."""

    run_id: str
    organization_id: str
    connection_id: str
    status: str
    claimed: int
    processed: int
    failed: int
    dataset_name: str | None = None
    error_class: str | None = None
    error_message: str | None = None
    retryable: bool = False


@dataclass(frozen=True)
class RuntimeProviderAccessContext:
    """Resolved provider access context returned by connectors runtime."""

    organization_id: str
    connection_id: str
    vendor: str
    auth_mode: str
    runtime_environment: str
    base_url: str
    source_objects: tuple[str, ...]
    header_name: str
    header_value: str
    scopes: tuple[str, ...]
    additional_headers: tuple[tuple[str, str], ...] = ()
    credential_fields: tuple[tuple[str, str], ...] = ()


class ConnectorsRuntimeClient:
    """Thin authenticated client for internal connectors runtime routes."""

    def __init__(
        self,
        base_url: str,
        token: str,
        *,
        timeout_seconds: float = 10.0,
        telemetry_context: TelemetryContext | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.telemetry_context = telemetry_context or TelemetryContext()
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "authorization": f"Bearer {token}",
                "accept": "application/json",
            },
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=False,
        )

    def with_telemetry_context(
        self,
        telemetry_context: TelemetryContext,
    ) -> ConnectorsRuntimeClient:
        clone = self.__class__.__new__(self.__class__)
        clone.base_url = self.base_url
        clone.telemetry_context = telemetry_context
        clone.client = self.client
        return clone

    async def aclose(self) -> None:
        await self.client.aclose()

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> Any:
        response = await self.client.request(
            method,
            path,
            json=json_body,
            headers=self.telemetry_context.as_http_headers() or None,
        )
        response.raise_for_status()
        payload = response.json()
        if not _is_success_payload(payload):
            raise ValueError("connectors runtime returned an invalid success payload")
        return payload.get("data")

    async def get_connection(
        self,
        organization_id: str,
        connection_id: str,
    ) -> dict[str, Any]:
        data = await self._request_json(
            "GET",
            f"/v1/organizations/{organization_id}/connections/{connection_id}",
        )
        if not isinstance(data, dict):
            raise TypeError("connection payload must be an object")
        return cast("dict[str, Any]", data)

    async def claim_sync_runs(
        self,
        worker_id: str,
        *,
        limit: int,
        lease_seconds: int,
    ) -> list[RuntimeClaimedSyncRun]:
        data = await self._request_json(
            "POST",
            "/v1/runtime/sync-runs/claim",
            json_body={
                "workerId": worker_id,
                "limit": limit,
                "leaseSeconds": lease_seconds,
            },
        )
        if not isinstance(data, list):
            raise TypeError("claimed sync runs payload must be a list")
        runs: list[RuntimeClaimedSyncRun] = []
        for item in data:
            if not isinstance(item, dict):
                raise TypeError("each claimed sync run must be an object")
            runs.append(
                RuntimeClaimedSyncRun(
                    id=str(item["id"]),
                    organization_id=str(item["organizationId"]),
                    connection_id=str(item["connectionId"]),
                    trigger_type=str(item["triggerType"]),
                    source_window_start=cast(
                        "str | None",
                        item.get("sourceWindowStart"),
                    ),
                    source_window_end=cast(
                        "str | None",
                        item.get("sourceWindowEnd"),
                    ),
                    force_full_sync=bool(item.get("forceFullSync", False)),
                    attempts=int(item["attempts"]),
                    max_attempts=int(item["maxAttempts"]),
                )
            )
        return runs

    async def get_sync_run_execution_plan(
        self,
        organization_id: str,
        run_id: str,
        worker_id: str,
    ) -> RuntimeSyncRunExecutionPlan:
        data = await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/sync-runs/{run_id}/execution-plan",
            json_body={"workerId": worker_id},
        )
        if not isinstance(data, dict):
            raise TypeError("sync run execution plan payload must be an object")
        run_payload = data.get("run")
        connection_payload = data.get("connection")
        credentials_payload = data.get("credentials")
        sync_states_payload = data.get("syncStates")
        if not isinstance(run_payload, dict):
            raise TypeError("sync run execution plan.run must be an object")
        if not isinstance(connection_payload, dict):
            raise TypeError("sync run execution plan.connection must be an object")
        if not isinstance(credentials_payload, dict):
            raise TypeError("sync run execution plan.credentials must be an object")
        if not isinstance(sync_states_payload, list):
            raise TypeError("sync run execution plan.syncStates must be a list")

        config = connection_payload.get("config", {})
        if not isinstance(config, dict):
            raise TypeError(
                "sync run execution plan.connection.config must be an object"
            )
        source_objects = connection_payload.get("sourceObjects", [])
        if not isinstance(source_objects, list):
            raise TypeError(
                "sync run execution plan.connection.sourceObjects must be a list"
            )

        sync_states: list[RuntimeConnectionSyncState] = []
        for item in sync_states_payload:
            if not isinstance(item, dict):
                raise TypeError("each sync state must be an object")
            cursor_json = item.get("cursorJson", {})
            if not isinstance(cursor_json, dict):
                raise TypeError("sync state cursorJson must be an object")
            sync_states.append(
                RuntimeConnectionSyncState(
                    source_object=str(item["sourceObject"]),
                    watermark_text=(
                        str(item["watermarkText"])
                        if item.get("watermarkText") is not None
                        else None
                    ),
                    watermark_at=(
                        str(item["watermarkAt"])
                        if item.get("watermarkAt") is not None
                        else None
                    ),
                    cursor_json=cast("dict[str, Any]", cursor_json),
                    last_run_id=(
                        str(item["lastRunId"])
                        if item.get("lastRunId") is not None
                        else None
                    ),
                    updated_by_worker=(
                        str(item["updatedByWorker"])
                        if item.get("updatedByWorker") is not None
                        else None
                    ),
                )
            )

        return RuntimeSyncRunExecutionPlan(
            run_id=str(run_payload["id"]),
            organization_id=str(run_payload["organizationId"]),
            connection_id=str(connection_payload["id"]),
            vendor=str(connection_payload["vendor"]),
            auth_mode=str(connection_payload["authMode"]),
            config=cast("dict[str, Any]", config),
            source_objects=tuple(str(item) for item in source_objects),
            credentials=cast("dict[str, Any]", credentials_payload),
            sync_states=tuple(sync_states),
        )

    async def get_provider_access_context(
        self,
        organization_id: str,
        connection_id: str,
    ) -> RuntimeProviderAccessContext:
        data = await self._request_json(
            "GET",
            f"/v1/runtime/organizations/{organization_id}/connections/{connection_id}/access-context",
        )
        if not isinstance(data, dict):
            raise TypeError("provider access context payload must be an object")
        authorization = data.get("authorization")
        if not isinstance(authorization, dict):
            raise TypeError("provider access authorization payload must be an object")
        raw_source_objects = data.get("sourceObjects")
        if not isinstance(raw_source_objects, list):
            raise TypeError("provider access sourceObjects must be a list")
        raw_scopes = authorization.get("scopes")
        if raw_scopes is None:
            scopes: tuple[str, ...] = ()
        elif isinstance(raw_scopes, list):
            scopes = tuple(str(scope) for scope in raw_scopes)
        else:
            raise TypeError("provider access scopes must be a list or null")
        raw_additional_headers = authorization.get("additionalHeaders")
        if raw_additional_headers is None:
            additional_headers: tuple[tuple[str, str], ...] = ()
        elif isinstance(raw_additional_headers, dict):
            additional_headers = tuple(
                (str(name), str(value))
                for name, value in raw_additional_headers.items()
            )
        else:
            raise TypeError(
                "provider access additionalHeaders must be an object or null"
            )
        raw_credential_fields = authorization.get("credentialFields")
        if raw_credential_fields is None:
            credential_fields: tuple[tuple[str, str], ...] = ()
        elif isinstance(raw_credential_fields, dict):
            credential_fields = tuple(
                (str(name), str(value)) for name, value in raw_credential_fields.items()
            )
        else:
            raise TypeError(
                "provider access credentialFields must be an object or null"
            )
        return RuntimeProviderAccessContext(
            organization_id=str(data["organizationId"]),
            connection_id=str(data["connectionId"]),
            vendor=str(data["vendor"]),
            auth_mode=str(data["authMode"]),
            runtime_environment=str(data["runtimeEnvironment"]),
            base_url=str(data["baseUrl"]),
            source_objects=tuple(str(item) for item in raw_source_objects),
            header_name=str(authorization["headerName"]),
            header_value=str(authorization["headerValue"]),
            scopes=scopes,
            additional_headers=additional_headers,
            credential_fields=credential_fields,
        )

    async def claim_raw_events(
        self,
        organization_id: str,
        connection_id: str,
        worker_id: str,
        *,
        limit: int,
    ) -> list[RuntimeClaimedRawEvent]:
        data = await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/connections/{connection_id}/raw-events/claim",
            json_body={"workerId": worker_id, "limit": limit},
        )
        if not isinstance(data, list):
            raise TypeError("claimed raw events payload must be a list")
        events: list[RuntimeClaimedRawEvent] = []
        for item in data:
            if not isinstance(item, dict):
                raise TypeError("each claimed raw event must be an object")
            events.append(
                RuntimeClaimedRawEvent(
                    id=str(item["id"]),
                    object_store_key=str(item["objectStoreKey"]),
                )
            )
        return events

    async def get_raw_event_payload(
        self,
        organization_id: str,
        connection_id: str,
        raw_event_id: str,
    ) -> dict[str, Any]:
        data = await self._request_json(
            "GET",
            f"/v1/organizations/{organization_id}/connections/{connection_id}/raw-events/{raw_event_id}/payload",
        )
        if not isinstance(data, dict):
            raise TypeError("raw event payload must be an object")
        return cast("dict[str, Any]", data)

    async def mark_raw_event_processed(
        self,
        organization_id: str,
        connection_id: str,
        raw_event_id: str,
        worker_id: str,
    ) -> None:
        await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/connections/{connection_id}/raw-events/{raw_event_id}/processed",
            json_body={"workerId": worker_id},
        )

    async def mark_raw_event_failed(
        self,
        organization_id: str,
        connection_id: str,
        raw_event_id: str,
        worker_id: str,
        error_message: str,
    ) -> None:
        await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/connections/{connection_id}/raw-events/{raw_event_id}/failed",
            json_body={
                "workerId": worker_id,
                "errorMessage": error_message[:400],
            },
        )

    async def mark_sync_run_completed(
        self,
        organization_id: str,
        run_id: str,
        worker_id: str,
        *,
        records_fetched: int,
        records_written: int,
    ) -> None:
        await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/sync-runs/{run_id}/completed",
            json_body={
                "workerId": worker_id,
                "recordsFetched": records_fetched,
                "recordsWritten": records_written,
            },
        )

    async def mark_sync_run_failed(
        self,
        organization_id: str,
        run_id: str,
        worker_id: str,
        error_message: str,
        *,
        error_class: str | None = None,
        retryable: bool = False,
        retry_delay_seconds: int | None = None,
    ) -> None:
        body: dict[str, Any] = {
            "workerId": worker_id,
            "errorMessage": error_message[:400],
            "retryable": retryable,
        }
        if error_class is not None:
            body["errorClass"] = error_class
        if retry_delay_seconds is not None:
            body["retryDelaySeconds"] = retry_delay_seconds
        await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/sync-runs/{run_id}/failed",
            json_body=body,
        )

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
    ) -> None:
        body: dict[str, Any] = {
            "workerId": worker_id,
            "sourceObject": source_object,
            "cursorJson": cursor_json,
        }
        if watermark_text is not None:
            body["watermarkText"] = watermark_text
        if watermark_at is not None:
            body["watermarkAt"] = watermark_at
        await self._request_json(
            "POST",
            f"/v1/organizations/{organization_id}/sync-runs/{run_id}/sync-state",
            json_body=body,
        )

    async def ingest_provider_events(
        self,
        organization_id: str,
        connection_id: str,
        *,
        sync_run_id: str,
        worker_id: str,
        schema_version: str,
        events: list[dict[str, Any]],
    ) -> dict[str, Any]:
        data = await self._request_json(
            "POST",
            f"/v1/runtime/organizations/{organization_id}/connections/{connection_id}/provider-events",
            json_body={
                "syncRunId": sync_run_id,
                "workerId": worker_id,
                "schemaVersion": schema_version,
                "events": events,
            },
        )
        if not isinstance(data, dict):
            raise TypeError("provider ingest payload must be an object")
        return cast("dict[str, Any]", data)


def _parse_allowed_hosts(raw_value: str) -> tuple[str, ...]:
    return tuple(host.strip().lower() for host in raw_value.split(",") if host.strip())


def _is_success_payload(payload: Any) -> bool:
    return isinstance(payload, dict) and payload.get("success") is True


def _is_local_runtime_host(host: str, host_ip: IPAddress | None) -> bool:
    return (
        host == "localhost"
        or host.endswith(".localhost")
        or (host_ip is not None and host_ip.is_loopback)
    )


def _is_allowed_runtime_host(host: str, allowed_hosts: tuple[str, ...]) -> bool:
    return any(
        host == allowed or host.endswith(f".{allowed}") for allowed in allowed_hosts
    )


def _validate_runtime_base_url(
    base_url: str,
    *,
    environment: str,
    allowed_hosts: tuple[str, ...],
) -> str:
    parsed = urllib.parse.urlparse(base_url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("CONNECTORS_RUNTIME_URL must use http or https")
    if parsed.username or parsed.password:
        raise ValueError("CONNECTORS_RUNTIME_URL must not embed credentials")
    if parsed.query or parsed.fragment:
        raise ValueError("CONNECTORS_RUNTIME_URL must not include query or fragment")

    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise ValueError("CONNECTORS_RUNTIME_URL must include a hostname")

    try:
        host_ip = ipaddress.ip_address(host)
    except ValueError:
        host_ip = None

    is_local_host = _is_local_runtime_host(host, host_ip)

    if environment == "development":
        if parsed.scheme == "http" and not is_local_host:
            raise ValueError(
                "CONNECTORS_RUNTIME_URL may use http only for localhost in development"
            )
        return base_url.strip().rstrip("/")

    if parsed.scheme != "https":
        raise ValueError("CONNECTORS_RUNTIME_URL must use https outside development")
    if is_local_host:
        raise ValueError(
            "CONNECTORS_RUNTIME_URL must not target localhost outside development"
        )
    if not allowed_hosts:
        raise ValueError(
            "CONNECTORS_RUNTIME_ALLOWED_HOSTS must be configured outside development"
        )
    if not _is_allowed_runtime_host(host, allowed_hosts):
        raise ValueError("CONNECTORS_RUNTIME_URL host is not on the allowlist")

    return base_url.strip().rstrip("/")


def _normalize_batch_limit(limit: int) -> int:
    return max(1, min(limit, settings.CONNECTORS_RUNTIME_MAX_BATCH_SIZE))


def _sanitize_runtime_error(exc: Exception) -> str:
    if isinstance(exc, (ValueError, TypeError)):
        return _RUNTIME_ERROR_INVALID_INPUT
    if isinstance(exc, httpx.HTTPStatusError):
        return _RUNTIME_ERROR_HTTP
    if isinstance(exc, httpx.HTTPError):
        return _RUNTIME_ERROR_UNREACHABLE
    return _RUNTIME_ERROR_GENERIC


def _classify_sync_run_failure(exc: Exception) -> tuple[str, bool]:
    if isinstance(exc, (ValueError, TypeError)):
        return ("mapping", False)
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        if (
            status_code in _HTTP_STATUS_RETRYABLE
            or status_code >= _HTTP_STATUS_SERVER_ERROR_MIN
        ):
            return ("transient", True)
        return ("provider", False)
    if isinstance(exc, httpx.HTTPError):
        return ("transient", True)
    return ("system", False)


def _compute_sync_retry_delay_seconds(attempts: int) -> int:
    safe_attempts = max(1, attempts)
    return int(min(_MAX_SYNC_RETRY_DELAY_SECONDS, 30 * (2 ** (safe_attempts - 1))))


def build_default_runtime_client() -> ConnectorsRuntimeClient:
    """Create the runtime client from application settings."""

    base_url = _validate_runtime_base_url(
        settings.CONNECTORS_RUNTIME_URL,
        environment=settings.ENVIRONMENT.strip().lower(),
        allowed_hosts=_parse_allowed_hosts(settings.CONNECTORS_RUNTIME_ALLOWED_HOSTS),
    )
    token = settings.CONNECTORS_RUNTIME_TOKEN.strip()
    if not base_url:
        raise ValueError("CONNECTORS_RUNTIME_URL must be configured")
    if len(token) < _MIN_RUNTIME_TOKEN_LENGTH:
        raise ValueError("CONNECTORS_RUNTIME_TOKEN must be configured")

    return ConnectorsRuntimeClient(
        base_url,
        token,
        timeout_seconds=settings.CONNECTORS_RUNTIME_TIMEOUT_SECONDS,
    )


class RuntimePayloadLoader(ConnectorPayloadLoader):
    """Payload loader backed by connectors runtime internal payload endpoint."""

    def __init__(
        self,
        runtime_client: ConnectorsRuntimeClient,
        organization_id: str,
        connection_id: str,
        event_lookup: dict[str, str],
    ) -> None:
        self.runtime_client = runtime_client
        self.organization_id = organization_id
        self.connection_id = connection_id
        self.event_lookup = event_lookup

    async def load_json(self, object_store_key: str) -> dict[str, Any]:
        raw_event_id = self.event_lookup.get(object_store_key)
        if raw_event_id is None:
            raise ValueError(
                "No raw-event id was found for the provided object_store_key"
            )
        return await self.runtime_client.get_raw_event_payload(
            self.organization_id,
            self.connection_id,
            raw_event_id,
        )


async def drain_connector_connection(
    tenant: TenantFilter,
    session: AsyncSession,
    runtime_client: ConnectorsRuntimeClient,
    *,
    organization_id: str,
    connection_id: str,
    worker_id: str,
    limit: int = 50,
    request_id: str | None = None,
    run_id: str | None = None,
    connector_run_id: str | None = None,
    trace_id: str | None = None,
) -> RuntimeDrainResult:
    """Claim one batch of raw events and route them into the dataset pipeline."""
    normalized_limit = _normalize_batch_limit(limit)
    started_at = time.perf_counter()
    telemetry_context = TelemetryContext(
        request_id=request_id,
        run_id=run_id,
        connector_run_id=connector_run_id,
        organization_id=organization_id,
        trace_id=trace_id,
    )
    telemetry = logger.bind(**telemetry_context.as_log_fields())
    bound_runtime_client = _bind_runtime_client_telemetry(
        runtime_client, telemetry_context
    )

    connection = await bound_runtime_client.get_connection(
        organization_id, connection_id
    )
    config = connection.get("config", {})
    if not isinstance(config, dict):
        raise TypeError("connection config must be an object")
    fields_json = config.get("datasetMapping")
    if not isinstance(fields_json, dict):
        raise TypeError("connection.config.datasetMapping must be configured")

    claimed = await bound_runtime_client.claim_raw_events(
        organization_id,
        connection_id,
        worker_id,
        limit=normalized_limit,
    )
    if not claimed:
        telemetry.info(
            "Connector drain completed with no claimed raw events",
            event="connector.runtime.drain.completed",
            status="success",
            connection_id=connection_id,
            worker_id=worker_id,
            claimed_count=0,
            processed_count=0,
            failed_count=0,
            duration_ms=_duration_ms(started_at),
        )
        return RuntimeDrainResult(claimed=0, processed=0, failed=0, dataset_name=None)

    payload_loader = RuntimePayloadLoader(
        bound_runtime_client,
        organization_id,
        connection_id,
        {event.object_store_key: event.id for event in claimed},
    )
    raw_events = [
        cast(
            "Any",
            SimpleNamespace(
                object_store_key=event.object_store_key,
            ),
        )
        for event in claimed
    ]

    try:
        telemetry.info(
            "Connector drain started",
            event="connector.runtime.drain.started",
            status="running",
            connection_id=connection_id,
            worker_id=worker_id,
            claimed_count=len(claimed),
        )
        ingestion = await ingest_raw_events_to_dataset(
            tenant,
            session,
            raw_events,
            fields_json,
            payload_loader,
        )
        for event in claimed:
            await bound_runtime_client.mark_raw_event_processed(
                organization_id,
                connection_id,
                event.id,
                worker_id,
            )
        duration_ms = _duration_ms(started_at)
        dataset_name = ingestion.dataset_name if ingestion is not None else None
        telemetry.info(
            "Connector drain completed",
            event="connector.runtime.drain.completed",
            status="success",
            connection_id=connection_id,
            worker_id=worker_id,
            claimed_count=len(claimed),
            processed_count=len(claimed),
            failed_count=0,
            dataset_name=dataset_name,
            duration_ms=duration_ms,
        )
        return RuntimeDrainResult(
            claimed=len(claimed),
            processed=len(claimed),
            failed=0,
            dataset_name=dataset_name,
        )
    except Exception as exc:
        sanitized_error = _sanitize_runtime_error(exc)
        telemetry.exception(
            "Connector drain failed",
            event="connector.runtime.drain.failed",
            status="failed",
            connection_id=connection_id,
            worker_id=worker_id,
            claimed_count=len(claimed),
            failed_count=len(claimed),
            error_code=sanitized_error,
            duration_ms=_duration_ms(started_at),
        )
        for event in claimed:
            await bound_runtime_client.mark_raw_event_failed(
                organization_id,
                connection_id,
                event.id,
                worker_id,
                sanitized_error,
            )
        raise


async def _process_sftp_sync_run(
    tenant: TenantFilter,
    session: AsyncSession,
    runtime_client: ConnectorsRuntimeClient,
    claimed_run: RuntimeClaimedSyncRun,
    execution_plan: RuntimeSyncRunExecutionPlan,
    *,
    worker_id: str,
    request_id: str | None,
    run_id: str | None,
    trace_id: str | None,
) -> RuntimeSyncRunResult:
    telemetry = logger.bind(
        **TelemetryContext(
            request_id=request_id,
            run_id=run_id,
            connector_run_id=claimed_run.id,
            organization_id=claimed_run.organization_id,
            trace_id=trace_id,
        ).as_log_fields()
    )
    prepared_import = await prepare_sftp_file_import(
        tenant,
        session,
        execution_plan,
        worker_id=worker_id,
        request_id=request_id,
    )
    await session.commit()

    finalized = await finalize_sftp_file_import(
        runtime_client,
        execution_plan,
        prepared_import,
        worker_id=worker_id,
    )
    archive_guarantees_idempotency = (
        len(prepared_import.archive_operations) > 0
        and len(finalized.archive_errors) == 0
    )
    if not finalized.sync_state_persisted and not archive_guarantees_idempotency:
        raise RuntimeError(
            finalized.sync_state_error
            or "SFTP sync state could not be persisted after data import"
        )

    await runtime_client.mark_sync_run_completed(
        claimed_run.organization_id,
        claimed_run.id,
        worker_id,
        records_fetched=prepared_import.rows_received,
        records_written=prepared_import.rows_inserted,
    )
    telemetry.info(
        "Connector SFTP sync run completed",
        event="connector.runtime.sync_run.completed",
        status="success",
        connection_id=claimed_run.connection_id,
        worker_id=worker_id,
        claimed_count=prepared_import.rows_received,
        processed_count=prepared_import.rows_inserted,
        failed_count=0,
        dataset_name=prepared_import.dataset_name,
        sync_state_persisted=finalized.sync_state_persisted,
        archive_error_count=len(finalized.archive_errors),
    )
    return RuntimeSyncRunResult(
        run_id=claimed_run.id,
        organization_id=claimed_run.organization_id,
        connection_id=claimed_run.connection_id,
        status="success",
        claimed=prepared_import.rows_received,
        processed=prepared_import.rows_inserted,
        failed=0,
        dataset_name=prepared_import.dataset_name,
    )


async def pull_provider_events_for_sync_run(
    runtime_client: ConnectorsRuntimeClient,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
    execution_plan: RuntimeSyncRunExecutionPlan | None = None,
) -> Any:
    from app.integrations.provider_sync import (
        pull_provider_events_for_sync_run as provider_pull_dispatch,
    )

    return await provider_pull_dispatch(
        runtime_client,
        claimed_run,
        worker_id=worker_id,
        execution_plan=execution_plan,
    )


async def process_claimed_sync_run(
    tenant: TenantFilter,
    session: AsyncSession,
    runtime_client: ConnectorsRuntimeClient,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
    limit: int = 50,
    request_id: str | None = None,
    run_id: str | None = None,
    trace_id: str | None = None,
) -> RuntimeSyncRunResult:
    """Execute one claimed sync run and update its runtime status."""

    telemetry_context = TelemetryContext(
        request_id=request_id,
        run_id=run_id,
        connector_run_id=claimed_run.id,
        organization_id=claimed_run.organization_id,
        trace_id=trace_id,
    )
    telemetry = logger.bind(**telemetry_context.as_log_fields())
    bound_runtime_client = _bind_runtime_client_telemetry(
        runtime_client,
        telemetry_context,
    )

    try:
        execution_plan = await bound_runtime_client.get_sync_run_execution_plan(
            claimed_run.organization_id,
            claimed_run.id,
            worker_id,
        )
        if uses_sftp_file_pull(execution_plan):
            return await _process_sftp_sync_run(
                tenant,
                session,
                bound_runtime_client,
                claimed_run,
                execution_plan,
                worker_id=worker_id,
                request_id=request_id,
                run_id=run_id,
                trace_id=trace_id,
            )
        pull_result = await pull_provider_events_for_sync_run(
            bound_runtime_client,
            claimed_run,
            worker_id=worker_id,
            execution_plan=execution_plan,
        )
        total_claimed = 0
        total_processed = 0
        total_failed = 0
        dataset_name: str | None = None
        while True:
            drain_result = await drain_connector_connection(
                tenant,
                session,
                bound_runtime_client,
                organization_id=claimed_run.organization_id,
                connection_id=claimed_run.connection_id,
                worker_id=worker_id,
                limit=limit,
                request_id=request_id,
                run_id=run_id,
                connector_run_id=claimed_run.id,
                trace_id=trace_id,
            )
            total_claimed += drain_result.claimed
            total_processed += drain_result.processed
            total_failed += drain_result.failed
            if drain_result.dataset_name is not None:
                dataset_name = drain_result.dataset_name
            if drain_result.claimed == 0:
                break

        await session.commit()
        await bound_runtime_client.mark_sync_run_completed(
            claimed_run.organization_id,
            claimed_run.id,
            worker_id,
            records_fetched=max(total_claimed, pull_result.fetched_records),
            records_written=total_processed,
        )
        telemetry.info(
            "Connector sync run completed",
            event="connector.runtime.sync_run.completed",
            status="success",
            connection_id=claimed_run.connection_id,
            worker_id=worker_id,
            claimed_count=total_claimed,
            processed_count=total_processed,
            failed_count=total_failed,
            dataset_name=dataset_name,
            fetched_count=pull_result.fetched_records,
            ingested_count=pull_result.accepted_events,
            duplicate_count=pull_result.duplicate_events,
        )
        return RuntimeSyncRunResult(
            run_id=claimed_run.id,
            organization_id=claimed_run.organization_id,
            connection_id=claimed_run.connection_id,
            status="success",
            claimed=total_claimed,
            processed=total_processed,
            failed=total_failed,
            dataset_name=dataset_name,
        )
    except Exception as exc:
        await session.rollback()
        error_class, retryable = _classify_sync_run_failure(exc)
        retry_delay_seconds = (
            _compute_sync_retry_delay_seconds(claimed_run.attempts)
            if retryable
            else None
        )
        error_message = str(exc)[:400] or _sanitize_runtime_error(exc)
        await bound_runtime_client.mark_sync_run_failed(
            claimed_run.organization_id,
            claimed_run.id,
            worker_id,
            error_message,
            error_class=error_class,
            retryable=retryable,
            retry_delay_seconds=retry_delay_seconds,
        )
        telemetry.exception(
            "Connector sync run failed",
            event="connector.runtime.sync_run.failed",
            status="failed",
            connection_id=claimed_run.connection_id,
            worker_id=worker_id,
            error_code=_sanitize_runtime_error(exc),
            sync_error_class=error_class,
            retryable=retryable,
            retry_delay_seconds=retry_delay_seconds,
        )
        return RuntimeSyncRunResult(
            run_id=claimed_run.id,
            organization_id=claimed_run.organization_id,
            connection_id=claimed_run.connection_id,
            status="queued" if retryable else "failed",
            claimed=0,
            processed=0,
            failed=1,
            dataset_name=None,
            error_class=error_class,
            error_message=error_message,
            retryable=retryable,
        )


def _bind_runtime_client_telemetry(
    runtime_client: ConnectorsRuntimeClient,
    telemetry_context: TelemetryContext,
) -> ConnectorsRuntimeClient:
    bind_telemetry = getattr(runtime_client, "with_telemetry_context", None)
    if callable(bind_telemetry):
        return cast("ConnectorsRuntimeClient", bind_telemetry(telemetry_context))
    return runtime_client


def _duration_ms(started_at: float) -> int:
    return round((time.perf_counter() - started_at) * 1000)
