"""Schema Manager service — dynamic PostgreSQL schema and table creation.

Creates per-client raw and transformed schemas and tables based on
dataset metadata. ALL DDL uses psycopg.sql.Identifier/SQL — ZERO
f-string interpolation for identifiers.

Security notes:
- Every identifier is validated via ddl_validation before use.
- psycopg.sql module provides SQL injection-safe composition.
- Tables are created via ddl_connection (SET ROLE praedixa_owner).
- System columns (_row_id, _ingested_at, etc.) are hardcoded, not dynamic.

Usage:
    await create_client_schemas("acme")
    await create_dataset_tables(dataset_id, session)
"""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Any

from psycopg import sql

from app.core.config import settings
from app.core.ddl_connection import ddl_connection
from app.core.ddl_validation import (
    validate_client_slug,
    validate_column_name,
    validate_column_type,
    validate_identifier,
    validate_schema_name,
    validate_table_name,
)
from app.models.data_catalog import ColumnRole

if TYPE_CHECKING:
    from app.models.data_catalog import ClientDataset, DatasetColumn

logger = logging.getLogger(__name__)

# ── Column type mapping (ColumnDtype -> PG type) ──────────
_DTYPE_TO_PG: dict[str, str] = {
    "float": "DOUBLE PRECISION",
    "integer": "INTEGER",
    "date": "DATE",
    "category": "TEXT",
    "boolean": "BOOLEAN",
    "text": "TEXT",
}


# ── Public API ───────────────────────────────────────────


async def create_client_schemas(org_slug: str) -> tuple[str, str]:
    """Create raw and transformed PostgreSQL schemas for a client org.

    Args:
        org_slug: Validated organization slug (e.g. "acme").

    Returns:
        Tuple of (raw_schema_name, transformed_schema_name).

    Raises:
        DDLValidationError: If slug or schema name fails validation.
    """
    validated_slug = validate_client_slug(org_slug)
    raw_schema = f"{validated_slug}_{settings.RAW_SCHEMA_SUFFIX}"
    transformed_schema = f"{validated_slug}_{settings.TRANSFORMED_SCHEMA_SUFFIX}"

    # Validate the composed schema names
    validate_schema_name(raw_schema)
    validate_schema_name(transformed_schema)

    def _sync_create() -> None:
        with ddl_connection() as conn, conn.cursor() as cur:
            for schema_name in (raw_schema, transformed_schema):
                cur.execute(
                    sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                        sql.Identifier(schema_name)
                    )
                )
                logger.info("Created schema: %s", schema_name)

    await asyncio.to_thread(_sync_create)
    return raw_schema, transformed_schema


async def create_dataset_tables(
    dataset: ClientDataset,
    columns: list[DatasetColumn],
) -> None:
    """Create raw and transformed tables for a dataset.

    Args:
        dataset: The ClientDataset ORM model (must be flushed with ID).
        columns: List of DatasetColumn definitions.

    Creates:
        - {schema_raw}.{table_name}: system cols + dynamic cols from metadata
        - {schema_transformed}.{table_name}: system cols + original cols + feature cols
        - Indexes on temporal_index and group_by columns
    """
    # Validate all identifiers
    raw_schema = validate_schema_name(dataset.schema_raw)
    transformed_schema = validate_schema_name(dataset.schema_transformed)
    table_name = validate_table_name(dataset.table_name)
    temporal_index = validate_identifier(dataset.temporal_index, field="temporal_index")

    validated_group_by = [
        validate_identifier(gb, field="group_by") for gb in dataset.group_by
    ]

    # Validate and resolve column definitions
    validated_columns: list[tuple[str, str]] = []
    for col in columns:
        col_name = validate_column_name(col.name)
        pg_type = validate_column_type(col.dtype.value)
        validated_columns.append((col_name, pg_type))

    # Compute transformed feature columns
    feature_columns = resolve_transformed_columns(columns, dataset.pipeline_config)

    def _sync_create() -> None:
        with ddl_connection() as conn, conn.cursor() as cur:
            # ── Raw table ──
            _create_raw_table(
                cur,
                raw_schema,
                table_name,
                validated_columns,
            )
            # ── Transformed table ──
            _create_transformed_table(
                cur,
                transformed_schema,
                table_name,
                validated_columns,
                feature_columns,
            )
            # ── Indexes ──
            _create_indexes(
                cur,
                raw_schema,
                table_name,
                temporal_index,
                validated_group_by,
            )
            _create_indexes(
                cur,
                transformed_schema,
                table_name,
                temporal_index,
                validated_group_by,
            )

    await asyncio.to_thread(_sync_create)
    logger.info(
        "Created tables %s.%s and %s.%s",
        raw_schema,
        table_name,
        transformed_schema,
        table_name,
    )


