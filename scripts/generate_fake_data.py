"""Synthetic data generator for the Data Foundation.

Generates fake organizations, datasets, columns, ingestion logs,
and fit parameters for development and testing. Uses only ORM models
(no raw SQL) and follows the same async session pattern as seed_demo_data.py.

Usage:
    cd apps/api
    python -m scripts.generate_fake_data

Security notes:
- ALL data is synthetic. No real HR data or PII.
- This script is for development/demo ONLY.
- Must NOT be deployed or accessible in production environments.
- Idempotent: Skips if organizations with target slugs already exist.
"""

import asyncio
import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.data_catalog import (
    ClientDataset,
    ColumnDtype,
    ColumnRole,
    DatasetColumn,
    DatasetStatus,
    FitParameter,
    IngestionLog,
    IngestionMode,
    PipelineConfigHistory,
    RunStatus,
)
from app.models.organization import (
    IndustrySector,
    Organization,
    OrganizationSize,
    OrganizationStatus,
    SubscriptionPlan,
)
from app.models.user import User, UserRole, UserStatus

# ── Fixed UUIDs for reproducibility ─────────────────────────

ORG_ALPHA_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")
ORG_BETA_ID = uuid.UUID("a0000000-0000-0000-0000-000000000002")

USER_ALPHA_ADMIN_ID = uuid.UUID("b0000000-0000-0000-0000-000000000001")
USER_BETA_ADMIN_ID = uuid.UUID("b0000000-0000-0000-0000-000000000002")

ORG_SLUGS = ["alpha-transport", "beta-warehousing"]

# Seeded RNG for deterministic output
rng = random.Random(2026)  # noqa: S311


# ── Column templates by dataset type ────────────────────────

DATASET_TEMPLATES: dict[str, list[dict]] = {
    "effectifs": [
        {"name": "date_pointage", "dtype": ColumnDtype.DATE, "role": ColumnRole.TEMPORAL_INDEX},
        {"name": "site_code", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "departement", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "employee_id", "dtype": ColumnDtype.TEXT, "role": ColumnRole.ID},
        {"name": "poste", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.FEATURE},
        {"name": "contrat_type", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.FEATURE},
        {"name": "heures_planifiees", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "heures_realisees", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "heures_sup", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "absent", "dtype": ColumnDtype.BOOLEAN, "role": ColumnRole.FEATURE},
        {"name": "motif_absence", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.FEATURE, "nullable": True},
        {"name": "competences", "dtype": ColumnDtype.TEXT, "role": ColumnRole.META, "nullable": True},
        {"name": "anciennete_mois", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "taux_couverture", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.TARGET},
    ],
    "volumes": [
        {"name": "date_expedition", "dtype": ColumnDtype.DATE, "role": ColumnRole.TEMPORAL_INDEX},
        {"name": "site_code", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "zone_expedition", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "shipment_id", "dtype": ColumnDtype.TEXT, "role": ColumnRole.ID},
        {"name": "nb_colis", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "poids_total_kg", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "volume_m3", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "nb_palettes", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "priorite", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.FEATURE},
        {"name": "delai_heures", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "client_type", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.FEATURE},
        {"name": "retard", "dtype": ColumnDtype.BOOLEAN, "role": ColumnRole.FEATURE},
        {"name": "capacite_utilisee_pct", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.TARGET},
    ],
    "temperatures": [
        {"name": "date_releve", "dtype": ColumnDtype.DATE, "role": ColumnRole.TEMPORAL_INDEX},
        {"name": "site_code", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "zone_stockage", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "releve_id", "dtype": ColumnDtype.TEXT, "role": ColumnRole.ID},
        {"name": "temperature_min", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "temperature_max", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "temperature_moy", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "humidite_pct", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "seuil_alerte_depasse", "dtype": ColumnDtype.BOOLEAN, "role": ColumnRole.FEATURE},
        {"name": "nb_ouvertures_porte", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "duree_hors_plage_min", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.TARGET},
    ],
    "absences": [
        {"name": "date_debut", "dtype": ColumnDtype.DATE, "role": ColumnRole.TEMPORAL_INDEX},
        {"name": "site_code", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "departement", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "absence_id", "dtype": ColumnDtype.TEXT, "role": ColumnRole.ID},
        {"name": "employee_id", "dtype": ColumnDtype.TEXT, "role": ColumnRole.FEATURE},
        {"name": "motif", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.FEATURE},
        {"name": "duree_jours", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "prevu", "dtype": ColumnDtype.BOOLEAN, "role": ColumnRole.FEATURE},
        {"name": "remplace", "dtype": ColumnDtype.BOOLEAN, "role": ColumnRole.FEATURE},
        {"name": "impact_couverture_pct", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.TARGET},
    ],
    "planning": [
        {"name": "date_shift", "dtype": ColumnDtype.DATE, "role": ColumnRole.TEMPORAL_INDEX},
        {"name": "site_code", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "shift_type", "dtype": ColumnDtype.CATEGORY, "role": ColumnRole.GROUP_BY},
        {"name": "planning_id", "dtype": ColumnDtype.TEXT, "role": ColumnRole.ID},
        {"name": "nb_postes_ouverts", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "nb_postes_pourvus", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "nb_interim", "dtype": ColumnDtype.INTEGER, "role": ColumnRole.FEATURE},
        {"name": "nb_heures_sup", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "charge_prevue_palettes", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.FEATURE},
        {"name": "taux_remplissage_pct", "dtype": ColumnDtype.FLOAT, "role": ColumnRole.TARGET},
    ],
}

