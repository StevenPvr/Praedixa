"""Helpers for ingestion watermark persistence and lookup."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import column, select, table, update

from app.models.data_catalog import IngestionMode, RunStatus

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession

_ingestion_log = table(
    "ingestion_log",
    column("id"),
    column("dataset_id"),
    column("status"),
    column("mode"),
    column("ingested_watermark_at"),
)


async def get_last_successful_transform_watermark(
    session: AsyncSession,
    dataset_id: uuid.UUID,
) -> datetime | None:
    """Return latest persisted watermark from successful transform runs."""
    result = await session.execute(
        select(_ingestion_log.c.ingested_watermark_at)
        .where(_ingestion_log.c.dataset_id == dataset_id)
        .where(_ingestion_log.c.status == RunStatus.SUCCESS.value)
        .where(
            _ingestion_log.c.mode.in_(
                [
                    IngestionMode.INCREMENTAL.value,
                    IngestionMode.FULL_REFIT.value,
                ]
            )
        )
        .where(_ingestion_log.c.ingested_watermark_at.is_not(None))
        .order_by(_ingestion_log.c.ingested_watermark_at.desc())
        .limit(1)
    )
    raw_value = result.scalar_one_or_none()
    return raw_value if isinstance(raw_value, datetime) else None


async def set_ingestion_log_watermark(
    session: AsyncSession,
    ingestion_log_id: uuid.UUID,
    watermark: datetime | None,
) -> None:
    """Persist watermark on an ingestion_log row."""
    await session.execute(
        update(_ingestion_log)
        .where(_ingestion_log.c.id == ingestion_log_id)
        .values(ingested_watermark_at=cast("Any", watermark))
    )
