"""Run one inference job for one organization.

Usage:
  uv run python scripts/run_inference_job.py \
    --org-id <uuid> --job-id <uuid>
"""

from __future__ import annotations

import argparse
import asyncio
import time
import uuid

from app.core.database import async_session_factory, set_rls_org_id
from app.core.security import TenantFilter
from app.core.telemetry import TelemetryContext, get_telemetry_logger
from app.services.model_inference_jobs import run_inference_job

logger = get_telemetry_logger(__name__)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one model inference job")
    parser.add_argument("--org-id", required=True, help="Organization UUID")
    parser.add_argument("--job-id", required=True, help="Inference job UUID")
    parser.add_argument(
        "--request-id",
        help="Correlation id to propagate into the inference run",
    )
    parser.add_argument(
        "--trace-id",
        help="Optional distributed trace id for this manual execution",
    )
    return parser.parse_args()


async def _run(
    org_id: uuid.UUID,
    job_id: uuid.UUID,
    *,
    request_id: str,
    trace_id: str | None,
) -> int:
    started_at = time.perf_counter()
    telemetry = logger.bind(
        **TelemetryContext(
            request_id=request_id,
            run_id=str(job_id),
            organization_id=str(org_id),
            trace_id=trace_id,
        ).as_log_fields()
    )
    set_rls_org_id(str(org_id))
    tenant = TenantFilter(str(org_id))
    telemetry.info(
        "Manual inference run started",
        event="inference.job.started",
        status="running",
        job_id=str(job_id),
    )
    try:
        async with async_session_factory() as session:
            job = await run_inference_job(
                session,
                tenant,
                job_id=job_id,
                actor_service="inference_worker",
                request_id=request_id,
                ip_hash=None,
                raise_on_error=False,
            )
            await session.commit()
            duration_ms = round((time.perf_counter() - started_at) * 1000)
            telemetry.info(
                "Manual inference run finished",
                event="inference.job.completed",
                status=job.status,
                job_id=str(job_id),
                duration_ms=duration_ms,
            )
            if job.status == "completed":
                return 0
            return 2
    except Exception:
        telemetry.exception(
            "Manual inference run failed",
            event="inference.job.failed",
            status="failed",
            job_id=str(job_id),
            duration_ms=round((time.perf_counter() - started_at) * 1000),
            error_code="inference_job_failed",
        )
        raise


def main() -> int:
    args = _parse_args()
    org_id = uuid.UUID(args.org_id)
    job_id = uuid.UUID(args.job_id)
    request_id = args.request_id or f"inference-manual-{job_id}"
    return asyncio.run(
        _run(
            org_id,
            job_id,
            request_id=request_id,
            trace_id=args.trace_id,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
