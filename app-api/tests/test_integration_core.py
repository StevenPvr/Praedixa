from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest

from app.integrations.core import (
    ConnectorAuthContext,
    InMemoryIdempotencyStore,
    RetryPolicy,
    build_idempotency_key,
    compute_backoff_seconds,
    compute_hmac_sha256,
    decode_cursor,
    encode_cursor,
    parse_page_window,
    payload_sha256,
    redact_sensitive_payload,
    run_with_retry,
    should_retry,
    verify_hmac_signature,
    verify_timestamped_signature,
)


def test_redact_sensitive_payload_recursively() -> None:
    payload = {
        "tenant": "org-1",
        "api_key": "sk_live_1234",
        "nested": {
            "Authorization": "Bearer abc",
            "safe_value": "ok",
        },
        "items": [{"refresh_token": "rtok"}, {"value": "visible"}],
    }

    redacted = redact_sensitive_payload(payload)

    assert redacted["tenant"] == "org-1"
    assert redacted["api_key"] == "***REDACTED***"
    nested = redacted["nested"]
    assert isinstance(nested, dict)
    assert nested["Authorization"] == "***REDACTED***"
    assert nested["safe_value"] == "ok"
    assert isinstance(redacted["items"], list)
    assert redacted["items"][0]["refresh_token"] == "***REDACTED***"


def test_connector_auth_context_masks_secrets_for_logs() -> None:
    context = ConnectorAuthContext(
        organization_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        secret_ref="scw://secret/abc",
        access_token="tok-abcdef",
        refresh_token="rt-abcdef",
        api_key="sk_live_abcdef",
        metadata={"password": "pw", "region": "fr-par"},
    )

    safe_payload = context.to_safe_log_dict()

    assert safe_payload["access_token"] != "tok-abcdef"
    assert safe_payload["refresh_token"] != "rt-abcdef"
    assert safe_payload["api_key"] != "sk_live_abcdef"
    assert safe_payload["metadata"] == {
        "password": "***REDACTED***",
        "region": "fr-par",
    }


def test_compute_backoff_seconds_honors_retry_after() -> None:
    policy = RetryPolicy(base_delay_seconds=1.0, max_delay_seconds=10.0, jitter_ratio=0)

    assert compute_backoff_seconds(1, policy) == 1.0
    assert compute_backoff_seconds(3, policy) == 4.0
    assert compute_backoff_seconds(1, policy, retry_after_seconds=8.0) == 8.0
    assert compute_backoff_seconds(1, policy, retry_after_seconds=25.0) == 10.0


def test_should_retry_obeys_policy_limits_and_statuses() -> None:
    policy = RetryPolicy(max_attempts=3)

    assert should_retry(attempt=1, policy=policy, status_code=429)
    assert should_retry(attempt=2, policy=policy, error=TimeoutError())
    assert not should_retry(attempt=3, policy=policy, status_code=500)
    assert not should_retry(attempt=1, policy=policy, status_code=400)


@pytest.mark.asyncio
async def test_run_with_retry_retries_transient_errors() -> None:
    attempts: list[int] = []

    class TransientError(Exception):
        status_code = 503

    async def operation() -> str:
        attempts.append(len(attempts) + 1)
        if len(attempts) < 3:
            raise TransientError("temporary outage")
        return "ok"

    result = await run_with_retry(
        operation,
        policy=RetryPolicy(
            max_attempts=4,
            base_delay_seconds=0.001,
            max_delay_seconds=0.01,
            jitter_ratio=0,
        ),
    )

    assert result == "ok"
    assert attempts == [1, 2, 3]


def test_cursor_round_trip_and_window_parsing() -> None:
    cursor = encode_cursor({"updated_at": "2026-03-04T00:00:00Z", "id": "evt-1"})
    decoded = decode_cursor(cursor)
    assert decoded == {"updated_at": "2026-03-04T00:00:00Z", "id": "evt-1"}

    window = parse_page_window({"limit": "5000", "cursor": cursor}, max_limit=500)
    assert window.limit == 500
    assert window.cursor == decoded

    with pytest.raises(ValueError):
        decode_cursor("not-base64-@@")


def test_payload_digest_and_idempotency_key_are_deterministic() -> None:
    payload = {"a": 1, "b": 2}
    digest = payload_sha256(payload)
    digest_again = payload_sha256({"b": 2, "a": 1})
    assert digest == digest_again

    key_one = build_idempotency_key(
        vendor="salesforce",
        source_object="Account",
        source_record_id="001xx000003DGbY",
        source_updated_at=datetime(2026, 3, 4, 8, 0, tzinfo=UTC),
        payload_digest=digest,
    )
    key_two = build_idempotency_key(
        vendor="salesforce",
        source_object="Account",
        source_record_id="001xx000003DGbY",
        source_updated_at=datetime(2026, 3, 4, 8, 0, tzinfo=UTC),
        payload_digest=digest,
    )
    assert key_one == key_two


def test_in_memory_idempotency_store_registers_once() -> None:
    store = InMemoryIdempotencyStore()
    key = "idem-1"
    assert store.register(key)
    assert not store.register(key)
    assert store.contains(key)


def test_webhook_hmac_verification() -> None:
    payload = b'{"event":"test"}'
    secret = "whsec_test"
    signature = compute_hmac_sha256(payload, secret)
    assert verify_hmac_signature(payload, f"sha256={signature}", secret)
    assert not verify_hmac_signature(payload, "sha256=deadbeef", secret)


def test_timestamped_webhook_verification() -> None:
    payload = b'{"event":"sync.completed"}'
    secret = "whsec_test"
    timestamp = 1_700_000_000
    signed_payload = f"{timestamp}.".encode() + payload
    signature = compute_hmac_sha256(signed_payload, secret)
    assert verify_timestamped_signature(
        payload=payload,
        provided_signature=f"v1={signature}",
        timestamp_header=str(timestamp),
        secret=secret,
        tolerance_seconds=120,
        now_epoch_seconds=timestamp + 60,
    )
    assert not verify_timestamped_signature(
        payload=payload,
        provided_signature=f"v1={signature}",
        timestamp_header=str(timestamp),
        secret=secret,
        tolerance_seconds=120,
        now_epoch_seconds=timestamp + 500,
    )