# Each org gets a random subset of 3-5 dataset types
TRANSFORM_TYPES = ["zscore", "minmax", "log1p", "lag_7d", "rolling_mean_14d", "one_hot"]


def _build_organizations() -> list[Organization]:
    return [
        Organization(
            id=ORG_ALPHA_ID,
            name="Alpha Transport",
            slug="alpha-transport",
            legal_name="Alpha Transport SARL",
            siret="98765432101234",
            sector=IndustrySector.LOGISTICS,
            size=OrganizationSize.LARGE,
            headcount=450,
            status=OrganizationStatus.TRIAL,
            plan=SubscriptionPlan.PROFESSIONAL,
            timezone="Europe/Paris",
            locale="fr-FR",
            currency="EUR",
            contact_email="contact@alpha-transport.com",
            settings={"workingDays": {
                "monday": True, "tuesday": True, "wednesday": True,
                "thursday": True, "friday": True, "saturday": True, "sunday": False,
            }},
        ),
        Organization(
            id=ORG_BETA_ID,
            name="Beta Warehousing",
            slug="beta-warehousing",
            legal_name="Beta Warehousing SAS",
            siret="11223344556677",
            sector=IndustrySector.LOGISTICS,
            size=OrganizationSize.MEDIUM,
            headcount=180,
            status=OrganizationStatus.TRIAL,
            plan=SubscriptionPlan.STARTER,
            timezone="Europe/Paris",
            locale="fr-FR",
            currency="EUR",
            contact_email="contact@beta-warehousing.com",
            settings={"workingDays": {
                "monday": True, "tuesday": True, "wednesday": True,
                "thursday": True, "friday": True, "saturday": False, "sunday": False,
            }},
        ),
    ]


def _build_admin_users() -> list[User]:
    return [
        User(
            id=USER_ALPHA_ADMIN_ID,
            organization_id=ORG_ALPHA_ID,
            supabase_user_id="supabase-fake-alpha-admin",
            email="admin@alpha-transport.com",
            email_verified=True,
            role=UserRole.ORG_ADMIN,
            status=UserStatus.ACTIVE,
            locale="fr-FR",
            timezone="Europe/Paris",
        ),
        User(
            id=USER_BETA_ADMIN_ID,
            organization_id=ORG_BETA_ID,
            supabase_user_id="supabase-fake-beta-admin",
            email="admin@beta-warehousing.com",
            email_verified=True,
            role=UserRole.ORG_ADMIN,
            status=UserStatus.ACTIVE,
            locale="fr-FR",
            timezone="Europe/Paris",
        ),
    ]


def _pick_datasets_for_org(org_slug: str) -> list[str]:
    """Pick 3-5 dataset types deterministically per org."""
    all_types = list(DATASET_TEMPLATES.keys())
    rng_local = random.Random(hash(org_slug))  # noqa: S311
    count = rng_local.randint(3, min(5, len(all_types)))
    return rng_local.sample(all_types, count)


