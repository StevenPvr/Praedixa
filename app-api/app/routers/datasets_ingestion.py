"""Datasets ingestion router -- file upload + helpers.

Security:
- File upload: size capped, rate-limited, magic-bytes validated,
  filename sanitized via os.path.basename(), no disk writes.
- Dataset ownership verified via TenantFilter before ANY parsing.
- org_admin role required for uploads.
"""

import asyncio
import os
import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload
from app.core.config import settings
from app.core.dependencies import get_db_session, get_tenant_filter
from app.core.exceptions import PraedixaError
from app.core.rate_limit import limiter
from app.core.security import TenantFilter, require_role
from app.models.data_catalog import (
    IngestionLog,
    IngestionMode,
    QualityReport,
    RunStatus,
)
from app.schemas.ingestion import FormatHint, IngestionResponse
from app.schemas.quality import QualitySummary
from app.schemas.responses import ApiResponse
from app.services.column_mapper import map_columns
from app.services.data_quality import QualityConfig, run_quality_checks
from app.services.datasets import get_dataset, get_dataset_columns
from app.services.file_parser import parse_file
from app.services.ingestion_log_watermark import set_ingestion_log_watermark
from app.services.raw_inserter import insert_raw_rows_in_session as insert_raw_rows

logger = structlog.get_logger()

# Magic bytes for XLSX (PK ZIP signature)
_XLSX_MAGIC = b"PK\x03\x04"

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])


def _validate_magic_bytes(content: bytes, filename: str) -> None:
    """Validate file magic bytes -- reject anything that isn't CSV or XLSX.

    Security: prevents upload of executables, images, or other unexpected
    file types disguised with a .csv/.xlsx extension.
    """
    lower = filename.lower()
    if lower.endswith(".xlsx"):
        if content[:4] != _XLSX_MAGIC:
            msg = "Invalid XLSX file: missing PK signature"
            raise PraedixaError(message=msg, code="INVALID_FILE", status_code=400)
    elif lower.endswith((".csv", ".tsv")):
        # CSV/TSV must be decodable text -- check first 1024 bytes
        try:
            content[:1024].decode("utf-8")
        except UnicodeDecodeError:
            try:
                content[:1024].decode("latin-1")
            except UnicodeDecodeError:  # pragma: no cover -- latin-1 decodes all bytes
                msg = "Invalid CSV file: not a text file"
                raise PraedixaError(
                    message=msg, code="INVALID_FILE", status_code=400
                ) from None
    else:
        msg = "Unsupported file type. Only .csv, .tsv, and .xlsx are accepted"
        raise PraedixaError(message=msg, code="INVALID_FILE", status_code=400)


async def _check_cooldown(dataset_id: uuid.UUID, session: AsyncSession) -> None:
    """Enforce per-dataset upload cooldown to prevent rapid-fire uploads."""
    result = await session.execute(
        select(IngestionLog)
        .where(IngestionLog.dataset_id == dataset_id)
        .where(IngestionLog.mode == IngestionMode.FILE_UPLOAD)
        .order_by(IngestionLog.started_at.desc())
        .limit(1)
    )
    last_log = result.scalar_one_or_none()
    if last_log and last_log.started_at:
        elapsed = (datetime.now(UTC) - last_log.started_at).total_seconds()
        if elapsed < settings.UPLOAD_COOLDOWN_SECONDS:
            msg = (
                f"Upload cooldown active. "
                f"Please wait {settings.UPLOAD_COOLDOWN_SECONDS}s between uploads."
            )
            raise PraedixaError(message=msg, code="UPLOAD_COOLDOWN", status_code=429)


def _sanitize_sheet_name(sheet_name: str | None) -> str | None:
    """Sanitize sheet_name: cap length and strip non-printable chars.

    This value is reflected in error messages if the sheet is not found.
    """
    _max_sheet_name_len = 100
    if sheet_name is None:
        return None
    sheet_name = sheet_name[:_max_sheet_name_len]
    sheet_name = "".join(c for c in sheet_name if c.isprintable())
    return sheet_name or None


