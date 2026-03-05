"""Webhook signing and verification helpers."""

from __future__ import annotations

import hashlib
import hmac
import re
import time

_HEX_PATTERN = re.compile(r"^[0-9a-fA-F]+$")


def compute_hmac_sha256(payload: bytes, secret: str) -> str:
    """Return lowercase hex HMAC-SHA256 signature."""
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _extract_signature_token(
    provided_signature: str,
    *,
    prefix: str = "sha256=",
) -> str:
    raw = provided_signature.strip()
    if raw == "":
        return ""

    if raw.startswith(prefix):
        return raw[len(prefix) :].strip()

    for segment in raw.split(","):
        chunk = segment.strip()
        if chunk.startswith("v1="):
            return chunk[3:].strip()
        if chunk.startswith("signature="):
            return chunk[len("signature=") :].strip()

    return raw


def verify_hmac_signature(
    payload: bytes,
    provided_signature: str | None,
    secret: str,
    *,
    prefix: str = "sha256=",
) -> bool:
    """Verify signature in constant time against HMAC-SHA256 digest."""
    if provided_signature is None:
        return False

    token = _extract_signature_token(provided_signature, prefix=prefix)
    if token == "" or not _HEX_PATTERN.fullmatch(token):
        return False

    expected = compute_hmac_sha256(payload, secret)
    return hmac.compare_digest(token.lower(), expected)


def verify_timestamped_signature(
    *,
    payload: bytes,
    provided_signature: str | None,
    timestamp_header: str | None,
    secret: str,
    tolerance_seconds: int = 300,
    now_epoch_seconds: int | None = None,
) -> bool:
    """Verify webhook signature and reject stale events."""
    if provided_signature is None or timestamp_header is None:
        return False

    if tolerance_seconds < 0:
        raise ValueError("tolerance_seconds must be >= 0")

    try:
        timestamp = int(timestamp_header)
    except ValueError:
        return False

    now = int(time.time()) if now_epoch_seconds is None else now_epoch_seconds
    if abs(now - timestamp) > tolerance_seconds:
        return False

    signed_payload = f"{timestamp}.".encode() + payload
    return verify_hmac_signature(
        signed_payload,
        provided_signature,
        secret,
        prefix="v1=",
    )
