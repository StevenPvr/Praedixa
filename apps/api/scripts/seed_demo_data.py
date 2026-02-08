"""Seed demo data for development — creates datasets, columns, and ingestion logs.

Usage:
    cd apps/api
    .venv/bin/python -m scripts.seed_demo_data

This script:
1. Finds the first organization in the DB (or creates a demo one).
2. Creates 4 realistic datasets with column definitions.
3. Creates ingestion log entries so row_count / last_ingestion_at are populated.
4. Is idempotent: skips datasets that already exist (matched by name + org_id).
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select, text

from app.core.database import async_session_factory, engine
from app.models.data_catalog import (
    ClientDataset,
    ColumnDtype,
    ColumnRole,
    DatasetColumn,
    DatasetStatus,
    IngestionLog,
    IngestionMode,
    RunStatus,
)
from app.models.organization import Organization, OrganizationStatus, SubscriptionPlan

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

# ── Demo dataset definitions ─────────────────────────────

DEMO_DATASETS = [
    {
        "name": "effectifs",
        "table_name": "effectifs",
        "temporal_index": "date_mois",
        "group_by": ["site", "departement"],
        "pipeline_config": {"data_quality": {"dedup_enabled": True}},
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("effectif_total", ColumnDtype.INTEGER, ColumnRole.TARGET),
            ("effectif_cdi", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("effectif_cdd", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("effectif_interim", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_feminisation", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
        "ingestion_rows": 2400,
    },
    {
        "name": "absences",
        "table_name": "absences",
        "temporal_index": "date_mois",
        "group_by": ["site"],
        "pipeline_config": {
            "data_quality": {"dedup_enabled": True, "outlier_method": "iqr"}
        },
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("absences_maladie", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_conges", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_rtt", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("absences_autre", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_absenteisme", ColumnDtype.FLOAT, ColumnRole.TARGET),
        ],
        "ingestion_rows": 1800,
    },
    {
        "name": "turnover",
        "table_name": "turnover",
        "temporal_index": "date_mois",
        "group_by": ["departement"],
        "pipeline_config": {"data_quality": {"dedup_enabled": True}},
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("departement", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("entrees", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("sorties", ColumnDtype.INTEGER, ColumnRole.FEATURE),
            ("taux_turnover", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("anciennete_moyenne", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
        "ingestion_rows": 960,
    },
    {
        "name": "masse_salariale",
        "table_name": "masse_salariale",
        "temporal_index": "date_mois",
        "group_by": ["site", "categorie"],
        "pipeline_config": {},
        "columns": [
            ("date_mois", ColumnDtype.DATE, ColumnRole.TEMPORAL_INDEX),
            ("site", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("categorie", ColumnDtype.CATEGORY, ColumnRole.GROUP_BY),
            ("salaire_brut_total", ColumnDtype.FLOAT, ColumnRole.TARGET),
            ("charges_patronales", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("primes", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("heures_sup", ColumnDtype.FLOAT, ColumnRole.FEATURE),
            ("cout_total", ColumnDtype.FLOAT, ColumnRole.FEATURE),
        ],
        "ingestion_rows": 3200,
    },
]


async def _get_or_create_org(session: AsyncSession) -> Organization:
    """Find the first organization or create a demo one."""
    result = await session.execute(select(Organization).limit(1))
    org = result.scalar_one_or_none()

    if org is not None:
        return org

    org = Organization(
        id=uuid.uuid4(),
        name="Acme Corp (Demo)",
        slug="acme-demo",
        legal_name="Acme Corp SAS",
        siret="12345678901234",
        status=OrganizationStatus.ACTIVE,
        plan=SubscriptionPlan.PROFESSIONAL,
        contact_email="admin@acme-demo.fr",
        settings={},
    )
    session.add(org)
    await session.flush()
    return org


async def _seed_dataset(
    session: AsyncSession,
    org: Organization,
    definition: dict,
) -> bool:
    """Seed a single dataset. Returns True if created, False if skipped."""
    name = definition["name"]

    # Check idempotency
    existing = await session.execute(
        select(ClientDataset).where(
            ClientDataset.organization_id == org.id,
            ClientDataset.name == name,
        )
    )
    if existing.scalar_one_or_none() is not None:
        return False

    # Create dataset
    org_slug = org.slug.replace("-", "_")
    dataset = ClientDataset(
        id=uuid.uuid4(),
        organization_id=org.id,
        name=name,
        schema_data=f"{org_slug}_data",
        table_name=definition["table_name"],
        temporal_index=definition["temporal_index"],
        group_by=definition["group_by"],
        pipeline_config=definition["pipeline_config"],
        status=DatasetStatus.ACTIVE,
        metadata_hash=None,
    )
    session.add(dataset)
    await session.flush()

    # Create columns
    for i, (col_name, dtype, role) in enumerate(definition["columns"]):
        col = DatasetColumn(
            id=uuid.uuid4(),
            dataset_id=dataset.id,
            name=col_name,
            dtype=dtype,
            role=role,
            nullable=(role not in {ColumnRole.TEMPORAL_INDEX, ColumnRole.GROUP_BY}),
            rules_override=None,
            ordinal_position=i,
        )
        session.add(col)

    # Create ingestion log entries (2 successful + 1 failed for realism)
    now = datetime.now(UTC)
    rows = definition["ingestion_rows"]

    # First ingestion — 30 days ago
    log1 = IngestionLog(
        id=uuid.uuid4(),
        dataset_id=dataset.id,
        mode=IngestionMode.FILE_UPLOAD,
        rows_received=rows,
        rows_transformed=rows - 12,
        started_at=now - timedelta(days=30),
        completed_at=now - timedelta(days=30) + timedelta(seconds=45),
        status=RunStatus.SUCCESS,
        triggered_by="seed",
        file_name=f"{name}_initial.xlsx",
        file_size=rows * 120,
    )
    session.add(log1)

    # Failed ingestion — 15 days ago
    log2 = IngestionLog(
        id=uuid.uuid4(),
        dataset_id=dataset.id,
        mode=IngestionMode.FILE_UPLOAD,
        rows_received=0,
        rows_transformed=0,
        started_at=now - timedelta(days=15),
        completed_at=now - timedelta(days=15) + timedelta(seconds=2),
        status=RunStatus.FAILED,
        error_message="Encoding error: invalid UTF-8 at byte 1024",
        triggered_by="seed",
        file_name=f"{name}_update_bad.csv",
        file_size=5000,
    )
    session.add(log2)

    # Latest successful ingestion — 3 days ago
    extra_rows = rows // 4
    log3 = IngestionLog(
        id=uuid.uuid4(),
        dataset_id=dataset.id,
        mode=IngestionMode.FILE_UPLOAD,
        rows_received=extra_rows,
        rows_transformed=extra_rows,
        started_at=now - timedelta(days=3),
        completed_at=now - timedelta(days=3) + timedelta(seconds=18),
        status=RunStatus.SUCCESS,
        triggered_by="seed",
        file_name=f"{name}_update.csv",
        file_size=extra_rows * 80,
    )
    session.add(log3)

    await session.flush()
    len(definition["columns"])
    (rows - 12) + extra_rows
    return True


async def main() -> None:
    """Seed demo data into the database."""

    async with async_session_factory() as session:
        # Verify tables exist
        try:
            await session.execute(text("SELECT 1 FROM organizations LIMIT 0"))
        except Exception:
            return

        org = await _get_or_create_org(session)

        created = 0
        for definition in DEMO_DATASETS:
            if await _seed_dataset(session, org, definition):
                created += 1

        await session.commit()

    await engine.dispose()

    if created > 0:
        pass
    else:
        pass


if __name__ == "__main__":
    asyncio.run(main())
