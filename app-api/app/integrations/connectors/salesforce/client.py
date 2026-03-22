"""Minimal Salesforce REST client used by the provider sync worker."""

from __future__ import annotations

from typing import Any

import httpx

from app.integrations.connectors._shared import require_object, require_record_sequence


class SalesforceApiClient:
    """Thin async client for Salesforce REST query resources."""

    def __init__(
        self,
        *,
        base_url: str,
        header_name: str,
        header_value: str,
        timeout_seconds: float = 20.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={
                header_name: header_value,
                "accept": "application/json",
            },
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=False,
            transport=transport,
        )

    async def aclose(self) -> None:
        await self.client.aclose()

    async def query_records(
        self,
        *,
        api_version: str,
        soql: str,
    ) -> list[dict[str, Any]]:
        response = await self.client.get(
            f"/services/data/{api_version}/query",
            params={"q": soql},
        )
        response.raise_for_status()
        payload = response.json()
        payload_object = require_object(payload, field="Salesforce query response")

        records = _extract_records(payload_object)
        next_records_url = payload_object.get("nextRecordsUrl")
        while isinstance(next_records_url, str) and next_records_url.strip():
            next_response = await self.client.get(next_records_url)
            next_response.raise_for_status()
            next_payload = next_response.json()
            next_payload_object = require_object(
                next_payload,
                field="Salesforce paginated query response",
            )
            records.extend(_extract_records(next_payload_object))
            next_records_url = next_payload_object.get("nextRecordsUrl")

        return records


def _normalize_salesforce_record(raw_record: object) -> dict[str, Any]:
    normalized = dict(require_object(raw_record, field="Salesforce query record"))
    normalized.pop("attributes", None)
    return normalized


def _extract_records(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_records = require_record_sequence(
        payload.get("records"),
        field="Salesforce query response records",
    )
    return [_normalize_salesforce_record(raw_record) for raw_record in raw_records]
