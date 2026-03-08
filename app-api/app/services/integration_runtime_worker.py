"""Worker orchestration between connectors runtime and Python dataset pipeline."""

from __future__ import annotations

import ipaddress
import logging
import urllib.parse
from dataclasses import dataclass
from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, cast

import httpx

from app.core.config import settings
from app.services.integration_event_ingestor import (
    ConnectorPayloadLoader,
    ingest_raw_events_to_dataset,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter

logger = logging.getLogger(__name__)
_MIN_RUNTIME_TOKEN_LENGTH = 32
_RUNTIME_ERROR_INVALID_INPUT = "invalid_mapping_or_payload"
_RUNTIME_ERROR_HTTP = "connectors_runtime_http_error"
_RUNTIME_ERROR_UNREACHABLE = "connectors_runtime_unreachable"
_RUNTIME_ERROR_GENERIC = "connector_ingestion_failed"


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


class ConnectorsRuntimeClient:
    """Thin authenticated client for internal connectors runtime routes."""

    def __init__(
        self,
        base_url: str,
        token: str,
        *,
        timeout_seconds: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "authorization": f"Bearer {token}",
                "accept": "application/json",
            },
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=False,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> Any:
        response = await self._client.request(method, path, json=json_body)
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


def _parse_allowed_hosts(raw_value: str) -> tuple[str, ...]:
    return tuple(
        host.strip().lower()
        for host in raw_value.split(",")
        if host.strip()
    )


def _is_success_payload(payload: Any) -> bool:
    return isinstance(payload, dict) and payload.get("success") is True


def _is_local_runtime_host(host: str, host_ip: ipaddress._BaseAddress | None) -> bool:
    return host == "localhost" or host.endswith(".localhost") or (
        host_ip is not None and host_ip.is_loopback
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
) -> RuntimeDrainResult:
    """Claim one batch of raw events and route them into the dataset pipeline."""
    normalized_limit = _normalize_batch_limit(limit)

    connection = await runtime_client.get_connection(organization_id, connection_id)
    config = connection.get("config", {})
    if not isinstance(config, dict):
        raise TypeError("connection config must be an object")
    fields_json = config.get("datasetMapping")
    if not isinstance(fields_json, dict):
        raise TypeError("connection.config.datasetMapping must be configured")

    claimed = await runtime_client.claim_raw_events(
        organization_id,
        connection_id,
        worker_id,
        limit=normalized_limit,
    )
    if not claimed:
        return RuntimeDrainResult(claimed=0, processed=0, failed=0, dataset_name=None)

    payload_loader = RuntimePayloadLoader(
        runtime_client,
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
        ingestion = await ingest_raw_events_to_dataset(
            tenant,
            session,
            raw_events,
            fields_json,
            payload_loader,
        )
        for event in claimed:
            await runtime_client.mark_raw_event_processed(
                organization_id,
                connection_id,
                event.id,
                worker_id,
            )
        return RuntimeDrainResult(
            claimed=len(claimed),
            processed=len(claimed),
            failed=0,
            dataset_name=ingestion.dataset_name if ingestion is not None else None,
        )
    except Exception as exc:
        sanitized_error = _sanitize_runtime_error(exc)
        logger.exception(
            "Connector ingestion failed: org=%s connection=%s worker=%s claimed=%d",
            organization_id,
            connection_id,
            worker_id,
            len(claimed),
        )
        for event in claimed:
            await runtime_client.mark_raw_event_failed(
                organization_id,
                connection_id,
                event.id,
                worker_id,
                sanitized_error,
            )
        raise
