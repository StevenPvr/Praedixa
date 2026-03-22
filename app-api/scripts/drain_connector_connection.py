"""Drain pending raw events for one connectors-runtime connection into datasets.

Usage:
  cd app-api
  uv run python -m scripts.drain_connector_connection \
    --organization-id <uuid> \
    --connection-id <uuid>
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import socket
import sys
from uuid import UUID

from sqlalchemy import text

from app.core.database import async_session_factory
from app.core.security import TenantFilter
from app.services.integration_runtime_worker import (
    build_default_runtime_client,
    drain_connector_connection,
)


def _default_worker_id() -> str:
    hostname = socket.gethostname().split(".", maxsplit=1)[0]
    return f"manual-drain-{hostname}-{os.getpid()}"


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Drain one connector connection into the dataset pipeline.",
    )
    parser.add_argument("--organization-id", required=True)
    parser.add_argument("--connection-id", required=True)
    parser.add_argument(
        "--worker-id",
        default=_default_worker_id(),
    )
    parser.add_argument("--limit", type=int, default=250)
    return parser.parse_args()


async def _bind_session_tenant_context(session: object, organization_id: str) -> None:
    await session.execute(
        text("SET LOCAL app.current_organization_id = :org_id"),
        {"org_id": organization_id},
    )


async def main() -> None:
    args = _parse_args()
    organization_id = str(UUID(args.organization_id))
    connection_id = str(UUID(args.connection_id))
    runtime_client = build_default_runtime_client()

    try:
        async with async_session_factory() as session:
            await _bind_session_tenant_context(session, organization_id)
            result = await drain_connector_connection(
                TenantFilter(organization_id),
                session,
                runtime_client,
                organization_id=organization_id,
                connection_id=connection_id,
                worker_id=args.worker_id,
                limit=args.limit,
                request_id=f"manual-drain-{connection_id}",
                run_id=f"manual-drain-{connection_id}",
            )
            await session.commit()
    finally:
        await runtime_client.aclose()

    sys.stdout.write(
        json.dumps(
            {
                "organizationId": organization_id,
                "connectionId": connection_id,
                "claimed": result.claimed,
                "processed": result.processed,
                "failed": result.failed,
                "datasetName": result.dataset_name,
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    asyncio.run(main())