def resolve_transformed_columns(
    columns: list[DatasetColumn],
    pipeline_config: dict,
) -> list[tuple[str, str]]:
    """Compute feature column names for the transformed table.

    For each TARGET or FEATURE column, generates:
    - {col}_normalized (if normalize enabled)
    - {col}_standardized (if standardize enabled)
    - {col}_minmax (if minmax enabled)
    - {col}_lag_{N} for each lag window
    - {col}_rolling_mean_{N} for each rolling window
    - {col}_rolling_std_{N} for each rolling window

    Returns list of (column_name, pg_type) tuples.
    """
    feature_cols: list[tuple[str, str]] = []

    # Extract pipeline defaults
    lags = pipeline_config.get("lags", [1, 7, 30])
    rolling_windows = pipeline_config.get("rolling_windows", [7])
    normalize = pipeline_config.get("normalize", False)
    standardize = pipeline_config.get("standardize", False)
    minmax = pipeline_config.get("minmax", False)

    for col in columns:
        if col.role not in (ColumnRole.TARGET, ColumnRole.FEATURE):
            continue

        col_name = col.name
        # Per-column overrides from rules_override
        overrides = col.rules_override or {}
        col_lags = overrides.get("lags", lags)
        col_rolling = overrides.get("rolling_windows", rolling_windows)
        col_normalize = overrides.get("normalize", normalize)
        col_standardize = overrides.get("standardize", standardize)
        col_minmax = overrides.get("minmax", minmax)

        # Normalization variants
        if col_normalize:
            feature_cols.append((f"{col_name}_normalized", "DOUBLE PRECISION"))
        if col_standardize:
            feature_cols.append((f"{col_name}_standardized", "DOUBLE PRECISION"))
        if col_minmax:
            feature_cols.append((f"{col_name}_minmax", "DOUBLE PRECISION"))

        # Lag features
        _dp = "DOUBLE PRECISION"
        feature_cols.extend((f"{col_name}_lag_{lag}", _dp) for lag in col_lags)

        # Rolling features
        for window in col_rolling:
            feature_cols.append((f"{col_name}_rolling_mean_{window}", _dp))
            feature_cols.append((f"{col_name}_rolling_std_{window}", _dp))

    return feature_cols


async def drop_client_schemas(org_slug: str) -> None:
    """Drop raw and transformed schemas for a client (RGPD erasure).

    This is a destructive operation — use with extreme caution.
    Only callable by admin/support roles.
    """
    validated_slug = validate_client_slug(org_slug)
    raw_schema = f"{validated_slug}_{settings.RAW_SCHEMA_SUFFIX}"
    transformed_schema = f"{validated_slug}_{settings.TRANSFORMED_SCHEMA_SUFFIX}"

    validate_schema_name(raw_schema)
    validate_schema_name(transformed_schema)

    def _sync_drop() -> None:
        with ddl_connection() as conn, conn.cursor() as cur:
            for schema_name in (transformed_schema, raw_schema):
                cur.execute(
                    sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                        sql.Identifier(schema_name)
                    )
                )
                logger.info("Dropped schema: %s", schema_name)

    await asyncio.to_thread(_sync_drop)


# ── Private helpers ──────────────────────────────────────