def _build_datasets_and_columns(
    org_id: uuid.UUID, org_slug: str
) -> tuple[list[ClientDataset], list[DatasetColumn]]:
    """Build ClientDataset + DatasetColumn entries for one org."""
    dataset_types = _pick_datasets_for_org(org_slug)
    datasets: list[ClientDataset] = []
    columns: list[DatasetColumn] = []

    for ds_name in dataset_types:
        ds_id = uuid.uuid5(org_id, ds_name)
        template_cols = DATASET_TEMPLATES[ds_name]

        pipeline_config = {
            "transforms": {
                col["name"]: {
                    "enabled": col["role"] in (ColumnRole.FEATURE, ColumnRole.TARGET),
                    "methods": rng.sample(TRANSFORM_TYPES, k=rng.randint(1, 3))
                    if col["role"] in (ColumnRole.FEATURE, ColumnRole.TARGET)
                    else [],
                }
                for col in template_cols
            },
            "schedule": "incremental_3x_daily",
            "refit_schedule": "weekly_sunday_02h",
        }

        temporal_col = next(c["name"] for c in template_cols if c["role"] == ColumnRole.TEMPORAL_INDEX)
        group_cols = [c["name"] for c in template_cols if c["role"] == ColumnRole.GROUP_BY]

        datasets.append(
            ClientDataset(
                id=ds_id,
                organization_id=org_id,
                name=ds_name,
                schema_raw=f"{org_slug.replace('-', '_')}_raw",
                schema_transformed=f"{org_slug.replace('-', '_')}_transformed",
                table_name=ds_name,
                temporal_index=temporal_col,
                group_by=group_cols,
                pipeline_config=pipeline_config,
                status=rng.choice([DatasetStatus.ACTIVE, DatasetStatus.ACTIVE, DatasetStatus.PENDING]),
                metadata_hash=uuid.uuid4().hex[:64],
            )
        )

        for ordinal, col_def in enumerate(template_cols):
            columns.append(
                DatasetColumn(
                    id=uuid.uuid5(ds_id, col_def["name"]),
                    dataset_id=ds_id,
                    name=col_def["name"],
                    dtype=col_def["dtype"],
                    role=col_def["role"],
                    nullable=col_def.get("nullable", False),
                    ordinal_position=ordinal,
                    rules_override=None,
                )
            )

    return datasets, columns


def _build_ingestion_logs(
    datasets: list[ClientDataset],
) -> list[IngestionLog]:
    """Generate 5-15 ingestion log entries per dataset with mixed statuses."""
    logs: list[IngestionLog] = []
    now = datetime.now(UTC)

    for ds in datasets:
        num_logs = rng.randint(5, 15)
        for i in range(num_logs):
            started = now - timedelta(hours=rng.randint(1, 720))
            status = rng.choices(
                [RunStatus.SUCCESS, RunStatus.FAILED, RunStatus.RUNNING],
                weights=[0.75, 0.15, 0.10],
                k=1,
            )[0]

            rows_received = rng.randint(100, 500)
            rows_transformed = rows_received if status == RunStatus.SUCCESS else rng.randint(0, rows_received)

            completed = (
                started + timedelta(seconds=rng.randint(5, 300))
                if status != RunStatus.RUNNING
                else None
            )

            error_msg = (
                rng.choice([
                    "Column type mismatch on 'temperature_moy': expected float, got text",
                    "Timeout waiting for source system response after 30s",
                    "Duplicate primary key violation on row 247",
                    "Schema drift detected: new column 'extra_field' not in catalog",
                ])
                if status == RunStatus.FAILED
                else None
            )

            logs.append(
                IngestionLog(
                    dataset_id=ds.id,
                    mode=rng.choice([IngestionMode.INCREMENTAL, IngestionMode.FULL_REFIT]),
                    rows_received=rows_received,
                    rows_transformed=rows_transformed,
                    started_at=started,
                    completed_at=completed,
                    status=status,
                    error_message=error_msg,
                    triggered_by=rng.choice(["scheduler", "manual", "api_webhook"]),
                    request_id=f"req-{uuid.uuid4().hex[:12]}",
                )
            )

    return logs