async def _read_upload_content(file: UploadFile) -> bytes:
    """Read file content in chunks with streaming size enforcement.

    Defense against attackers who omit Content-Length or use chunked
    transfer encoding to bypass the RequestBodySizeLimitMiddleware.
    """
    max_size = settings.MAX_UPLOAD_SIZE_BYTES
    chunks: list[bytes] = []
    total_read = 0
    _read_chunk_size = 1024 * 1024  # 1 MB chunks
    while True:
        chunk = await file.read(_read_chunk_size)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > max_size:
            raise PraedixaError(
                message="File too large",
                code="PAYLOAD_TOO_LARGE",
                status_code=413,
            )
        chunks.append(chunk)

    content = b"".join(chunks)
    if len(content) == 0:
        raise PraedixaError(
            message="File is empty",
            code="INVALID_FILE",
            status_code=400,
        )
    return content


async def _log_ingestion_failure(
    session: AsyncSession,
    *,
    dataset_id: uuid.UUID,
    rows_received: int,
    started_at: datetime,
    error_message: str,
    triggered_by: str,
    file_name: str,
    file_size: int,
) -> None:
    """Create an IngestionLog entry for a failed ingestion step and commit."""
    # If a previous statement failed, the transaction may be in error state.
    # Roll back explicitly before recording the failure audit row.
    await session.rollback()

    log_entry = IngestionLog(
        dataset_id=dataset_id,
        mode=IngestionMode.FILE_UPLOAD,
        rows_received=rows_received,
        rows_transformed=0,
        started_at=started_at,
        completed_at=datetime.now(UTC),
        status=RunStatus.FAILED,
        error_message=error_message[:500],
        triggered_by=triggered_by,
        file_name=file_name,
        file_size=file_size,
    )
    session.add(log_entry)
    await session.flush()
    await session.commit()


