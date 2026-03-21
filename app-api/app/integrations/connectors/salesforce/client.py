"""Minimal Salesforce REST client used by the provider sync worker."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import httpx


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
        if not isinstance(payload, dict):
            raise TypeError("Salesforce query response must be an object")

        records = _extract_records(payload)
        next_records_url = payload.get("nextRecordsUrl")
        while isinstance(next_records_url, str) and next_records_url.strip():
            next_response = await self.client.get(next_records_url)
            next_response.raise_for_status()
            next_payload = next_response.json()
            if not isinstance(next_payload, dict):
                raise TypeError(
                    "Salesforce paginated query response must be an object"
                )
            records.extend(_extract_records(next_payload))
            next_records_url = next_payload.get("nextRecordsUrl")

        return records


def _extract_records(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_records = payload.get("records")
    if not isinstance(raw_records, Sequence) or isinstance(raw_records, (str, bytes)):
        raise TypeError("Salesforce query response records must be a list")
    records: list[dict[str, Any]] = []
    for raw_record in raw_records:
        if not isinstance(raw_record, dict):
            raise TypeError("Salesforce query record must be an object")
        normalized = dict(raw_record)
        normalized.pop("attributes", None)
        records.append(normalized)
    return records
