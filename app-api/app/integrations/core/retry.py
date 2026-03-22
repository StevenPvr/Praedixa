"""Retry helpers with bounded exponential backoff for connector calls."""

from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TypeVar

T = TypeVar("T")
_DEFAULT_RNG = random.Random()  # noqa: S311 - retry jitter is not security-sensitive


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    """Retry policy tuned for external API integrations."""

    max_attempts: int = 5
    base_delay_seconds: float = 0.5
    max_delay_seconds: float = 30.0
    jitter_ratio: float = 0.2
    retryable_statuses: frozenset[int] = field(
        default_factory=lambda: frozenset({408, 409, 425, 429, 500, 502, 503, 504})
    )
    retryable_exceptions: tuple[type[Exception], ...] = (TimeoutError, ConnectionError)

    def __post_init__(self) -> None:
        if self.max_attempts < 1:
            raise ValueError("max_attempts must be >= 1")
        if self.base_delay_seconds <= 0:
            raise ValueError("base_delay_seconds must be > 0")
        if self.max_delay_seconds <= 0:
            raise ValueError("max_delay_seconds must be > 0")
        if self.max_delay_seconds < self.base_delay_seconds:
            raise ValueError("max_delay_seconds must be >= base_delay_seconds")
        if not 0 <= self.jitter_ratio <= 1:
            raise ValueError("jitter_ratio must be in [0, 1]")


def extract_status_code(error: Exception) -> int | None:
    """Best-effort status extraction from common HTTP client exceptions."""
    raw_status = getattr(error, "status_code", None)
    if isinstance(raw_status, int):
        return raw_status

    raw_alt_status = getattr(error, "status", None)
    if isinstance(raw_alt_status, int):
        return raw_alt_status

    return None


def compute_backoff_seconds(
    attempt: int,
    policy: RetryPolicy,
    *,
    retry_after_seconds: float | None = None,
    rng: random.Random | None = None,
) -> float:
    """Compute bounded exponential backoff with optional jitter and Retry-After."""
    if attempt < 1:
        raise ValueError("attempt must be >= 1")

    deterministic_backoff: float = float(
        min(
            policy.max_delay_seconds,
            policy.base_delay_seconds * (2 ** (attempt - 1)),
        )
    )
    chosen_delay: float = deterministic_backoff
    if retry_after_seconds is not None and retry_after_seconds > 0:
        chosen_delay = float(
            min(policy.max_delay_seconds, max(chosen_delay, retry_after_seconds))
        )

    if policy.jitter_ratio == 0:
        return float(chosen_delay)

    random_source = rng if rng is not None else _DEFAULT_RNG
    spread: float = chosen_delay * policy.jitter_ratio
    jittered: float = chosen_delay + float(random_source.uniform(-spread, spread))
    if jittered < 0.0:
        return 0.0
    if jittered > policy.max_delay_seconds:
        return float(policy.max_delay_seconds)
    return float(jittered)


def should_retry(
    *,
    attempt: int,
    policy: RetryPolicy,
    status_code: int | None = None,
    error: Exception | None = None,
) -> bool:
    """Return True when another attempt should be performed."""
    if attempt >= policy.max_attempts:
        return False

    if status_code is not None and status_code in policy.retryable_statuses:
        return True

    if error is not None:
        status_from_error = extract_status_code(error)
        if (
            status_from_error is not None
            and status_from_error in policy.retryable_statuses
        ):
            return True
        return isinstance(error, policy.retryable_exceptions)

    return False


async def run_with_retry(
    operation: Callable[[], Awaitable[T]],
    *,
    policy: RetryPolicy | None = None,
    get_retry_after_seconds: Callable[[Exception], float | None] | None = None,
    on_retry: Callable[[int, float, Exception], Awaitable[None] | None] | None = None,
) -> T:
    """Execute an async operation with retry-on-failure semantics."""
    effective_policy = policy if policy is not None else RetryPolicy()
    attempt = 1

    while True:
        try:
            return await operation()
        except Exception as error:
            if not should_retry(attempt=attempt, policy=effective_policy, error=error):
                raise

            delay = _resolve_retry_delay(
                attempt=attempt,
                policy=effective_policy,
                error=error,
                get_retry_after_seconds=get_retry_after_seconds,
            )
            await _maybe_run_on_retry(
                on_retry=on_retry,
                attempt=attempt,
                delay=delay,
                error=error,
            )
            await asyncio.sleep(delay)
            attempt += 1


def _resolve_retry_delay(
    *,
    attempt: int,
    policy: RetryPolicy,
    error: Exception,
    get_retry_after_seconds: Callable[[Exception], float | None] | None,
) -> float:
    retry_after = (
        get_retry_after_seconds(error)
        if get_retry_after_seconds is not None
        else None
    )
    return compute_backoff_seconds(
        attempt,
        policy,
        retry_after_seconds=retry_after,
    )


async def _maybe_run_on_retry(
    *,
    on_retry: Callable[[int, float, Exception], Awaitable[None] | None] | None,
    attempt: int,
    delay: float,
    error: Exception,
) -> None:
    if on_retry is None:
        return

    maybe_awaitable = on_retry(attempt, delay, error)
    if maybe_awaitable is not None:
        await maybe_awaitable