@router.post("/{dataset_id}/ingest", status_code=201)
@limiter.limit("6/minute")
async def ingest_file(  # pragma: no cover
    request: Request,
    dataset_id: uuid.UUID,
    file: UploadFile,
    format_hint: FormatHint | None = None,
    sheet_name: str | None = None,
    tenant: TenantFilter = Depends(get_tenant_filter),
    session: AsyncSession = Depends(get_db_session),
    current_user: JWTPayload = Depends(require_role("org_admin")),
) -> ApiResponse[IngestionResponse]:
    """Upload and ingest a CSV/XLSX file into a dataset.

    Security:
    - Dataset ownership verified via TenantFilter before ANY parsing.
    - File size capped at MAX_UPLOAD_SIZE_BYTES (50 MB) via streaming read.
    - Magic bytes validated (reject non-CSV/XLSX).
    - Filename sanitized via os.path.basename() (path traversal prevention).
    - sheet_name sanitized and length-capped to prevent log injection.
    - No disk writes -- all parsing happens in memory.
    - Rate limited to 6/minute + per-dataset cooldown.
    - org_admin role required.
    """
    started_at = datetime.now(UTC)
    safe_filename = os.path.basename(file.filename or "unknown")
    sheet_name = _sanitize_sheet_name(sheet_name)

    # 1. Verify dataset ownership (tenant isolation FIRST)
    dataset = await get_dataset(dataset_id, tenant, session)

    # 2. Check upload cooldown BEFORE reading the file body.
    await _check_cooldown(dataset_id, session)

    # 3. Read file content with streaming size enforcement
    content = await _read_upload_content(file)
    file_size = len(content)

    # 4. Validate magic bytes
    _validate_magic_bytes(content, safe_filename)

    # 5. Get dataset columns for mapping
    columns = await get_dataset_columns(dataset_id, tenant, session)

    # Common kwargs for failure logging -- used via ** unpacking.
    # Typed as Any to avoid mypy arg-type errors when unpacking mixed-type dict.
    failure_kwargs: dict[str, Any] = {
        "dataset_id": dataset_id,
        "started_at": started_at,
        "triggered_by": current_user.user_id,
        "file_name": safe_filename,
        "file_size": file_size,
    }

    # 6. Parse file in thread (CPU-bound)
    try:
        parse_result = await asyncio.to_thread(
            parse_file,
            content,
            safe_filename,
            format_hint=format_hint,
            sheet_name=sheet_name,
            max_rows=settings.MAX_ROWS_PER_INGESTION,
        )
    except Exception as exc:
        await _log_ingestion_failure(
            session, rows_received=0, error_message=str(exc), **failure_kwargs
        )
        raise PraedixaError(
            message="File parsing failed",
            code="PARSE_ERROR",
            status_code=400,
        ) from exc

    # 7. Map columns
    mapping_result = map_columns(
        source_columns=parse_result.source_columns,
        dataset_columns=columns,
        format_hint=format_hint,
    )

    # 7.5 Run quality checks
    quality_config_raw = dataset.pipeline_config.get("data_quality", {})
    quality_config = QualityConfig(
        **{
            k: v
            for k, v in quality_config_raw.items()
            if k in QualityConfig.__dataclass_fields__
        }
    )

    try:
        quality_result = await asyncio.to_thread(
            run_quality_checks,
            parse_result.rows,
            columns,
            dataset.temporal_index,
            dataset.group_by or [],
            quality_config,
        )
    except Exception as exc:
        await _log_ingestion_failure(
            session,
            rows_received=parse_result.row_count,
            error_message=str(exc),
            **failure_kwargs,
        )
        raise PraedixaError(
            message="Data quality checks failed",
            code="QUALITY_ERROR",
            status_code=500,
        ) from exc

    # 8. Insert CLEANED rows within the request SQLAlchemy transaction
    try:
        insertion_result = await insert_raw_rows(
            session,
            dataset.schema_data,
            dataset.table_name,
            mapping_result.mappings,
            quality_result.cleaned_rows,
        )
    except Exception as exc:
        await _log_ingestion_failure(
            session,
            rows_received=parse_result.row_count,
            error_message=str(exc),
            **failure_kwargs,
        )
        raise PraedixaError(
            message="Data insertion failed",
            code="INSERT_ERROR",
            status_code=500,
        ) from exc

    # 9. Create success IngestionLog entry
    log_entry = IngestionLog(
        dataset_id=dataset_id,
        mode=IngestionMode.FILE_UPLOAD,
        rows_received=parse_result.row_count,
        rows_transformed=insertion_result.rows_inserted,
        started_at=started_at,
        completed_at=datetime.now(UTC),
        status=RunStatus.SUCCESS,
        triggered_by=current_user.user_id,
        file_name=safe_filename,
        file_size=file_size,
    )
    session.add(log_entry)
    await session.flush()
    await set_ingestion_log_watermark(
        session,
        log_entry.id,
        insertion_result.max_ingested_at,
    )

    # 9.5 Create QualityReport
    quality_report = QualityReport(
        dataset_id=dataset_id,
        ingestion_log_id=log_entry.id,
        rows_received=quality_result.rows_received,
        rows_after_dedup=quality_result.rows_after_dedup,
        rows_after_quality=quality_result.rows_after_quality,
        duplicates_found=quality_result.duplicates_found,
        missing_values_found=quality_result.missing_total,
        missing_values_imputed=quality_result.missing_imputed,
        outliers_found=quality_result.outliers_total,
        outliers_clamped=quality_result.outliers_clamped,
        column_details={
            name: asdict(report)
            for name, report in quality_result.column_reports.items()
        },
        strategy_config=quality_result.config_snapshot,
    )
    session.add(quality_report)
    await session.flush()

    quality_summary = QualitySummary(
        duplicates_found=quality_result.duplicates_found,
        duplicates_removed=quality_result.duplicates_removed,
        missing_values_found=quality_result.missing_total,
        missing_values_imputed=quality_result.missing_imputed,
        outliers_found=quality_result.outliers_total,
        outliers_clamped=quality_result.outliers_clamped,
        quality_report_id=quality_report.id,
    )

    all_warnings = (
        parse_result.warnings + mapping_result.warnings + insertion_result.warnings
    )

    logger.info(
        "file_ingested",
        dataset_id=str(dataset_id),
        rows_inserted=insertion_result.rows_inserted,
        file_name=safe_filename,
        format=parse_result.detected_format,
        duplicates_removed=quality_result.duplicates_removed,
        outliers_clamped=quality_result.outliers_clamped,
    )

    return ApiResponse(
        success=True,
        data=IngestionResponse(
            dataset_id=dataset_id,
            rows_inserted=insertion_result.rows_inserted,
            batch_id=insertion_result.batch_id,
            detected_format=parse_result.detected_format,
            detected_encoding=parse_result.detected_encoding,
            warnings=all_warnings,
            ingestion_log_id=log_entry.id,
            quality_summary=quality_summary,
        ),
        timestamp=datetime.now(UTC).isoformat(),
    )
