"""Minimal SAP TM REST client."""

from __future__ import annotations

import urllib.parse
from collections.abc import Mapping, Sequence
from typing import Any

import httpx

from app.integrations.connectors._shared import (
    get_path,
    require_object,
    require_record_sequence,
)

_DEFAULT_ITEMS_PATHS = (
    "d.results",
    "data",
    "items",
    "records",
    "freightOrders",
    "freightUnits",
    "resources",
    "stops",
)
_DEFAULT_NEXT_CURSOR_PATHS = (
    "d.__next",
    "next",
    "nextCursor",
    "nextPageToken",
    "skiptoken",
    "pagination.nextCursor",
    "pagination.nextPageToken",
)
CONNECTOR_RESPONSE_RECORDS_FIELD = "connector response records"


class SapTmApiClient:
    """Thin async client for SAP TM OData or REST endpoints with pagination."""

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
        next_path: str | None = path

        while next_path is not None:
            request_params = dict(params) if next_path == path else {}
            if next_cursor is not None and cursor_param is not None:
                request_params[cursor_param] = next_cursor

            response = await self.client.get(next_path, params=request_params)
            response.raise_for_status()
            payload = response.json()
            page_records, next_cursor, next_path = _extract_page(
                payload,
                items_path=items_path,
                next_cursor_path=next_cursor_path,
                current_path=path,
            )
            next_cursor, next_path = _normalize_follow_up(
                next_cursor,
                next_path,
                cursor_param=cursor_param,
                current_path=path,
            )
            records.extend(page_records)
            if next_path is None and next_cursor is None:
                break

        return records


def _extract_page(
    payload: Any,
    *,
    items_path: str | None,
    next_cursor_path: str | None,
    current_path: str,
) -> tuple[list[dict[str, Any]], str | None, str | None]:
    raw_items = _resolve_items(payload, items_path)
    records = _normalize_records(raw_items)
    next_cursor = _resolve_next_cursor(payload, next_cursor_path)
    next_path = _resolve_next_path(payload, next_cursor_path, current_path=current_path)
    return records, next_cursor, next_path


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

    raise TypeError("SAP TM response does not contain a list of records")


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
            value = resolved.strip()
            if value.startswith(("http://", "https://", "/")):
                continue
            return value
    return None


def _resolve_next_path(
    payload: Any,
    next_cursor_path: str | None,
    *,
    current_path: str,
) -> str | None:
    candidate_paths = (
        (next_cursor_path,)
        if next_cursor_path is not None
        else _DEFAULT_NEXT_CURSOR_PATHS
    )
    for candidate in candidate_paths:
        resolved = get_path(payload, candidate)
        if not isinstance(resolved, str) or not resolved.strip():
            continue
        value = resolved.strip()
        if value.startswith(("http://", "https://")):
            return value
        if value.startswith("/"):
            return value
    return None



def _normalize_follow_up(
    next_cursor: str | None,
    next_path: str | None,
    *,
    cursor_param: str | None,
    current_path: str,
) -> tuple[str | None, str | None]:
    if next_path is None or cursor_param is None or next_cursor is not None:
        return next_cursor, next_path

    parsed = urllib.parse.urlparse(next_path)
    values = urllib.parse.parse_qs(parsed.query)
    tokens = values.get(cursor_param)
    if not tokens:
        return next_cursor, next_path

    token = str(tokens[0]).strip()
    if not token:
        return next_cursor, next_path

    return token, current_path
