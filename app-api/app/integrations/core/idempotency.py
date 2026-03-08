"""Idempotency helpers for connector ingestion and webhook processing."""

from __future__ import annotations

import hashlib
import json
import time
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from threading import Lock
from typing import Any


def payload_sha256(payload: bytes | str | Mapping[str, Any] | Sequence[Any]) -> str:
    """Compute SHA-256 of structured or raw payload data."""
    if isinstance(payload, bytes):
        raw = payload
    elif isinstance(payload, str):
        raw = payload.encode("utf-8")
    else:
        raw = json.dumps(
            payload,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")

    return hashlib.sha256(raw).hexdigest()


def build_idempotency_key(
    *,
    vendor: str,
    source_object: str,
    source_record_id: str,
    source_updated_at: datetime | None,
    payload_digest: str | None = None,
) -> str:
    """Build deterministic idempotency key for a source record snapshot."""
    normalized_updated_at = ""
    if source_updated_at is not None:
        normalized_updated_at = source_updated_at.astimezone(UTC).isoformat()
    material = "|".join(
        (
            vendor.strip().lower(),
            source_object.strip().lower(),
            source_record_id.strip(),
            normalized_updated_at,
            payload_digest or "",
        )
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


class InMemoryIdempotencyStore:
    """Thread-safe in-memory idempotency guard for local/dev execution."""

    def __init__(
        self,
        *,
        ttl_seconds: float = 24 * 60 * 60,
        max_entries: int = 10_000,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be > 0")
        if max_entries <= 0:
            raise ValueError("max_entries must be > 0")
        self._ttl_seconds = ttl_seconds
        self._max_entries = max_entries
        self._seen: dict[str, float] = {}
        self._lock = Lock()

    def register(self, key: str) -> bool:
        """Register a key; True when key is new, False when already present."""
        with self._lock:
            now = time.monotonic()
            self._prune(now)
            if key in self._seen:
                return False
            if len(self._seen) >= self._max_entries:
                oldest_key = min(self._seen, key=self._seen.get)
                self._seen.pop(oldest_key, None)
            self._seen[key] = now + self._ttl_seconds
            return True

    def contains(self, key: str) -> bool:
        with self._lock:
            now = time.monotonic()
            self._prune(now)
            return key in self._seen

    def _prune(self, now: float) -> None:
        expired = [key for key, deadline in self._seen.items() if deadline <= now]
        for key in expired:
            self._seen.pop(key, None)
