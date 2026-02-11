"""Production orchestrator for the medallion pipeline.

Provides:
- Continuous scheduling loop (poll-based event-driven runner)
- Retry policy with exponential backoff
- Alerting via outbound webhook
- Single-instance lock to avoid concurrent runners
- Heartbeat/status file for operations visibility
"""

from __future__ import annotations

import argparse
import contextlib
import fcntl
import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable

from scripts.medallion_pipeline import run_once

HTTP_STATUS_OK_MIN = 200
HTTP_STATUS_REDIRECT_MIN = 300


def now_utc() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class OrchestratorConfig:
    data_root: Path
    output_root: Path
    metadata_root: Path
    lock_file: Path
    heartbeat_file: Path
    poll_seconds: int = 30
    max_retries: int = 3
    retry_base_seconds: int = 5
    retry_max_seconds: int = 120
    allow_reprocess: bool = False
    force_rebuild_on_start: bool = False
    alert_webhook_url: str | None = None
    alert_timeout_seconds: int = 10


def _default_config() -> OrchestratorConfig:
    root = Path(__file__).resolve().parents[2]
    return OrchestratorConfig(
        data_root=root / "data",
        output_root=root / "data-ready",
        metadata_root=Path(__file__).resolve().parents[1] / "config" / "medallion",
        lock_file=root / "data-ready" / "reports" / "praedixa-medallion.lock",
        heartbeat_file=root / "data-ready" / "reports" / "orchestrator_heartbeat.json",
    )


def load_orchestrator_config(path: Path) -> OrchestratorConfig:
    base = _default_config()
    if not path.exists():
        return base

    config_dir = path.parent.resolve()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return base

    updates: dict[str, Any] = {}
    for key in (
        "data_root",
        "output_root",
        "metadata_root",
        "lock_file",
        "heartbeat_file",
    ):
        if key in payload and isinstance(payload[key], str):
            raw_path = Path(payload[key]).expanduser()
            if raw_path.is_absolute():
                updates[key] = raw_path
            else:
                updates[key] = config_dir / raw_path

    for key in (
        "poll_seconds",
        "max_retries",
        "retry_base_seconds",
        "retry_max_seconds",
        "alert_timeout_seconds",
    ):
        if key in payload:
            with contextlib.suppress(TypeError, ValueError):
                updates[key] = int(payload[key])

    for key in ("allow_reprocess", "force_rebuild_on_start"):
        if key in payload and isinstance(payload[key], bool):
            updates[key] = payload[key]

    if "alert_webhook_url" in payload:
        raw = payload["alert_webhook_url"]
        updates["alert_webhook_url"] = raw if isinstance(raw, str) and raw else None

    cfg = replace(base, **updates)
    return _normalize_config(cfg)


def _normalize_config(config: OrchestratorConfig) -> OrchestratorConfig:
    return replace(
        config,
        poll_seconds=max(5, config.poll_seconds),
        max_retries=max(0, config.max_retries),
        retry_base_seconds=max(1, config.retry_base_seconds),
        retry_max_seconds=max(1, config.retry_max_seconds),
        alert_timeout_seconds=max(1, config.alert_timeout_seconds),
    )


def compute_retry_delay(
    attempt_index: int,
    base_seconds: int,
    max_seconds: int,
) -> int:
    # attempt_index is 0-based for failed attempt number.
    delay = base_seconds * (2**attempt_index)
    return min(delay, max_seconds)


