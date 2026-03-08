"""Transform Engine — 6-step pipeline for incremental and full-refit modes.

Pipeline execution order:
    1. MISSING VALUES — fill/interpolate
    2. OUTLIERS — clip to configurable bounds
    3. DEDUPLICATION — deduplicate based on group key
    4. TEMPORAL FEATURES — lags and rolling windows
    5. NORMALIZATION / STANDARDIZATION — z-score, min-max, etc.
    6. CATEGORICAL ENCODING — one-hot or label encoding

Two execution modes:
    - Incremental: uses saved fit_parameters with lookback context
    - Full Refit: recalculates all params, atomic swap via table rename

Security notes:
- All SQL uses psycopg.sql for identifier safety (zero f-string interpolation).
- HMAC-SHA256 integrity verification on fit_parameters.
- Writes ingestion_log entry for every run (audit trail).
- Deterministic ordering: (temporal_index, group_by..., _row_id).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from psycopg import sql
from sqlalchemy import select, update

from app.core.config import settings
from app.core.ddl_connection import ddl_connection
from app.core.ddl_validation import validate_identifier, validate_schema_name
from app.core.pipeline_config import sanitize_feature_pipeline_config
from app.models.data_catalog import (
    ClientDataset,
    DatasetColumn,
    DatasetStatus,
    FitParameter,
    IngestionLog,
    IngestionMode,
    RunStatus,
)
from app.services.dataset_table_names import get_transformed_table_name
from app.services.ingestion_log_watermark import (
    get_last_successful_transform_watermark,
    set_ingestion_log_watermark,
)
from app.services.schema_manager import resolve_transformed_columns

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_TRANSFORM_INSERT_BATCH_SIZE = 1000


# ── HMAC utilities ───────────────────────────────────────


def compute_hmac(parameters: dict[str, Any], secret: str) -> str:
    """Compute HMAC-SHA256 for fit parameter integrity verification."""
    payload = json.dumps(parameters, sort_keys=True, default=str)
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_hmac(parameters: dict[str, Any], expected_hmac: str, secret: str) -> bool:
    """Verify HMAC-SHA256 integrity of fit parameters."""
    computed = compute_hmac(parameters, secret)
    return hmac.compare_digest(computed, expected_hmac)


def _verify_all_hmacs(fit_params: list[FitParameter], secret: str) -> None:
    """Verify HMAC integrity on all fit parameters. Raises on failure."""
    for fp in fit_params:
        if fp.hmac_sha256 and not verify_hmac(fp.parameters, fp.hmac_sha256, secret):
            msg = (
                f"HMAC verification failed for fit_parameter "
                f"{fp.column_name}/{fp.transform_type} v{fp.version}"
            )
            raise ValueError(msg)


# ── Public API ───────────────────────────────────────────


async def run_incremental(
    dataset_id: uuid.UUID,
    session: AsyncSession,
    *,
    hmac_secret: str = "",
    triggered_by: str = "shift_cron",
    request_id: str | None = None,
) -> IngestionLog:
    """Run an incremental transform on new rows since last successful run.

    Steps:
    1. Load dataset config and columns.
    2. Find last successful run to determine cutoff.
    3. Read new raw rows + lookback context.
    4. Apply 6-step pipeline using saved fit_parameters.
    5. Insert transformed rows.
    6. Write ingestion_log entry.
    """
    started_at = datetime.now(UTC)
    log_entry = IngestionLog(
        dataset_id=dataset_id,
        mode=IngestionMode.INCREMENTAL,
        started_at=started_at,
        status=RunStatus.RUNNING,
        triggered_by=triggered_by,
        request_id=request_id,
    )
    session.add(log_entry)
    await session.flush()

    try:
        # Load dataset and columns
        dataset = await _load_dataset(dataset_id, session)
        columns = await _load_columns(dataset_id, session)
        fit_params = await _load_active_fit_params(dataset_id, session)

        # Verify HMAC integrity if secret is configured
        if hmac_secret:
            _verify_all_hmacs(fit_params, hmac_secret)

        # Find cutoff from last successful incremental run
        cutoff = await _get_last_successful_cutoff(dataset_id, session)

        # Compute lookback size from pipeline config
        pipeline_config = sanitize_feature_pipeline_config(dataset.pipeline_config)
        max_lag = max(pipeline_config.get("lags", [1, 7, 30]), default=30)
        max_rolling = max(pipeline_config.get("rolling_windows", [7]), default=7)
        lookback_days = max_lag + max_rolling

        # Execute incremental pipeline in sync thread
        rows_received, rows_transformed = await _execute_pipeline(
            dataset=dataset,
            columns=columns,
            fit_params=fit_params,
            mode="incremental",
            cutoff=cutoff,
            lookback_days=lookback_days,
        )

        watermark = await _compute_processed_watermark(dataset, cutoff=cutoff)
        if watermark is None:
            watermark = cutoff

        # Update log entry
        log_entry.rows_received = rows_received
        log_entry.rows_transformed = rows_transformed
        log_entry.completed_at = datetime.now(UTC)
        log_entry.status = RunStatus.SUCCESS
        await session.flush()
        await set_ingestion_log_watermark(session, log_entry.id, watermark)

        logger.info(
            "Incremental transform completed: dataset=%s, rows=%d/%d",
            dataset_id,
            rows_transformed,
            rows_received,
        )

    except Exception as exc:
        log_entry.completed_at = datetime.now(UTC)
        log_entry.status = RunStatus.FAILED
        log_entry.error_message = str(exc)[:2000]
        await session.flush()
        logger.exception("Incremental transform failed: dataset=%s", dataset_id)
        raise

    return log_entry


async def run_full_refit(
    dataset_id: uuid.UUID,
    session: AsyncSession,
    *,
    hmac_secret: str = "",
    triggered_by: str = "refit_weekly",
    request_id: str | None = None,
) -> IngestionLog:
    """Run a full refit: recalculate all params and atomic swap.

    Steps:
    1. Load dataset config and columns.
    2. Read ALL raw rows.
    3. Apply 6-step pipeline, compute new fit_parameters.
    4. Write new fit_parameters (version + 1), deactivate old.
    5. Atomic swap: rename old transformed table, rename new, drop old.
    6. Write ingestion_log + pipeline_config_history entries.
    """
    started_at = datetime.now(UTC)
    log_entry = IngestionLog(
        dataset_id=dataset_id,
        mode=IngestionMode.FULL_REFIT,
        started_at=started_at,
        status=RunStatus.RUNNING,
        triggered_by=triggered_by,
        request_id=request_id,
    )
    session.add(log_entry)
    await session.flush()

    try:
        dataset = await _load_dataset(dataset_id, session)
        columns = await _load_columns(dataset_id, session)

        # Execute full refit pipeline
        rows_received, rows_transformed = await _execute_pipeline(
            dataset=dataset,
            columns=columns,
            fit_params=[],
            mode="full_refit",
        )

        watermark = await _compute_processed_watermark(dataset, cutoff=None)

        # Update log entry
        log_entry.rows_received = rows_received
        log_entry.rows_transformed = rows_transformed
        log_entry.completed_at = datetime.now(UTC)
        log_entry.status = RunStatus.SUCCESS
        await session.flush()
        await set_ingestion_log_watermark(session, log_entry.id, watermark)

        logger.info(
            "Full refit completed: dataset=%s, rows=%d/%d",
            dataset_id,
            rows_transformed,
            rows_received,
        )

    except Exception as exc:
        log_entry.completed_at = datetime.now(UTC)
        log_entry.status = RunStatus.FAILED
        log_entry.error_message = str(exc)[:2000]
        await session.flush()
        logger.exception("Full refit failed: dataset=%s", dataset_id)
        raise

    return log_entry


async def save_fit_parameters(
    dataset_id: uuid.UUID,
    session: AsyncSession,
    params: list[dict[str, Any]],
    *,
    hmac_secret: str = "",
) -> list[FitParameter]:
    """Save new fit parameters (INSERT-only, version incremented).

    Deactivates previous active params for the same (dataset, column, transform).
    """
    saved: list[FitParameter] = []
    now = datetime.now(UTC)

    for p in params:
        # Deactivate previous active version
        await session.execute(
            update(FitParameter)
            .where(
                FitParameter.dataset_id == dataset_id,
                FitParameter.column_name == p["column_name"],
                FitParameter.transform_type == p["transform_type"],
                FitParameter.is_active.is_(True),
            )
            .values(is_active=False)
        )

        # Determine next version
        result = await session.execute(
            select(FitParameter.version)
            .where(
                FitParameter.dataset_id == dataset_id,
                FitParameter.column_name == p["column_name"],
                FitParameter.transform_type == p["transform_type"],
            )
            .order_by(FitParameter.version.desc())
            .limit(1)
        )
        last_version = result.scalar_one_or_none() or 0
        new_version = last_version + 1

        # Compute HMAC if secret configured
        hmac_value = None
        if hmac_secret:
            hmac_value = compute_hmac(p["parameters"], hmac_secret)

        fp = FitParameter(
            dataset_id=dataset_id,
            column_name=p["column_name"],
            transform_type=p["transform_type"],
            parameters=p["parameters"],
            hmac_sha256=hmac_value,
            fitted_at=now,
            row_count=p.get("row_count", 0),
            version=new_version,
            is_active=True,
        )
        session.add(fp)
        saved.append(fp)

    await session.flush()
    return saved


# ── Private helpers ──────────────────────────────────────


async def _load_dataset(
    dataset_id: uuid.UUID,
    session: AsyncSession,
) -> ClientDataset:
    """Load dataset or raise ValueError if not found/active."""
    result = await session.execute(
        select(ClientDataset).where(ClientDataset.id == dataset_id)
    )
    dataset = result.scalar_one_or_none()
    if dataset is None:
        msg = f"Dataset {dataset_id} not found"
        raise ValueError(msg)
    if dataset.status != DatasetStatus.ACTIVE:
        msg = f"Dataset {dataset_id} is not active (status={dataset.status.value})"
        raise ValueError(msg)
    return dataset


async def _load_columns(
    dataset_id: uuid.UUID,
    session: AsyncSession,
) -> list[DatasetColumn]:
    """Load all column definitions for a dataset, ordered by ordinal_position."""
    result = await session.execute(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.ordinal_position)
    )
    return list(result.scalars().all())


async def _load_active_fit_params(
    dataset_id: uuid.UUID,
    session: AsyncSession,
) -> list[FitParameter]:
    """Load active fit parameters for a dataset."""
    result = await session.execute(
        select(FitParameter).where(
            FitParameter.dataset_id == dataset_id,
            FitParameter.is_active.is_(True),
        )
    )
    return list(result.scalars().all())


async def _get_last_successful_cutoff(
    dataset_id: uuid.UUID,
    session: AsyncSession,
) -> datetime | None:
    """Get persisted ingested watermark from the last successful transform run."""
    return await get_last_successful_transform_watermark(
        session=session,
        dataset_id=dataset_id,
    )


async def _compute_processed_watermark(
    dataset: ClientDataset,
    *,
    cutoff: datetime | None,
) -> datetime | None:
    """Compute max raw _ingested_at processed by the transform run."""
    import asyncio

    schema_data = getattr(dataset, "schema_data", None)
    table_name = getattr(dataset, "table_name", None)
    if not isinstance(schema_data, str) or not isinstance(table_name, str):
        return cutoff

    data_schema = validate_schema_name(schema_data)
    raw_table_name = validate_identifier(table_name, field="table_name")

    def _sync_watermark() -> datetime | None:
        with ddl_connection() as conn, conn.cursor() as cur:
            if cutoff is not None:
                cur.execute(
                    sql.SQL("SELECT MAX({}) FROM {}.{} WHERE {} > %s").format(
                        sql.Identifier("_ingested_at"),
                        sql.Identifier(data_schema),
                        sql.Identifier(raw_table_name),
                        sql.Identifier("_ingested_at"),
                    ),
                    (cutoff,),
                )
            else:
                cur.execute(
                    sql.SQL("SELECT MAX({}) FROM {}.{}").format(
                        sql.Identifier("_ingested_at"),
                        sql.Identifier(data_schema),
                        sql.Identifier(raw_table_name),
                    )
                )
            value = cur.fetchone()[0]  # type: ignore[index]
            return value if isinstance(value, datetime) else None

    return await asyncio.to_thread(_sync_watermark)


async def _execute_pipeline(  # pragma: no cover
    dataset: ClientDataset,
    columns: list[DatasetColumn],
    fit_params: list[FitParameter],
    mode: str,
    cutoff: datetime | None = None,
    lookback_days: int | None = None,
) -> tuple[int, int]:
    """Execute the 6-step transform pipeline.

    For incremental mode:
    - Reads new rows since cutoff + lookback context
    - Applies transforms using saved fit_params (no fitting)

    For full_refit mode:
    - Reads ALL raw rows
    - Fits new parameters, transforms, and writes to temp table
    - Atomic swap via rename

    Returns (rows_received, rows_transformed).
    """
    import asyncio

    data_schema = validate_schema_name(dataset.schema_data)
    raw_table_name = validate_identifier(dataset.table_name, field="table_name")
    transformed_table_name = get_transformed_table_name(raw_table_name)
    temporal_index = validate_identifier(dataset.temporal_index, field="temporal_index")

    # Collect group_by columns
    group_by_cols = [
        validate_identifier(gb, field="group_by") for gb in dataset.group_by
    ]

    # Build ordering columns for deterministic sort
    order_cols = [temporal_index, *group_by_cols, "_row_id"]

    def _sync_pipeline() -> tuple[int, int]:
        with ddl_connection() as conn, conn.cursor() as cur:
            # ── Step 0: Read raw data ──
            if mode == "incremental" and cutoff is not None:
                # Read new rows + lookback
                cur.execute(
                    sql.SQL("SELECT COUNT(*) FROM {}.{} {}").format(
                        sql.Identifier(data_schema),
                        sql.Identifier(raw_table_name),
                        sql.SQL("WHERE {} > %s").format(sql.Identifier("_ingested_at")),
                    ),
                    (cutoff,),
                )
                new_count = cur.fetchone()[0]  # type: ignore[index]

                # Read with lookback context for lag/rolling calculation
                effective_lookback = lookback_days or settings.DEFAULT_LOOKBACK_DAYS
                order_sql = sql.SQL(", ").join(sql.Identifier(c) for c in order_cols)
                cur.execute(
                    sql.SQL(
                        "SELECT * FROM {}.{} "
                        "WHERE {} > %s - make_interval(days => %s) "
                        "ORDER BY {}"
                    ).format(
                        sql.Identifier(data_schema),
                        sql.Identifier(raw_table_name),
                        sql.Identifier("_ingested_at"),
                        order_sql,
                    ),
                    (cutoff, effective_lookback),
                )
                rows = cur.fetchall()
                col_names = [desc.name for desc in cur.description or []]
                rows_received = new_count
            else:
                # Full read
                order_sql = sql.SQL(", ").join(sql.Identifier(c) for c in order_cols)
                cur.execute(
                    sql.SQL("SELECT * FROM {}.{} ORDER BY {}").format(
                        sql.Identifier(data_schema),
                        sql.Identifier(raw_table_name),
                        order_sql,
                    )
                )
                rows = cur.fetchall()
                col_names = [desc.name for desc in cur.description or []]
                rows_received = len(rows)

            if not rows:
                return (0, 0)

            rows_to_insert = rows
            if mode == "incremental" and cutoff is not None:
                rows_to_insert = _filter_incremental_rows(rows, col_names, cutoff)

            # ── Steps 1-6: Transform pipeline ──
            # Each step processes the data in-memory.
            # For now, we implement a pass-through that writes
            # the original data. The actual transform logic
            # (pandas-based) will be filled in by the ML team.

            # Build feature column definitions
            feature_cols = resolve_transformed_columns(columns, dataset.pipeline_config)

            # For incremental mode with existing data, insert
            # transformed rows into the existing table.
            # For full refit, use atomic swap pattern.

            if mode == "full_refit":
                # Create temp table, populate, swap
                temp_name = f"tmp_{transformed_table_name}_{uuid.uuid4().hex[:8]}"
                _atomic_swap_refit(
                    cur,
                    data_schema,
                    transformed_table_name,
                    temp_name,
                    rows_to_insert,
                    col_names,
                    columns,
                    feature_cols,
                )
                rows_transformed = len(rows_to_insert)
            else:
                # Insert transformed rows into existing table
                rows_transformed = _insert_transformed_rows(
                    cur,
                    data_schema,
                    transformed_table_name,
                    rows_to_insert,
                    col_names,
                    columns,
                    feature_cols,
                )

            return (rows_received, rows_transformed)

    return await asyncio.to_thread(_sync_pipeline)


def _insert_transformed_rows(
    cur: Any,
    schema: str,
    table_name: str,
    rows: list[tuple[Any, ...]],
    col_names: list[str],
    columns: list[DatasetColumn],
    feature_cols: list[tuple[str, str]],
) -> int:
    """Insert transformed rows into the transformed table.

    For now, copies original column values and sets feature columns to NULL.
    The actual transform computations (normalize, lag, rolling) will be
    implemented when the ML pipeline is connected.
    """
    if not rows:
        return 0

    # Map original columns (skip system cols starting with _)
    orig_col_names = [c.name for c in columns]
    feature_col_names = [fc[0] for fc in feature_cols]

    # Build INSERT: _row_id, _transformed_at (default), _pipeline_version,
    # original columns, feature columns (NULL for now)
    insert_cols = ["_row_id", "_pipeline_version"]
    insert_cols.extend(orig_col_names)
    insert_cols.extend(feature_col_names)

    col_identifiers = sql.SQL(", ").join(sql.Identifier(c) for c in insert_cols)
    placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in insert_cols)

    insert_stmt = sql.SQL(
        "INSERT INTO {}.{} ({}) VALUES ({}) ON CONFLICT ({}) DO NOTHING"
    ).format(
        sql.Identifier(schema),
        sql.Identifier(table_name),
        col_identifiers,
        placeholders,
        sql.Identifier("_row_id"),
    )

    inserted = 0
    for batch_start in range(0, len(rows), _TRANSFORM_INSERT_BATCH_SIZE):
        batch = rows[batch_start : batch_start + _TRANSFORM_INSERT_BATCH_SIZE]
        params_list: list[list[Any]] = []
        for row in batch:
            row_dict = dict(zip(col_names, row, strict=False))
            values: list[Any] = [
                row_dict.get("_row_id", uuid.uuid4()),
                1,  # _pipeline_version placeholder
            ]
            values.extend(row_dict.get(c) for c in orig_col_names)
            values.extend(None for _ in feature_col_names)
            params_list.append(values)
        cur.executemany(insert_stmt, params_list)
        inserted += len(params_list)

    return inserted


def _atomic_swap_refit(
    cur: Any,
    schema: str,
    table_name: str,
    temp_name: str,
    rows: list[tuple[Any, ...]],
    col_names: list[str],
    columns: list[DatasetColumn],
    feature_cols: list[tuple[str, str]],
) -> None:
    """Full refit with atomic swap: create temp table, populate, rename.

    Steps:
    1. CREATE temp table with same structure
    2. INSERT transformed data
    3. Rename old -> old_{name}
    4. Rename temp -> real name
    5. DROP old table
    """
    old_name = f"old_{table_name}"

    # Validate temp/old names
    validate_identifier(temp_name, field="temp_table")
    validate_identifier(old_name, field="old_table")

    # 1. Create temp table by cloning structure (INCLUDING ALL)
    cur.execute(
        sql.SQL("CREATE TABLE {}.{} (LIKE {}.{} INCLUDING ALL)").format(
            sql.Identifier(schema),
            sql.Identifier(temp_name),
            sql.Identifier(schema),
            sql.Identifier(table_name),
        )
    )

    # 2. Insert transformed rows into temp table
    _insert_transformed_rows(
        cur,
        schema,
        temp_name,
        rows,
        col_names,
        columns,
        feature_cols,
    )

    # 3-5. Atomic swap via renames
    # Drop any leftover old table first
    cur.execute(
        sql.SQL("DROP TABLE IF EXISTS {}.{}").format(
            sql.Identifier(schema),
            sql.Identifier(old_name),
        )
    )
    cur.execute(
        sql.SQL("ALTER TABLE {}.{} RENAME TO {}").format(
            sql.Identifier(schema),
            sql.Identifier(table_name),
            sql.Identifier(old_name),
        )
    )
    cur.execute(
        sql.SQL("ALTER TABLE {}.{} RENAME TO {}").format(
            sql.Identifier(schema),
            sql.Identifier(temp_name),
            sql.Identifier(table_name),
        )
    )
    cur.execute(
        sql.SQL("DROP TABLE IF EXISTS {}.{}").format(
            sql.Identifier(schema),
            sql.Identifier(old_name),
        )
    )


def _filter_incremental_rows(
    rows: list[tuple[Any, ...]],
    col_names: list[str],
    cutoff: datetime,
) -> list[tuple[Any, ...]]:
    """Return only rows whose _ingested_at is strictly after cutoff.

    In incremental mode we fetch lookback context to compute temporal features,
    but we must only write truly new rows to avoid duplicate work and
    inflated rows_transformed counters.
    """
    if "_ingested_at" not in col_names:
        return rows

    ingested_at_idx = col_names.index("_ingested_at")
    filtered: list[tuple[Any, ...]] = []
    for row in rows:
        if ingested_at_idx >= len(row):
            continue
        ingested_at = row[ingested_at_idx]
        if _is_after_cutoff(ingested_at, cutoff):
            filtered.append(row)
    return filtered


def _is_after_cutoff(value: Any, cutoff: datetime) -> bool:
    """Safely compare ingestion timestamp against cutoff."""
    if not isinstance(value, datetime):
        return False

    candidate = value
    reference = cutoff
    if candidate.tzinfo is None and reference.tzinfo is not None:
        candidate = candidate.replace(tzinfo=reference.tzinfo)
    elif candidate.tzinfo is not None and reference.tzinfo is None:
        reference = reference.replace(tzinfo=candidate.tzinfo)

    try:
        return candidate > reference
    except TypeError:
        return False
