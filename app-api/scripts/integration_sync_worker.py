"""Claim and process queued connector sync runs from the connectors runtime.

Usage:
  uv run python -m scripts.integration_sync_worker --once
  uv run python -m scripts.integration_sync_worker --watch --poll-seconds 30
"""

from __future__ import annotations

import argparse
import asyncio
import os
import socket
import time

from app.core.database import async_session_factory
from app.core.telemetry import TelemetryContext, get_telemetry_logger
from app.services.integration_runtime_worker import build_default_runtime_client
from app.services.integration_sync_queue_worker import drain_sync_queue_once

logger = get_telemetry_logger(__name__)


def _default_worker_id() -> str:
    host = socket.gethostname().split(".", maxsplit=1)[0] or "local"
    return f"sync-worker-{host}-{os.getpid()}"


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Claim and process queued connector sync runs",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--once",
        action="store_true",
        help="Run one claim/process iteration then exit (default)",
    )
    mode.add_argument(
        "--watch",
        action="store_true",
        help="Keep polling the sync queue",
    )
    parser.add_argument(
        "--worker-id",
        default=_default_worker_id(),
        help="Stable worker identifier used for leases and audit logs",
    )
    parser.add_argument(
        "--claim-limit",
        type=int,
        default=25,
        help="Maximum number of sync runs to claim per iteration",
    )
    parser.add_argument(
        "--lease-seconds",
        type=int,
        default=300,
        help="Lease duration for claimed sync runs",
    )
    parser.add_argument(
        "--drain-limit",
        type=int,
        default=50,
        help="Maximum raw events to drain per claimed sync run",
    )
    parser.add_argument(
        "--poll-seconds",
        type=int,
        default=30,
        help="Polling cadence in watch mode",
    )
    parser.add_argument(
        "--request-id",
        help="Optional correlation id reused across iterations",
    )
    parser.add_argument(
        "--trace-id",
        help="Optional distributed trace id",
    )
    return parser.parse_args()


def _build_iteration_request_id(worker_id: str, raw_request_id: str | None) -> str:
    return raw_request_id or f"sync-queue-{worker_id}-{int(time.time() * 1000)}"


def _build_iteration_run_id(worker_id: str) -> str:
    return f"sync-queue-batch-{worker_id}-{int(time.time() * 1000)}"


async def _run_iteration(args: argparse.Namespace) -> int:
    request_id = _build_iteration_request_id(args.worker_id, args.request_id)
    run_id = _build_iteration_run_id(args.worker_id)
    telemetry = logger.bind(
        **TelemetryContext(
            request_id=request_id,
            run_id=run_id,
            trace_id=args.trace_id,
        ).as_log_fields()
    )
    runtime_client = build_default_runtime_client()

    try:
        result = await drain_sync_queue_once(
            runtime_client,
            async_session_factory,
            worker_id=args.worker_id,
            claim_limit=args.claim_limit,
            lease_seconds=args.lease_seconds,
            drain_limit=args.drain_limit,
            request_id=request_id,
            run_id=run_id,
            trace_id=args.trace_id,
        )
    finally:
        await runtime_client.aclose()

    telemetry.info(
        "Connector sync worker iteration finished",
        event="connector.runtime.sync_worker.iteration_completed",
        status="success" if result.failed_runs == 0 else "degraded",
        worker_id=args.worker_id,
        claimed_runs=result.claimed_runs,
        completed_runs=result.completed_runs,
        failed_runs=result.failed_runs,
        retried_runs=result.retried_runs,
        claimed_records=result.claimed_records,
        processed_records=result.processed_records,
    )
    return 0 if result.failed_runs == 0 else 2


async def _run_watch(args: argparse.Namespace) -> int:
    request_id = args.request_id or f"sync-queue-watch-{args.worker_id}"
    telemetry = logger.bind(
        **TelemetryContext(
            request_id=request_id,
            trace_id=args.trace_id,
        ).as_log_fields()
    )
    telemetry.info(
        "Connector sync worker started in watch mode",
        event="connector.runtime.sync_worker.started",
        status="running",
        worker_id=args.worker_id,
        poll_seconds=args.poll_seconds,
    )

    exit_code = 0
    while True:
        exit_code = max(exit_code, await _run_iteration(args))
        await asyncio.sleep(max(1, args.poll_seconds))


def main() -> int:
    args = _parse_args()
    if not args.watch:
        args.once = True

    try:
        if args.watch:
            return asyncio.run(_run_watch(args))
        return asyncio.run(_run_iteration(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
