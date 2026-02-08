"""CLI for ingesting CSV/XLSX files into dataset raw tables.

Usage:
    cd apps/api
    python -m scripts.ingest_file --dataset-id <UUID> --file <path>
    python -m scripts.ingest_file --dataset-id <UUID> --file <path> --format lucca
    python -m scripts.ingest_file --dataset-id <UUID> --directory <path>

This script uses the same parsing engine as the API endpoint
(POST /api/v1/datasets/{id}/ingest) but reads files from disk
instead of HTTP upload.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.data_catalog import (
    ClientDataset,
    DatasetColumn,
    IngestionLog,
    IngestionMode,
    RunStatus,
)
from app.services.column_mapper import map_columns
from app.services.file_parser import parse_file
from app.services.raw_inserter import insert_raw_rows

# Supported file extensions for directory mode
_SUPPORTED_EXTENSIONS = {".csv", ".tsv", ".xlsx"}


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest CSV/XLSX files into a dataset's raw table.",
    )
    parser.add_argument(
        "--dataset-id",
        required=True,
        type=uuid.UUID,
        help="UUID of the target dataset",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--file",
        type=Path,
        help="Path to a single CSV/XLSX file",
    )
    group.add_argument(
        "--directory",
        type=Path,
        help="Path to a directory of CSV/XLSX files",
    )
    parser.add_argument(
        "--format",
        choices=["lucca", "payfit", "generic"],
        default=None,
        help="Format hint for column mapping",
    )
    parser.add_argument(
        "--sheet-name",
        default=None,
        help="Sheet name for XLSX files",
    )
    return parser.parse_args()


async def _load_dataset(
    dataset_id: uuid.UUID,
) -> tuple[ClientDataset, list[DatasetColumn]]:
    """Load dataset metadata and columns from the database."""
    from sqlalchemy import select

    async with async_session_factory() as session:
        result = await session.execute(
            select(ClientDataset).where(ClientDataset.id == dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if dataset is None:
            sys.exit(1)

        col_result = await session.execute(
            select(DatasetColumn)
            .where(DatasetColumn.dataset_id == dataset_id)
            .order_by(DatasetColumn.ordinal_position)
        )
        columns = list(col_result.scalars().all())

    return dataset, columns


async def _ingest_single_file(
    file_path: Path,
    dataset: ClientDataset,
    columns: list[DatasetColumn],
    format_hint: str | None,
    sheet_name: str | None,
) -> bool:
    """Ingest a single file. Returns True on success, False on failure."""
    started_at = datetime.now(UTC)
    filename = file_path.name

    # Read file
    try:
        content = file_path.read_bytes()
    except OSError:
        return False

    file_size = len(content)
    if file_size == 0:
        return False

    # Parse
    try:
        parse_result = parse_file(
            content,
            filename,
            format_hint=format_hint,
            sheet_name=sheet_name,
            max_rows=settings.MAX_ROWS_PER_INGESTION,
        )
    except Exception as exc:
        await _log_ingestion(
            dataset.id,
            started_at,
            0,
            0,
            RunStatus.FAILED,
            str(exc)[:500],
            filename,
            file_size,
        )
        return False

    if parse_result.warnings:
        for _w in parse_result.warnings:
            pass

    # Map columns
    mapping_result = map_columns(
        source_columns=parse_result.source_columns,
        dataset_columns=columns,
        format_hint=format_hint,
    )
    sum(1 for m in mapping_result.mappings if m.confidence > 0)
    if mapping_result.warnings:
        for _w in mapping_result.warnings:
            pass

    # Insert
    try:
        result = insert_raw_rows(
            dataset.schema_raw,
            dataset.table_name,
            mapping_result.mappings,
            parse_result.rows,
        )
    except Exception as exc:
        await _log_ingestion(
            dataset.id,
            started_at,
            parse_result.row_count,
            0,
            RunStatus.FAILED,
            str(exc)[:500],
            filename,
            file_size,
        )
        return False

    if result.warnings:
        for _w in result.warnings:
            pass

    # Log success
    await _log_ingestion(
        dataset.id,
        started_at,
        parse_result.row_count,
        result.rows_inserted,
        RunStatus.SUCCESS,
        None,
        filename,
        file_size,
    )
    return True


async def _log_ingestion(
    dataset_id: uuid.UUID,
    started_at: datetime,
    rows_received: int,
    rows_transformed: int,
    status: RunStatus,
    error_message: str | None,
    file_name: str,
    file_size: int,
) -> None:
    """Create an IngestionLog entry."""
    async with async_session_factory() as session:
        log_entry = IngestionLog(
            dataset_id=dataset_id,
            mode=IngestionMode.FILE_UPLOAD,
            rows_received=rows_received,
            rows_transformed=rows_transformed,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            status=status,
            error_message=error_message,
            triggered_by="cli:ingest_file",
            file_name=file_name,
            file_size=file_size,
        )
        session.add(log_entry)
        await session.commit()


async def main() -> None:
    args = _parse_args()

    dataset, columns = await _load_dataset(args.dataset_id)

    # Collect files to process
    files: list[Path] = []
    if args.file:
        if not args.file.exists():
            sys.exit(1)
        files.append(args.file)
    elif args.directory:
        if not args.directory.is_dir():
            sys.exit(1)
        for ext in _SUPPORTED_EXTENSIONS:
            files.extend(sorted(args.directory.glob(f"*{ext}")))
        if not files:
            sys.exit(1)

    # Process files
    success_count = 0
    fail_count = 0
    for file_path in files:
        ok = await _ingest_single_file(
            file_path,
            dataset,
            columns,
            args.format,
            args.sheet_name,
        )
        if ok:
            success_count += 1
        else:
            fail_count += 1

    # Summary
    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