def _create_raw_table(
    cur: Any,
    schema: str,
    table_name: str,
    columns: list[tuple[str, str]],
) -> None:
    """Create a raw data table with system columns + dynamic columns.

    System columns:
    - _row_id: UUID PK with gen_random_uuid() default
    - _ingested_at: TIMESTAMPTZ NOT NULL DEFAULT now()
    - _batch_id: UUID nullable (links to ingestion_log.id)
    """
    # Build column definitions
    col_defs = [
        sql.SQL("{} UUID PRIMARY KEY DEFAULT gen_random_uuid()").format(
            sql.Identifier("_row_id")
        ),
        sql.SQL("{} TIMESTAMPTZ NOT NULL DEFAULT now()").format(
            sql.Identifier("_ingested_at")
        ),
        sql.SQL("{} UUID").format(sql.Identifier("_batch_id")),
    ]

    for col_name, pg_type in columns:
        col_defs.append(
            sql.SQL("{} {}").format(
                sql.Identifier(col_name),
                sql.SQL(pg_type),
            )
        )

    create_stmt = sql.SQL("CREATE TABLE IF NOT EXISTS {}.{} ({})").format(
        sql.Identifier(schema),
        sql.Identifier(table_name),
        sql.SQL(", ").join(col_defs),
    )
    cur.execute(create_stmt)


def _create_transformed_table(
    cur: Any,
    schema: str,
    table_name: str,
    original_columns: list[tuple[str, str]],
    feature_columns: list[tuple[str, str]],
) -> None:
    """Create a transformed data table with system + original + feature columns.

    System columns:
    - _row_id: UUID PK (same ID as raw table)
    - _transformed_at: TIMESTAMPTZ NOT NULL DEFAULT now()
    - _pipeline_version: INTEGER NOT NULL
    """
    col_defs = [
        sql.SQL("{} UUID PRIMARY KEY").format(sql.Identifier("_row_id")),
        sql.SQL("{} TIMESTAMPTZ NOT NULL DEFAULT now()").format(
            sql.Identifier("_transformed_at")
        ),
        sql.SQL("{} INTEGER NOT NULL").format(sql.Identifier("_pipeline_version")),
    ]

    # Original columns (temporal_index, group_by, etc.)
    for col_name, pg_type in original_columns:
        col_defs.append(
            sql.SQL("{} {}").format(
                sql.Identifier(col_name),
                sql.SQL(pg_type),
            )
        )

    # Feature columns (generated by resolve_transformed_columns)
    for col_name, pg_type in feature_columns:
        # Feature column names may contain suffixes like _lag_7 — validate each
        validate_identifier(col_name, field="feature_column")
        col_defs.append(
            sql.SQL("{} {}").format(
                sql.Identifier(col_name),
                sql.SQL(pg_type),
            )
        )

    create_stmt = sql.SQL("CREATE TABLE IF NOT EXISTS {}.{} ({})").format(
        sql.Identifier(schema),
        sql.Identifier(table_name),
        sql.SQL(", ").join(col_defs),
    )
    cur.execute(create_stmt)


def _create_indexes(
    cur: Any,
    schema: str,
    table_name: str,
    temporal_index: str,
    group_by: list[str],
) -> None:
    """Create indexes on temporal_index, group_by, and _ingested_at columns."""
    # Index on temporal_index column
    idx_name = f"ix_{table_name}_{temporal_index}"
    cur.execute(
        sql.SQL("CREATE INDEX IF NOT EXISTS {} ON {}.{} ({})").format(
            sql.Identifier(idx_name),
            sql.Identifier(schema),
            sql.Identifier(table_name),
            sql.Identifier(temporal_index),
        )
    )

    # Index on each group_by column
    for gb_col in group_by:
        idx_name = f"ix_{table_name}_{gb_col}"
        cur.execute(
            sql.SQL("CREATE INDEX IF NOT EXISTS {} ON {}.{} ({})").format(
                sql.Identifier(idx_name),
                sql.Identifier(schema),
                sql.Identifier(table_name),
                sql.Identifier(gb_col),
            )
        )

    # Index on _ingested_at (raw tables only — harmless if column doesn't exist)
    try:
        idx_name = f"ix_{table_name}_ingested_at"
        cur.execute(
            sql.SQL("CREATE INDEX IF NOT EXISTS {} ON {}.{} ({})").format(
                sql.Identifier(idx_name),
                sql.Identifier(schema),
                sql.Identifier(table_name),
                sql.Identifier("_ingested_at"),
            )
        )
    except Exception:
        pass