def _build_fit_parameters(
    datasets: list[ClientDataset],
    all_columns: list[DatasetColumn],
) -> list[FitParameter]:
    """Generate fit parameters for feature/target columns of active datasets."""
    params: list[FitParameter] = []
    now = datetime.now(UTC)

    for ds in datasets:
        if ds.status != DatasetStatus.ACTIVE:
            continue

        ds_columns = [c for c in all_columns if c.dataset_id == ds.id]
        feature_cols = [
            c for c in ds_columns
            if c.role in (ColumnRole.FEATURE, ColumnRole.TARGET)
            and c.dtype in (ColumnDtype.FLOAT, ColumnDtype.INTEGER)
        ]

        for col in feature_cols:
            # 1-3 transform types per column
            transforms = rng.sample(TRANSFORM_TYPES[:4], k=rng.randint(1, 3))
            for transform in transforms:
                version = rng.randint(1, 3)
                for v in range(1, version + 1):
                    fitted_at = now - timedelta(days=rng.randint(1, 60))
                    row_count = rng.randint(500, 5000)

                    # Generate realistic parameters based on transform type
                    if transform == "zscore":
                        parameters = {
                            "mean": round(rng.uniform(0, 100), 4),
                            "std": round(rng.uniform(0.1, 50), 4),
                        }
                    elif transform == "minmax":
                        mn = round(rng.uniform(0, 50), 4)
                        parameters = {"min": mn, "max": round(mn + rng.uniform(10, 200), 4)}
                    elif transform == "log1p":
                        parameters = {"offset": round(rng.uniform(0, 1), 4)}
                    else:
                        parameters = {"window": rng.choice([7, 14, 28, 30])}

                    params.append(
                        FitParameter(
                            id=uuid.uuid5(ds.id, f"{col.name}-{transform}-v{v}"),
                            dataset_id=ds.id,
                            column_name=col.name,
                            transform_type=transform,
                            parameters=parameters,
                            hmac_sha256=None,
                            fitted_at=fitted_at,
                            row_count=row_count,
                            version=v,
                            is_active=(v == version),
                        )
                    )

    return params


def _build_pipeline_config_history(
    datasets: list[ClientDataset],
    admin_user_id: uuid.UUID,
) -> list[PipelineConfigHistory]:
    """Generate 1-3 config history entries per dataset."""
    history: list[PipelineConfigHistory] = []

    for ds in datasets:
        num_entries = rng.randint(1, 3)
        for i in range(num_entries):
            history.append(
                PipelineConfigHistory(
                    dataset_id=ds.id,
                    config_snapshot=ds.pipeline_config,
                    columns_snapshot={
                        "column_count": rng.randint(8, 20),
                        "version": i + 1,
                    },
                    changed_by=admin_user_id,
                    change_reason=rng.choice([
                        "Initial configuration",
                        "Added rolling_mean_14d transform",
                        "Disabled log1p on boolean columns",
                        "Updated refit schedule to weekly",
                        "Added new feature column",
                    ]),
                )
            )

    return history


async def generate() -> None:
    """Main generator function — idempotent."""
    async with async_session_factory() as session:
        # Check idempotency
        for slug in ORG_SLUGS:
            existing = await session.execute(
                select(Organization.id).where(Organization.slug == slug)
            )
            if existing.scalar_one_or_none() is not None:
                print(f"Organization '{slug}' already exists — skipping.")  # noqa: T201
                return

        # Build organizations and users
        orgs = _build_organizations()
        users = _build_admin_users()

        session.add_all(orgs)
        await session.flush()

        session.add_all(users)
        await session.flush()

        # Build datasets and columns per org
        all_datasets: list[ClientDataset] = []
        all_columns: list[DatasetColumn] = []
        all_logs: list[IngestionLog] = []
        all_params: list[FitParameter] = []
        all_history: list[PipelineConfigHistory] = []

        org_admin_map = {
            ORG_ALPHA_ID: USER_ALPHA_ADMIN_ID,
            ORG_BETA_ID: USER_BETA_ADMIN_ID,
        }

        for org in orgs:
            datasets, columns = _build_datasets_and_columns(org.id, org.slug)
            all_datasets.extend(datasets)
            all_columns.extend(columns)

        session.add_all(all_datasets)
        await session.flush()

        session.add_all(all_columns)
        await session.flush()

        # Build dependent data
        for org in orgs:
            org_datasets = [d for d in all_datasets if d.organization_id == org.id]
            org_columns = [c for c in all_columns if c.dataset_id in {d.id for d in org_datasets}]

            all_logs.extend(_build_ingestion_logs(org_datasets))
            all_params.extend(_build_fit_parameters(org_datasets, org_columns))
            all_history.extend(
                _build_pipeline_config_history(org_datasets, org_admin_map[org.id])
            )

        session.add_all(all_logs)
        session.add_all(all_params)
        session.add_all(all_history)

        await session.commit()

        # Summary
        print(  # noqa: T201
            f"Synthetic data generated:\n"
            f"  - {len(orgs)} organizations\n"
            f"  - {len(users)} admin users\n"
            f"  - {len(all_datasets)} datasets\n"
            f"  - {len(all_columns)} columns\n"
            f"  - {len(all_logs)} ingestion log entries\n"
            f"  - {len(all_params)} fit parameters\n"
            f"  - {len(all_history)} pipeline config history entries"
        )


if __name__ == "__main__":
    asyncio.run(generate())
