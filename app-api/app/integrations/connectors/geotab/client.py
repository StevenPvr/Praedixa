"""Minimal Geotab MyGeotab JSON-RPC client."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import httpx


class GeotabApiClient:
    """Thin async client for the MyGeotab JSON-RPC API."""

    def __init__(
        self,
        *,
        base_url: str,
        timeout_seconds: float = 20.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={
                "accept": "application/json",
                "content-type": "application/json",
            },
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=False,
            transport=transport,
        )

    async def aclose(self) -> None:
        await self.client.aclose()

    async def authenticate(
        self,
        *,
        database: str,
        username: str,
        password: str,
    ) -> dict[str, str]:
        result = await self._call(
            "Authenticate",
            {
                "database": database,
                "userName": username,
                "password": password,
            },
        )
        credentials = result.get("credentials")
        if not isinstance(credentials, dict):
            raise TypeError("Geotab Authenticate must return credentials")

        normalized = _normalize_credentials(credentials)
        session_id = normalized.get("sessionId")
        if session_id is None:
            raise ValueError("Geotab Authenticate did not return a sessionId")
        return normalized

    async def get_records(
        self,
        *,
        type_name: str,
        credentials: Mapping[str, str],
        search: Mapping[str, Any] | None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "typeName": type_name,
            "credentials": dict(credentials),
        }
        if search is not None:
            params["search"] = dict(search)

        result = await self._call("Get", params)
        return _normalize_records(result)

    async def get_feed_records(
        self,
        *,
        type_name: str,
        credentials: Mapping[str, str],
        from_version: str | None,
        search: Mapping[str, Any] | None,
        results_limit: int,
    ) -> tuple[list[dict[str, Any]], str | None]:
        records: list[dict[str, Any]] = []
        cursor = from_version
        latest_version: str | None = None

        while True:
            params: dict[str, Any] = {
                "typeName": type_name,
                "credentials": dict(credentials),
                "resultsLimit": results_limit,
            }
            if cursor is not None:
                params["fromVersion"] = cursor
            elif search is not None:
                params["search"] = dict(search)

            result = await self._call("GetFeed", params)
            page_records, next_version = _extract_feed_page(result)
            latest_version = next_version or latest_version
            records.extend(page_records)
            if (
                next_version is None
                or next_version == cursor
                or len(page_records) < results_limit
            ):
                break
            cursor = next_version

        return records, latest_version

    async def get_feed_tail_version(
        self,
        *,
        type_name: str,
        credentials: Mapping[str, str],
    ) -> str | None:
        result = await self._call(
            "GetFeed",
            {
                "typeName": type_name,
                "credentials": dict(credentials),
                "resultsLimit": 1,
            },
        )
        _, next_version = _extract_feed_page(result)
        return next_version

    async def _call(self, method: str, params: Mapping[str, Any]) -> dict[str, Any]:
        response = await self.client.post(
            "",
            json={
                "method": method,
                "params": dict(params),
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise TypeError("Geotab RPC response must be an object")
        error = payload.get("error")
        if isinstance(error, dict):
            message = str(error.get("message") or f"Geotab RPC {method} failed")
            raise TypeError(message)
        result = payload.get("result")
        if not isinstance(result, dict):
            raise TypeError(f"Geotab RPC {method} result must be an object")
        return result


def _normalize_credentials(value: Mapping[str, Any]) -> dict[str, str]:
    database = _required_string(value.get("database"), "database")
    user_name = _required_string(value.get("userName"), "userName")
    session_id = _required_string(value.get("sessionId"), "sessionId")
    return {
        "database": database,
        "userName": user_name,
        "sessionId": session_id,
    }


def _extract_feed_page(
    payload: dict[str, Any],
) -> tuple[list[dict[str, Any]], str | None]:
    raw_items = payload.get("data", [])
    records = _normalize_records(raw_items)
    to_version = payload.get("toVersion")
    if to_version is None:
        return records, None
    return records, _required_string(to_version, "toVersion")


def _normalize_records(raw_items: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_items, Sequence) or isinstance(raw_items, (str, bytes)):
        raise TypeError("Geotab RPC records must be a list")

    records: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise TypeError("Geotab record must be an object")
        records.append(dict(raw_item))
    return records


def _required_string(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"Geotab {field} must be a string")
    text = value.strip()
    if not text:
        raise ValueError(f"Geotab {field} must not be empty")
    return text
