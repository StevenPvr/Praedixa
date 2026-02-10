"""Canonical data service — CRUD and analytics for unified charge/capacity records.

Security:
- All queries are scoped by TenantFilter (organization_id isolation).
- Bulk import uses dedup by (org_id, site_id, date, shift, competence)
  via the unique constraint — duplicates are skipped, never overwritten.
- No raw SQL — SQLAlchemy ORM queries only.
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.exceptions import NotFoundError
from app.models.operational import CanonicalRecord, ShiftType

if TYPE_CHECKING:
    from datetime import date

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter

_POSTGRES_MAX_BIND_PARAMS = 65_535
_DEFAULT_BULK_IMPORT_BATCH_SIZE = 1000


async def list_canonical_records(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    shift: ShiftType | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[CanonicalRecord], int]:
    """List canonical records with filters and pagination.

    Tenant isolation: mandatory WHERE on organization_id via TenantFilter.
    Returns (items, total_count). Ordered by date DESC, shift.
    """
    base = tenant.apply(select(CanonicalRecord), CanonicalRecord)
    count_q = tenant.apply(select(func.count(CanonicalRecord.id)), CanonicalRecord)

    if site_id is not None:
        base = base.where(CanonicalRecord.site_id == site_id)
        count_q = count_q.where(CanonicalRecord.site_id == site_id)

    if date_from is not None:
        base = base.where(CanonicalRecord.date >= date_from)
        count_q = count_q.where(CanonicalRecord.date >= date_from)

    if date_to is not None:
        base = base.where(CanonicalRecord.date <= date_to)
        count_q = count_q.where(CanonicalRecord.date <= date_to)

    if shift is not None:
        base = base.where(CanonicalRecord.shift == shift)
        count_q = count_q.where(CanonicalRecord.shift == shift)

    total = (await session.execute(count_q)).scalar_one() or 0

    offset = (page - 1) * page_size
    query = (
        base.order_by(CanonicalRecord.date.desc(), CanonicalRecord.shift)
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_canonical_record(
    session: AsyncSession,
    tenant: TenantFilter,
    record_id: uuid.UUID,
) -> CanonicalRecord:
    """Get a single canonical record by ID.

    Tenant isolation: TenantFilter on query. Raises NotFoundError if missing
    or belongs to another organization (IDOR prevention).
    """
    query = tenant.apply(
        select(CanonicalRecord).where(CanonicalRecord.id == record_id),
        CanonicalRecord,
    )
    result = await session.execute(query)
    record: CanonicalRecord | None = result.scalar_one_or_none()

    if record is None:
        raise NotFoundError("CanonicalRecord", str(record_id))

    return record


async def create_canonical_record(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    site_id: str,
    date: date,
    shift: ShiftType,
    capacite_plan_h: Decimal,
    competence: str | None = None,
    charge_units: Decimal | None = None,
    realise_h: Decimal | None = None,
    abs_h: Decimal = Decimal("0"),
    hs_h: Decimal = Decimal("0"),
    interim_h: Decimal = Decimal("0"),
    cout_interne_est: Decimal | None = None,
) -> CanonicalRecord:
    """Create a single canonical record.

    Tenant isolation: organization_id is set from TenantFilter, never from client.
    """
    org_id = uuid.UUID(tenant.organization_id)
    record = CanonicalRecord(
        organization_id=org_id,
        site_id=site_id,
        date=date,
        shift=shift,
        competence=competence,
        charge_units=charge_units,
        capacite_plan_h=capacite_plan_h,
        realise_h=realise_h,
        abs_h=abs_h,
        hs_h=hs_h,
        interim_h=interim_h,
        cout_interne_est=cout_interne_est,
    )
    session.add(record)
    await session.flush()
    return record


async def bulk_import_canonical(
    session: AsyncSession,
    tenant: TenantFilter,
    records: list[dict[str, object]],
) -> tuple[int, int]:
    """Bulk import canonical records. Returns (inserted, skipped_duplicates).

    Tenant isolation: organization_id is injected from TenantFilter into every row.
    Dedup by unique constraint (org_id, site_id, date, shift, competence) using
    ON CONFLICT DO NOTHING — existing rows are never overwritten.
    """
    if not records:
        return 0, 0

    org_id = uuid.UUID(tenant.organization_id)
    total_rows = len(records)
    inserted_total = 0
    chunk: list[dict[str, object]] = []
    effective_chunk_size: int | None = None

    for rec in records:
        row = _build_canonical_row(rec, org_id)
        if effective_chunk_size is None:
            row_columns = len(row)
            max_rows_per_stmt = max(1, _POSTGRES_MAX_BIND_PARAMS // row_columns)
            effective_chunk_size = min(
                _DEFAULT_BULK_IMPORT_BATCH_SIZE, max_rows_per_stmt
            )
        chunk.append(row)
        if len(chunk) >= (effective_chunk_size or _DEFAULT_BULK_IMPORT_BATCH_SIZE):
            inserted_total += await _insert_canonical_chunk(session, chunk)
            chunk.clear()

    if chunk:
        inserted_total += await _insert_canonical_chunk(session, chunk)

    skipped = total_rows - inserted_total
    return inserted_total, skipped


def _build_canonical_row(
    rec: dict[str, object], org_id: uuid.UUID
) -> dict[str, object]:
    return {
        "id": uuid.uuid4(),
        "organization_id": org_id,
        "site_id": rec["site_id"],
        "date": rec["date"],
        "shift": rec["shift"],
        "competence": rec.get("competence"),
        "charge_units": rec.get("charge_units"),
        "capacite_plan_h": rec["capacite_plan_h"],
        "realise_h": rec.get("realise_h"),
        "abs_h": rec.get("abs_h", Decimal("0")),
        "hs_h": rec.get("hs_h", Decimal("0")),
        "interim_h": rec.get("interim_h", Decimal("0")),
        "cout_interne_est": rec.get("cout_interne_est"),
    }


async def _insert_canonical_chunk(
    session: AsyncSession, rows: list[dict[str, object]]
) -> int:
    stmt = pg_insert(CanonicalRecord).values(rows)
    stmt = stmt.on_conflict_do_nothing(constraint="uq_canonical_record")
    result = await session.execute(stmt)
    rowcount: int = result.rowcount  # type: ignore[attr-defined]
    return int(rowcount or 0)


async def get_quality_dashboard(
    session: AsyncSession,
    tenant: TenantFilter,
) -> dict[str, object]:
    """Return quality metrics for canonical data coverage.

    Tenant isolation: all queries scoped by TenantFilter.

    Metrics:
    - total_records: count of all records
    - coverage_pct: percentage of shifts with realise_h filled
    - sites: number of distinct sites
    - date_range: [min_date, max_date] as ISO strings
    - missing_shifts_pct: percentage of records without realise_h
    - avg_abs_pct: average absence ratio (abs_h / capacite_plan_h)
    """
    # Total records
    count_q = tenant.apply(select(func.count(CanonicalRecord.id)), CanonicalRecord)
    total = (await session.execute(count_q)).scalar_one() or 0

    if total == 0:
        return {
            "total_records": 0,
            "coverage_pct": Decimal("0"),
            "sites": 0,
            "date_range": [],
            "missing_shifts_pct": Decimal("0"),
            "avg_abs_pct": Decimal("0"),
        }

    # Distinct sites
    sites_q = tenant.apply(
        select(func.count(func.distinct(CanonicalRecord.site_id))),
        CanonicalRecord,
    )
    sites = (await session.execute(sites_q)).scalar_one() or 0

    # Date range
    range_q = tenant.apply(
        select(
            func.min(CanonicalRecord.date),
            func.max(CanonicalRecord.date),
        ),
        CanonicalRecord,
    )
    range_result = (await session.execute(range_q)).one()
    date_range = []
    if range_result[0] is not None:
        date_range = [range_result[0].isoformat(), range_result[1].isoformat()]

    # Coverage: records with realise_h not null
    filled_q = tenant.apply(
        select(func.count(CanonicalRecord.id)).where(
            CanonicalRecord.realise_h.isnot(None)
        ),
        CanonicalRecord,
    )
    filled = (await session.execute(filled_q)).scalar_one() or 0
    coverage_pct = Decimal(str(round(filled / total * 100, 2)))
    missing_shifts_pct = Decimal(str(round((total - filled) / total * 100, 2)))

    # Average absence percentage
    abs_q = tenant.apply(
        select(
            func.avg(
                CanonicalRecord.abs_h
                / func.nullif(CanonicalRecord.capacite_plan_h, 0)
                * 100
            )
        ),
        CanonicalRecord,
    )
    avg_abs_raw = (await session.execute(abs_q)).scalar_one()
    avg_abs_pct = Decimal(str(round(float(avg_abs_raw or 0), 2)))

    return {
        "total_records": total,
        "coverage_pct": coverage_pct,
        "sites": sites,
        "date_range": date_range,
        "missing_shifts_pct": missing_shifts_pct,
        "avg_abs_pct": avg_abs_pct,
    }
