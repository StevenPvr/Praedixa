"""Run one inference job for one organization.

Usage:
  uv run python scripts/run_inference_job.py \
    --org-id <uuid> --job-id <uuid>
"""

from __future__ import annotations

import argparse
import asyncio
import uuid

from app.core.database import async_session_factory, set_rls_org_id
from app.core.security import TenantFilter
from app.services.model_inference_jobs import run_inference_job


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one model inference job")
    parser.add_argument("--org-id", required=True, help="Organization UUID")
    parser.add_argument("--job-id", required=True, help="Inference job UUID")
    return parser.parse_args()


async def _run(org_id: uuid.UUID, job_id: uuid.UUID) -> int:
    set_rls_org_id(str(org_id))
    tenant = TenantFilter(str(org_id))
    async with async_session_factory() as session:
        job = await run_inference_job(
            session,
            tenant,
            job_id=job_id,
            actor_service="inference_worker",
            request_id="worker-manual-run",
            ip_hash=None,
            raise_on_error=False,
        )
        await session.commit()
        if job.status == "completed":
            return 0
        return 2


def main() -> int:
    args = _parse_args()
    org_id = uuid.UUID(args.org_id)
    job_id = uuid.UUID(args.job_id)
    return asyncio.run(_run(org_id, job_id))


if __name__ == "__main__":
    raise SystemExit(main())