def write_heartbeat(
    path: Path,
    *,
    status: str,
    message: str,
    attempts: int,
    changed: bool | None = None,
) -> None:
    payload = {
        "status": status,
        "message": message,
        "attempts": attempts,
        "changed": changed,
        "updated_at": now_utc(),
        "host": os.uname().nodename,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(f"{path.suffix}.tmp")
    temp.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    temp.replace(path)


def send_webhook_alert(
    webhook_url: str,
    payload: dict[str, Any],
    *,
    timeout_seconds: int,
) -> bool:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(  # noqa: S310
        webhook_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:  # noqa: S310  # nosec B310
            return HTTP_STATUS_OK_MIN <= response.status < HTTP_STATUS_REDIRECT_MIN
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def maybe_alert_failure(
    config: OrchestratorConfig,
    *,
    error_message: str,
    attempts: int,
    mode: str,
) -> None:
    if not config.alert_webhook_url:
        return

    payload = {
        "event": "medallion_pipeline_failure",
        "mode": mode,
        "attempts": attempts,
        "error_message": error_message,
        "timestamp": now_utc(),
    }
    send_webhook_alert(
        config.alert_webhook_url,
        payload,
        timeout_seconds=config.alert_timeout_seconds,
    )


def run_pipeline_with_retries(
    config: OrchestratorConfig,
    *,
    force_rebuild: bool,
    runner: Callable[..., bool] = run_once,
    sleeper: Callable[[float], None] = time.sleep,
) -> tuple[bool, int]:
    last_error: Exception | None = None

    for attempt in range(config.max_retries + 1):
        try:
            changed = runner(
                data_root=config.data_root,
                output_root=config.output_root,
                metadata_root=config.metadata_root,
                allow_reprocess=config.allow_reprocess,
                force_rebuild=force_rebuild,
            )
            return changed, attempt + 1
        except Exception as exc:
            last_error = exc
            if attempt >= config.max_retries:
                break
            delay = compute_retry_delay(
                attempt,
                config.retry_base_seconds,
                config.retry_max_seconds,
            )
            sleeper(delay)

    if last_error is not None:
        raise last_error
    raise RuntimeError("Pipeline failed without explicit exception")


@contextlib.contextmanager
def process_lock(lock_file: Path):
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    handle = lock_file.open("a+", encoding="utf-8")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as exc:
        handle.close()
        msg = f"Another orchestrator process is already running ({lock_file})"
        raise RuntimeError(msg) from exc

    try:
        handle.seek(0)
        handle.truncate(0)
        handle.write(f"pid={os.getpid()} started_at={now_utc()}\n")
        handle.flush()
        yield
    finally:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        finally:
            handle.close()


def run_watch_loop(config: OrchestratorConfig, *, initial_force_rebuild: bool) -> None:
    force_rebuild = initial_force_rebuild or config.force_rebuild_on_start
    while True:
        try:
            changed, attempts = run_pipeline_with_retries(
                config,
                force_rebuild=force_rebuild,
            )
            write_heartbeat(
                config.heartbeat_file,
                status="ok",
                message="Pipeline cycle completed",
                attempts=attempts,
                changed=changed,
            )
            force_rebuild = False
        except Exception as exc:
            err = str(exc)
            write_heartbeat(
                config.heartbeat_file,
                status="error",
                message=err,
                attempts=config.max_retries + 1,
                changed=None,
            )
            maybe_alert_failure(
                config,
                error_message=err,
                attempts=config.max_retries + 1,
                mode="watch",
            )
        time.sleep(config.poll_seconds)


def run_once_mode(config: OrchestratorConfig, *, force_rebuild: bool) -> int:
    try:
        changed, attempts = run_pipeline_with_retries(
            config,
            force_rebuild=force_rebuild,
        )
        write_heartbeat(
            config.heartbeat_file,
            status="ok",
            message="Pipeline run completed",
            attempts=attempts,
            changed=changed,
        )
    except Exception as exc:
        err = str(exc)
        write_heartbeat(
            config.heartbeat_file,
            status="error",
            message=err,
            attempts=config.max_retries + 1,
            changed=None,
        )
        maybe_alert_failure(
            config,
            error_message=err,
            attempts=config.max_retries + 1,
            mode="once",
        )
        return 1
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Medallion pipeline orchestrator")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "config"
        / "medallion"
        / "orchestrator.json",
    )
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--force-rebuild", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    config = load_orchestrator_config(args.config)
    with process_lock(config.lock_file):
        if args.once:
            return run_once_mode(config, force_rebuild=args.force_rebuild)
        run_watch_loop(config, initial_force_rebuild=args.force_rebuild)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
