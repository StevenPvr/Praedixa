"""Minimal UKG REST client used by the provider sync worker."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import httpx

from app.integrations.connectors._shared import (
    get_path,
    require_object,
    require_record_sequence,
)

_DEFAULT_ITEMS_PATHS = (
    "data",
    "items",
    "results",
    "records",
    "employees",
    "schedules",
    "timesheets",
    "absences",
)
_DEFAULT_NEXT_CURSOR_PATHS = (
    "nextCursor",
    "nextPageToken",
    "next_page_token",
    "pagination.nextCursor",
    "pagination.nextPageToken",
    "paging.nextCursor",
    "meta.nextCursor",
)
CONNECTOR_RESPONSE_RECORDS_FIELD = "connector response records"


class UkgApiClient:
    """Thin async client for UKG REST endpoints with cursor pagination."""

    def __init__(
        self,
        *,
        base_url: str,
        header_name: str,
        header_value: str,
        additional_headers: Mapping[str, str] | None = None,
        timeout_seconds: float = 20.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        headers = {
            header_name: header_value,
            "accept": "application/json",
        }
        if additional_headers is not None:
            headers.update(additional_headers)
        self.client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers=headers,
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=False,
            transport=transport,
        )

    async def aclose(self) -> None:
        await self.client.aclose()

    async def get_records(
        self,
        path: str,
        *,
        params: Mapping[str, str],
        items_path: str | None,
        next_cursor_path: str | None,
        cursor_param: str | None,
    ) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        next_cursor: str | None = None

        while True:
            request_params = dict(params)
            if next_cursor is not None and cursor_param is not None:
                request_params[cursor_param] = next_cursor

            response = await self.client.get(path, params=request_params)
            response.raise_for_status()
            payload = response.json()
            page_records, next_cursor = _extract_page(
                payload,
                items_path=items_path,
                next_cursor_path=next_cursor_path,
            )
            records.extend(page_records)
            if next_cursor is None:
                break

        return records


def _extract_page(
    payload: Any,
    *,
    items_path: str | None,
    next_cursor_path: str | None,
) -> tuple[list[dict[str, Any]], str | None]:
    raw_items = _resolve_items(payload, items_path)
    records = _normalize_records(raw_items)
    next_cursor = _resolve_next_cursor(payload, next_cursor_path)
    return records, next_cursor


def _resolve_items(payload: Any, items_path: str | None) -> Any:
    if items_path is not None:
        return require_record_sequence(
            get_path(payload, items_path),
            field=CONNECTOR_RESPONSE_RECORDS_FIELD,
        )

    if isinstance(payload, Sequence) and not isinstance(payload, (str, bytes)):
        return require_record_sequence(
            payload,
            field=CONNECTOR_RESPONSE_RECORDS_FIELD,
        )

    for candidate in _DEFAULT_ITEMS_PATHS:
        resolved = get_path(payload, candidate)
        if isinstance(resolved, Sequence) and not isinstance(resolved, (str, bytes)):
            return require_record_sequence(
                resolved,
                field=CONNECTOR_RESPONSE_RECORDS_FIELD,
            )

    raise TypeError("UKG response does not contain a list of records")


def _normalize_records(raw_items: Any) -> list[dict[str, Any]]:
    items = require_record_sequence(
        raw_items,
        field=CONNECTOR_RESPONSE_RECORDS_FIELD,
    )

    return [
        dict(require_object(raw_item, field="connector record"))
        for raw_item in items
    ]


def _resolve_next_cursor(payload: Any, next_cursor_path: str | None) -> str | None:
    candidate_paths = (
        (next_cursor_path,)
        if next_cursor_path is not None
        else _DEFAULT_NEXT_CURSOR_PATHS
    )
    for candidate in candidate_paths:
        resolved = get_path(payload, candidate)
        if isinstance(resolved, str) and resolved.strip():
            return resolved.strip()
    return None
