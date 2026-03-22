"""Raw Inserter — batch insert parsed rows into dynamic raw tables.

Inserts rows into the raw schema table using psycopg.sql for
injection-safe identifier composition. All-or-nothing transactional
semantics per call.

Security notes:
- ALL identifiers (schema, table, columns) are validated via
  validate_identifier / validate_schema_name BEFORE being passed to
  psycopg.sql.Identifier (defense in depth — double validation).
- Column names from ColumnMapping.target_column are validated even
  though they originate from DatasetColumn definitions in the DB,
  because the mapping may have been tampered with in transit.
- System columns (_row_id, _ingested_at, _batch_id) are hardcoded
  and never derived from user input.
- executemany is batched to prevent oversized wire protocol messages.
- Transaction: ddl_connection commits on success, rolls back on error.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from psycopg import sql
from sqlalchemy import column, insert, table

from app.core.ddl_connection import ddl_connection
from app.core.ddl_validation import validate_identifier, validate_schema_name

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

__all__ = [
    "InsertionResult",
    "insert_raw_rows",
    "insert_raw_rows_in_session",
    "RawInsertError",
]

_POSTGRES_MAX_BIND_PARAMS = 65_535


def _empty_warnings() -> list[str]:
    return []


def _build_validated_insert_plan(
    schema_name: str,
    table_name: str,
    column_mapping: list[Any],
    rows: list[dict[str, Any]],
    *,
    batch_size: int,
) -> tuple[
    str,
    str,
    list[tuple[str, str]],
    list[str],
    int,
    uuid.UUID,
    datetime,
    list[str],
]:
    """Validate identifiers and compute insertion plan metadata."""
    warnings: list[str] = []
    validated_schema = validate_schema_name(schema_name)
    validated_table = validate_identifier(table_name, field="table_name")

    col_pairs: list[tuple[str, str]] = []
    for mapping in column_mapping:
        target = validate_identifier(mapping.target_column, field="column_name")
        col_pairs.append((mapping.source_column, target))

    if not col_pairs:
        raise RawInsertError(
            "No column mappings provided",
            code="NO_COLUMN_MAPPINGS",
        )

    all_columns = ["_row_id", "_ingested_at", "_batch_id"]
    all_columns.extend(target for _, target in col_pairs)

    params_per_row = len(all_columns)
    max_rows_per_stmt = max(1, _POSTGRES_MAX_BIND_PARAMS // params_per_row)
    effective_batch_size = max(1, min(batch_size, max_rows_per_stmt))
    if effective_batch_size < batch_size:
        warnings.append("Batch size reduced to satisfy PostgreSQL parameter limits")

    return (
        validated_schema,
        validated_table,
        col_pairs,
        all_columns,
        effective_batch_size,
        uuid.uuid4(),
        datetime.now(UTC),
        warnings,
    )


# ── Exceptions ───────────────────────────────────────────


class RawInsertError(Exception):
    """Raised when raw data insertion fails."""

    def __init__(self, message: str, *, code: str = "RAW_INSERT_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


# ── Result dataclass ─────────────────────────────────────


@dataclass(frozen=True)
class InsertionResult:
    """Immutable result of a raw data insertion."""

    rows_inserted: int
    batch_id: uuid.UUID
    schema_name: str
    table_name: str
    max_ingested_at: datetime | None = None
    warnings: list[str] = field(default_factory=_empty_warnings)


# ── Public API ───────────────────────────────────────────


def insert_raw_rows(
    schema_name: str,
    table_name: str,
    column_mapping: list[Any],
    rows: list[dict[str, Any]],
    *,
    batch_size: int = 1000,
) -> InsertionResult:
    """Insert parsed rows into a dynamic raw table.

    This is a synchronous function intended to be called via
    asyncio.to_thread() from async code.

    Args:
        schema_name: Target schema (e.g. "acme_raw"). Validated.
        table_name: Target table name. Validated.
        column_mapping: List of ColumnMapping objects with .source_column
            and .target_column attributes.
        rows: List of row dicts (keys are source column names).
        batch_size: Number of rows per executemany batch (default 1000).

    Returns:
        InsertionResult with count, batch_id, and warnings.

    Raises:
        RawInsertError: On validation or insertion failure.
    """
    if not rows:
        batch_id = uuid.uuid4()
        warnings: list[str] = []
        warnings.append("No rows to insert")
        return InsertionResult(
            rows_inserted=0,
            batch_id=batch_id,
            schema_name=schema_name,
            table_name=table_name,
            max_ingested_at=None,
            warnings=warnings,
        )

    (
        validated_schema,
        validated_table,
        col_pairs,
        all_columns,
        effective_batch_size,
        batch_id,
        ingested_at,
        warnings,
    ) = _build_validated_insert_plan(
        schema_name,
        table_name,
        column_mapping,
        rows,
        batch_size=batch_size,
    )

    col_identifiers = sql.SQL(", ").join(sql.Identifier(c) for c in all_columns)
    placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in all_columns)

    insert_stmt = sql.SQL("INSERT INTO {}.{} ({}) VALUES ({})").format(
        sql.Identifier(validated_schema),
        sql.Identifier(validated_table),
        col_identifiers,
        placeholders,
    )

    # ── Execute insertion in batched transaction ─────────
    rows_inserted = 0

    def _sync_insert() -> int:
        nonlocal rows_inserted
        with ddl_connection() as conn, conn.cursor() as cur:
            for batch_start in range(0, len(rows), effective_batch_size):
                batch = rows[batch_start : batch_start + effective_batch_size]
                params_list: list[list[Any]] = []

                for row in batch:
                    values: list[Any] = [
                        uuid.uuid4(),  # _row_id
                        ingested_at,  # _ingested_at
                        batch_id,  # _batch_id
                    ]
                    for source_col, _ in col_pairs:
                        values.append(row.get(source_col))
                    params_list.append(values)

                cur.executemany(insert_stmt, params_list)
                rows_inserted += len(params_list)

        return rows_inserted

    try:
        _sync_insert()
    except Exception as exc:
        logger.exception(
            "Raw insertion failed: schema=%s table=%s batch_id=%s",
            validated_schema,
            validated_table,
            batch_id,
        )
        raise RawInsertError(
            "Failed to insert rows into raw table",
            code="INSERT_FAILED",
        ) from exc

    logger.info(
        "Raw insertion complete: schema=%s table=%s rows=%d batch_id=%s",
        validated_schema,
        validated_table,
        rows_inserted,
        batch_id,
    )

    return InsertionResult(
        rows_inserted=rows_inserted,
        batch_id=batch_id,
        schema_name=validated_schema,
        table_name=validated_table,
        max_ingested_at=ingested_at,
        warnings=warnings,
    )


async def insert_raw_rows_in_session(
    session: AsyncSession,
    schema_name: str,
    table_name: str,
    column_mapping: list[Any],
    rows: list[dict[str, Any]],
    *,
    batch_size: int = 1000,
) -> InsertionResult:
    """Insert rows using the caller's SQLAlchemy transaction/session."""
    if not rows:
        batch_id = uuid.uuid4()
        warnings = ["No rows to insert"]
        return InsertionResult(
            rows_inserted=0,
            batch_id=batch_id,
            schema_name=schema_name,
            table_name=table_name,
            max_ingested_at=None,
            warnings=warnings,
        )

    (
        validated_schema,
        validated_table,
        col_pairs,
        all_columns,
        effective_batch_size,
        batch_id,
        ingested_at,
        warnings,
    ) = _build_validated_insert_plan(
        schema_name,
        table_name,
        column_mapping,
        rows,
        batch_size=batch_size,
    )

    table_columns: list[Any] = [
        cast("Any", column(col_name)) for col_name in all_columns
    ]
    table_clause = table(
        validated_table,
        *table_columns,
        schema=validated_schema,
    )
    stmt = insert(table_clause)

    rows_inserted = 0
    try:
        for batch_start in range(0, len(rows), effective_batch_size):
            batch = rows[batch_start : batch_start + effective_batch_size]
            params_list: list[dict[str, Any]] = []
            for row in batch:
                payload: dict[str, Any] = {
                    "_row_id": uuid.uuid4(),
                    "_ingested_at": ingested_at,
                    "_batch_id": batch_id,
                }
                for source_col, target_col in col_pairs:
                    payload[target_col] = row.get(source_col)
                params_list.append(payload)

            await session.execute(stmt, params_list)
            rows_inserted += len(params_list)
    except Exception as exc:
        logger.exception(
            "Raw insertion failed (session): schema=%s table=%s batch_id=%s",
            validated_schema,
            validated_table,
            batch_id,
        )
        raise RawInsertError(
            "Failed to insert rows into raw table",
            code="INSERT_FAILED",
        ) from exc

    logger.info(
        "Raw insertion complete (session): schema=%s table=%s rows=%d batch_id=%s",
        validated_schema,
        validated_table,
        rows_inserted,
        batch_id,
    )

    return InsertionResult(
        rows_inserted=rows_inserted,
        batch_id=batch_id,
        schema_name=validated_schema,
        table_name=validated_table,
        max_ingested_at=ingested_at,
        warnings=warnings,
    )


async def insert_raw_rows_async(
    schema_name: str,
    table_name: str,
    column_mapping: list[Any],
    rows: list[dict[str, Any]],
    *,
    batch_size: int = 1000,
) -> InsertionResult:
    """Async wrapper for insert_raw_rows.

    Delegates to asyncio.to_thread() following the same pattern as
    transform_engine.py and schema_manager.py.
    """
    return await asyncio.to_thread(
        insert_raw_rows,
        schema_name,
        table_name,
        column_mapping,
        rows,
        batch_size=batch_size,
    )
