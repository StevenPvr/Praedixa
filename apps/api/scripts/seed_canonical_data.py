"""Seed canonical data into the database.

Reads the generated CSV files from data/canonical/ and inserts them
into the CanonicalRecord and CostParameter ORM tables.

Usage:
    cd apps/api
    uv run python scripts/seed_canonical_data.py --org-id <uuid>

Prerequisites:
    1. Run Alembic migrations:  uv run alembic upgrade head
    2. Generate canonical CSV:  python ../../scripts/generate_canonical_data.py
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING

from sqlalchemy import select, text

from app.core.database import async_session_factory, engine
from app.models.operational import CanonicalRecord, CostParameter, ShiftType

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

# ── Paths ─────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = ROOT / "data" / "canonical"

CHUNK_SIZE = 500


def _parse_date(s: str) -> date:
    """Parse ISO date string."""
    return date.fromisoformat(s)


def _parse_float(s: str) -> float:
    """Parse float, default 0.0 for empty strings."""
    if not s:
        return 0.0
    return float(s)


def _parse_shift(s: str) -> ShiftType:
    """Map CSV shift string to ShiftType enum."""
    return ShiftType.AM if s == "AM" else ShiftType.PM


async def _seed_canonical_records(session: AsyncSession, org_id: uuid.UUID) -> int:
    """Insert canonical_records.csv, skipping duplicates."""
    csv_path = DATA_DIR / "canonical_records.csv"
    if not csv_path.exists():
        return 0

    # Check for existing records to support idempotency
    existing_count_result = await session.execute(
        select(CanonicalRecord.id)
        .where(
            CanonicalRecord.organization_id == org_id,
        )
        .limit(1)
    )
    if existing_count_result.scalar_one_or_none() is not None:
        return 0

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    len(rows)
    inserted = 0
    batch: list[CanonicalRecord] = []

    for row in rows:
        record = CanonicalRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            site_id=row["site_id"],
            date=_parse_date(row["date"]),
            shift=_parse_shift(row["shift"]),
            competence=row["competence"] if row["competence"] else None,
            charge_units=round(_parse_float(row["charge_units"])),
            capacite_plan_h=Decimal(
                str(round(_parse_float(row["capacite_plan_h"]), 1))
            ),
            realise_h=Decimal(str(round(_parse_float(row["realise_h"]), 1))),
            abs_h=Decimal(str(round(_parse_float(row["abs_h"]), 1))),
            hs_h=Decimal(str(round(_parse_float(row["hs_h"]), 1))),
            interim_h=Decimal(str(round(_parse_float(row["interim_h"]), 1))),
            cout_interne_est=Decimal(
                str(round(_parse_float(row["cout_interne_est"]), 2))
            ),
        )
        batch.append(record)

        if len(batch) >= CHUNK_SIZE:
            session.add_all(batch)
            await session.flush()
            inserted += len(batch)
            batch = []

    if batch:
        session.add_all(batch)
        await session.flush()
        inserted += len(batch)

    return inserted


async def _seed_cost_parameters(session: AsyncSession, org_id: uuid.UUID) -> int:
    """Insert cost_parameters.csv, skipping duplicates."""
    csv_path = DATA_DIR / "cost_parameters.csv"
    if not csv_path.exists():
        return 0

    # Idempotency check
    existing = await session.execute(
        select(CostParameter.id)
        .where(
            CostParameter.organization_id == org_id,
        )
        .limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        return 0

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        param = CostParameter(
            id=uuid.uuid4(),
            organization_id=org_id,
            site_id=row["site_id"] or None,
            version=int(row["version"]),
            c_int=Decimal(row["c_int"]),
            maj_hs=Decimal(row["maj_hs"]),
            c_interim=Decimal(row["c_interim"]),
            premium_urgence=Decimal(row["premium_urgence"]),
            c_backlog=Decimal(row["c_backlog"]),
            cap_hs_shift=int(row["cap_hs_shift"]),
            cap_interim_site=int(row["cap_interim_site"]),
            lead_time_jours=int(row["lead_time_jours"]),
            effective_from=_parse_date(row["effective_from"]),
            effective_until=(
                _parse_date(row["effective_until"]) if row["effective_until"] else None
            ),
        )
        session.add(param)

    await session.flush()
    return len(rows)


async def main(org_id: uuid.UUID) -> None:
    """Seed canonical data for a given organization."""

    async with async_session_factory() as session:
        # Verify tables exist
        try:
            await session.execute(text("SELECT 1 FROM canonical_records LIMIT 0"))
        except Exception:
            return

        records_count = await _seed_canonical_records(session, org_id)
        costs_count = await _seed_cost_parameters(session, org_id)

        await session.commit()

    await engine.dispose()

    if records_count > 0 or costs_count > 0:
        pass
    else:
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed canonical data into the database"
    )
    parser.add_argument(
        "--org-id",
        required=True,
        type=uuid.UUID,
        help="Organization UUID to associate data with",
    )
    args = parser.parse_args()
    asyncio.run(main(args.org_id))
