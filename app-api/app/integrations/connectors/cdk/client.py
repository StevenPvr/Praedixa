"""Minimal CDK REST client used by the provider sync worker."""

from __future__ import annotations

import base64
from collections.abc import Mapping, Sequence
from typing import Any

import httpx

_DEFAULT_ITEMS_PATHS = (
    "data",
    "items",
    "records",
    "serviceOrders",
    "roLines",
    "vehicles",
    "technicians",
)
_DEFAULT_NEXT_CURSOR_PATHS = (
    "nextCursor",
    "nextPageToken",
    "nextOffset",
    "pagination.nextCursor",
    "pagination.nextPageToken",
    "pagination.nextOffset",
    "meta.nextCursor",
    "meta.nextOffset",
)


class CdkApiClient:
    """Thin async client for CDK REST endpoints with cursor pagination."""

    def __init__(
        self,
        *,
        base_url: str,
        client_id: str,
        client_secret: str,
        additional_headers: Mapping[str, str] | None = None,
        timeout_seconds: float = 20.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        basic_token = base64.b64encode(
            f"{client_id}:{client_secret}".encode()
        ).decode("ascii")
        headers = {
            "authorization": f"Basic {basic_token}",
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
        return _get_path(payload, items_path)

    if isinstance(payload, Sequence) and not isinstance(payload, (str, bytes)):
        return payload

    for candidate in _DEFAULT_ITEMS_PATHS:
        resolved = _get_path(payload, candidate)
        if isinstance(resolved, Sequence) and not isinstance(resolved, (str, bytes)):
            return resolved

    raise TypeError("CDK response does not contain a list of records")


def _normalize_records(raw_items: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_items, Sequence) or isinstance(raw_items, (str, bytes)):
        raise TypeError("CDK response records must be a list")

    records: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise TypeError("CDK record must be an object")
        records.append(dict(raw_item))
    return records


def _resolve_next_cursor(payload: Any, next_cursor_path: str | None) -> str | None:
    candidate_paths = (
        (next_cursor_path,)
        if next_cursor_path is not None
        else _DEFAULT_NEXT_CURSOR_PATHS
    )
    for candidate in candidate_paths:
        resolved = _get_path(payload, candidate)
        if isinstance(resolved, str) and resolved.strip():
            return resolved.strip()
        if isinstance(resolved, int):
            return str(resolved)
    return None


def _get_path(value: Any, path: str) -> Any:
    current = value
    for segment in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(segment)
    return current
