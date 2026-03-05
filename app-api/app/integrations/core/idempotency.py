"""Idempotency helpers for connector ingestion and webhook processing."""

from __future__ import annotations

import hashlib
import json
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

    def __init__(self) -> None:
        self._seen: set[str] = set()
        self._lock = Lock()

    def register(self, key: str) -> bool:
        """Register a key; True when key is new, False when already present."""
        with self._lock:
            if key in self._seen:
                return False
            self._seen.add(key)
            return True

    def contains(self, key: str) -> bool:
        with self._lock:
            return key in self._seen
