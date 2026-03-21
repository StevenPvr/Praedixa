"""Dataset ingestion helpers for connector-driven CSV/XLSX files."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import TYPE_CHECKING, cast
from uuid import UUID

from sqlalchemy import select

from app.models.data_catalog import (
    ClientDataset,
    DatasetColumn,
    IngestionLog,
    IngestionMode,
    RunStatus,
)
from app.services.column_mapper import map_columns
from app.services.file_parser import parse_file
from app.services.raw_inserter import insert_raw_rows_in_session
from app.services.transform_engine import run_incremental

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter


@dataclass(frozen=True)
class DatasetFileIngestionResult:
    """Summary of one connector file imported into the dataset pipeline."""

    dataset_id: UUID
    dataset_name: str
    rows_received: int
    rows_inserted: int
    batch_id: UUID
    warnings: tuple[str, ...] = field(default_factory=tuple)


async def _load_dataset(
    tenant: TenantFilter,
    session: AsyncSession,
    dataset_id: UUID,
) -> ClientDataset:
    result = await session.execute(
        tenant.apply(
            select(ClientDataset).where(ClientDataset.id == dataset_id),
            ClientDataset,
        )
    )
    dataset = result.scalar_one_or_none()
    if dataset is None:
        raise ValueError("Configured datasetId was not found for this organization")
    return cast("ClientDataset", dataset)


async def _load_dataset_columns(
    session: AsyncSession,
    dataset_id: UUID,
) -> list[DatasetColumn]:
    result = await session.execute(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.ordinal_position)
    )
    return list(result.scalars().all())


async def _create_ingestion_log(
    session: AsyncSession,
    *,
    dataset_id: UUID,
    started_at: datetime,
    rows_received: int,
    rows_transformed: int,
    request_id: str | None,
    file_name: str,
    file_size: int,
) -> None:
    session.add(
        IngestionLog(
            dataset_id=dataset_id,
            mode=IngestionMode.FILE_UPLOAD,
            rows_received=rows_received,
            rows_transformed=rows_transformed,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            status=RunStatus.SUCCESS,
            triggered_by="integration_sftp",
            request_id=request_id,
            file_name=file_name,
            file_size=file_size,
        )
    )


async def ingest_file_bytes_to_dataset(
    tenant: TenantFilter,
    session: AsyncSession,
    *,
    dataset_id: UUID,
    file_name: str,
    content: bytes,
    format_hint: str | None,
    sheet_name: str | None,
    request_id: str | None,
    triggered_by: str,
) -> DatasetFileIngestionResult:
    """Parse one connector-managed file and insert it into the dataset pipeline."""

    dataset = await _load_dataset(tenant, session, dataset_id)
    columns = await _load_dataset_columns(session, dataset_id)
    started_at = datetime.now(UTC)
    parse_result = parse_file(
        content,
        file_name,
        format_hint=format_hint,
        sheet_name=sheet_name,
    )
    effective_format_hint = (
        parse_result.detected_format
        if parse_result.detected_format in {"lucca", "payfit"}
        else None
    )
    mapping_result = map_columns(
        parse_result.source_columns,
        columns,
        format_hint=effective_format_hint,
    )
    insertion = await insert_raw_rows_in_session(
        session,
        dataset.schema_data,
        dataset.table_name,
        [
            SimpleNamespace(
                source_column=mapping.source_column,
                target_column=mapping.target_column,
            )
            for mapping in mapping_result.mappings
        ],
        parse_result.rows,
    )
    await _create_ingestion_log(
        session,
        dataset_id=dataset.id,
        started_at=started_at,
        rows_received=parse_result.row_count,
        rows_transformed=insertion.rows_inserted,
        request_id=request_id,
        file_name=file_name,
        file_size=len(content),
    )
    await run_incremental(
        dataset.id,
        session,
        triggered_by=triggered_by,
        request_id=request_id,
    )
    return DatasetFileIngestionResult(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        rows_received=parse_result.row_count,
        rows_inserted=insertion.rows_inserted,
        batch_id=insertion.batch_id,
        warnings=tuple(parse_result.warnings + mapping_result.warnings),
    )
