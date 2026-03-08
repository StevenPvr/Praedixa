"""RGPD Article 17 — Right-to-erasure service with dual-approval workflow.

Implements the complete data erasure lifecycle:
1. Initiation: Admin A creates an erasure request (pending_approval).
2. Approval: Admin B (different user) approves (approved).
3. Execution: crypto-shredding -> schema drop -> platform row deletion.
4. Verification: confirm zero rows remain for the organization.

Security notes:
- Dual-approval enforcement: initiated_by MUST differ from approved_by.
- Key destruction precedes schema deletion: backup data becomes unusable first.
- Status transitions are strictly enforced via _VALID_TRANSITIONS.
- Erasure requests are persisted in database storage (no in-memory store).
- Audit trail is append-only in rgpd_erasure_audit_events.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import structlog
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.admin import (
    OnboardingState,
    PlanChangeHistory,
    RgpdErasureAuditEvent,
    RgpdErasureRequest,
    RgpdErasureStatus,
)
from app.models.conversation import Conversation
from app.models.daily_forecast import DailyForecast
from app.models.dashboard_alert import DashboardAlert
from app.models.data_catalog import (
    ClientDataset,
    DatasetColumn,
    FitParameter,
    IngestionLog,
    PipelineConfigHistory,
    QualityReport,
)
from app.models.decision import Decision
from app.models.department import Department
from app.models.forecast_run import ForecastRun
from app.models.mlops import (
    DataLineageEvent,
    ModelArtifactAccessLog,
    ModelInferenceJob,
    ModelRegistry,
)
from app.models.operational import (
    CanonicalRecord,
    CostParameter,
    CoverageAlert,
    OperationalDecision,
    ProofRecord,
    ScenarioOption,
)
from app.models.organization import Organization
from app.models.site import Site
from app.models.user import User

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.key_management import KeyProvider

logger = structlog.get_logger()

# Maximum slug length for early boundary validation.
_MAX_SLUG_LENGTH = 100


# ── Public status alias ─────────────────────────────────

ErasureStatus = RgpdErasureStatus


# Valid status transitions — anything not in this map is rejected.
# Key: (action_verb, current_status) -> target_status
_VALID_TRANSITIONS: dict[tuple[str, ErasureStatus], ErasureStatus] = {
    ("approve", ErasureStatus.PENDING_APPROVAL): ErasureStatus.APPROVED,
    ("execute", ErasureStatus.APPROVED): ErasureStatus.EXECUTING,
    ("complete", ErasureStatus.EXECUTING): ErasureStatus.COMPLETED,
    ("fail", ErasureStatus.EXECUTING): ErasureStatus.FAILED,
}

_ACTIVE_STATUSES = frozenset(
    {
        ErasureStatus.PENDING_APPROVAL,
        ErasureStatus.APPROVED,
        ErasureStatus.EXECUTING,
    }
)


class ErasureRequest(BaseModel):
    """API model for RGPD erasure requests."""

    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    organization_id: uuid.UUID
    org_slug: str
    initiated_by: str
    approved_by: str | None = None
    status: ErasureStatus = ErasureStatus.PENDING_APPROVAL
    created_at: datetime
    completed_at: datetime | None = None
    audit_log: list[str] = Field(default_factory=list)


# ── Tables verified/deleted after erasure ───────────────

# dataset_id-scoped tables (resolved via client_datasets.organization_id)
_DATASET_SCOPED_TABLES: list[tuple[str, type]] = [
    ("pipeline_config_history", PipelineConfigHistory),
    ("quality_reports", QualityReport),
    ("ingestion_log", IngestionLog),
    ("fit_parameters", FitParameter),
    ("dataset_columns", DatasetColumn),
]

# organization_id-scoped tables that must be explicitly purged.
# We do not rely on FK cascades because some operational tables intentionally
# omit FK constraints on organization_id.
_ORG_DIRECT_DELETE_TABLES: list[tuple[str, type]] = [
    ("operational_decisions", OperationalDecision),
    ("scenario_options", ScenarioOption),
    ("coverage_alerts", CoverageAlert),
    ("cost_parameters", CostParameter),
    ("canonical_records", CanonicalRecord),
    ("proof_records", ProofRecord),
    ("data_lineage_events", DataLineageEvent),
    ("model_artifact_access_log", ModelArtifactAccessLog),
    ("model_inference_jobs", ModelInferenceJob),
    ("model_registry", ModelRegistry),
    ("conversations", Conversation),
    ("dashboard_alerts", DashboardAlert),
    ("decisions", Decision),
    ("daily_forecasts", DailyForecast),
    ("forecast_runs", ForecastRun),
    ("onboarding_states", OnboardingState),
    ("plan_change_history", PlanChangeHistory),
    ("departments", Department),
    ("sites", Site),
]

_VERIFICATION_TABLES: list[tuple[str, type]] = [
    *_DATASET_SCOPED_TABLES,
    ("client_datasets", ClientDataset),
    *_ORG_DIRECT_DELETE_TABLES,
    ("users", User),
    ("organizations", Organization),
]


def _validate_transition(
    action: str,
    current_status: ErasureStatus,
) -> ErasureStatus:
    """Validate and return the target status for a state transition."""
    key = (action, current_status)
    target = _VALID_TRANSITIONS.get(key)
    if target is None:
        msg = f"Cannot {action} erasure request in status {current_status.value}"
        raise ConflictError(msg)
    return target


# ── Public API ──────────────────────────────────────────


async def initiate_erasure(
    org_id: uuid.UUID,
    org_slug: str,
    initiated_by: str,
    db: AsyncSession,
) -> ErasureRequest:
    """Create an erasure request for an organization."""
    del org_slug
    canonical_slug = await _get_canonical_org_slug(db, org_id)

    await _ensure_no_active_request(db, org_id)

    request_row = RgpdErasureRequest(
        organization_id=org_id,
        org_slug=canonical_slug,
        initiated_by=initiated_by,
        status=ErasureStatus.PENDING_APPROVAL,
    )
    db.add(request_row)
    await _flush_with_conflict(
        db,
        "An erasure request is already in progress for this organization",
    )

    now = datetime.now(UTC)
    await _append_audit_event(
        db,
        request_row.id,
        f"[{now.isoformat()}] Erasure initiated by {initiated_by}",
    )

    logger.warning(
        "rgpd_erasure_initiated",
        erasure_request_id=str(request_row.id),
        organization_id=str(org_id),
        initiated_by=initiated_by,
    )

    return await _build_response(db, request_row)


async def approve_erasure(
    request_id: uuid.UUID,
    approved_by: str,
    db: AsyncSession,
) -> ErasureRequest:
    """Approve an erasure request. The approver MUST differ from initiator."""
    request_row = await _load_request_row(db, request_id, for_update=True)
    if request_row is None:
        raise NotFoundError("ErasureRequest", str(request_id))

    if request_row.initiated_by == approved_by:
        raise ForbiddenError("Erasure approval requires a different administrator")

    _validate_transition("approve", request_row.status)

    request_row.status = ErasureStatus.APPROVED
    request_row.approved_by = approved_by

    now = datetime.now(UTC)
    await _append_audit_event(
        db,
        request_row.id,
        f"[{now.isoformat()}] Erasure approved by {approved_by}",
    )
    await db.flush()

    logger.warning(
        "rgpd_erasure_approved",
        erasure_request_id=str(request_id),
        organization_id=str(request_row.organization_id),
        approved_by=approved_by,
    )

    return await _build_response(db, request_row)


async def execute_erasure(
    request_id: uuid.UUID,
    db: AsyncSession,
    key_provider: KeyProvider,
) -> ErasureRequest:
    """Execute approved erasure: crypto-shred + schema drop + row deletion."""
    request_row = await _load_request_row(db, request_id, for_update=True)
    if request_row is None:
        raise NotFoundError("ErasureRequest", str(request_id))

    _validate_transition("execute", request_row.status)

    request_row.status = ErasureStatus.EXECUTING
    await _append_audit_event(
        db,
        request_row.id,
        f"[{datetime.now(UTC).isoformat()}] Execution started",
    )
    await db.flush()

    logger.warning(
        "rgpd_erasure_executing",
        erasure_request_id=str(request_id),
        organization_id=str(request_row.organization_id),
    )

    for step_fn in (
        lambda: _step_crypto_shred(db, request_row, key_provider),
        lambda: _step_drop_schemas(db, request_row),
        lambda: _step_delete_platform_rows(db, request_row),
        lambda: _step_commit(db, request_row),
    ):
        failed = await step_fn()  # type: ignore[no-untyped-call]
        if failed is not None:
            return failed

    completed_time = datetime.now(UTC)
    request_row.status = ErasureStatus.COMPLETED
    request_row.completed_at = completed_time
    await _append_audit_event(
        db,
        request_row.id,
        f"[{completed_time.isoformat()}] Erasure completed successfully",
    )
    await db.flush()

    logger.warning(
        "rgpd_erasure_completed",
        erasure_request_id=str(request_row.id),
        organization_id=str(request_row.organization_id),
    )

    return await _build_response(db, request_row)


async def verify_erasure(
    org_id: uuid.UUID,
    db: AsyncSession,
) -> dict[str, int]:
    """Post-erasure verification: confirm zero rows remain for the org."""
    counts: dict[str, int] = {}

    for table_name, model in _VERIFICATION_TABLES:
        if table_name == "organizations":
            result = await db.execute(
                select(func.count())
                .select_from(model)
                .where(
                    model.id == org_id,  # type: ignore[attr-defined]
                )
            )
        elif hasattr(model, "organization_id"):
            result = await db.execute(
                select(func.count())
                .select_from(model)
                .where(
                    model.organization_id == org_id,
                )
            )
        else:
            result = await db.execute(
                select(func.count())
                .select_from(model)
                .where(
                    model.dataset_id.in_(  # type: ignore[attr-defined]
                        select(ClientDataset.id).where(
                            ClientDataset.organization_id == org_id,
                        )
                    )
                )
            )

        counts[table_name] = result.scalar_one()

    logger.info(
        "rgpd_erasure_verification",
        organization_id=str(org_id),
        remaining_counts=counts,
        all_zero=all(v == 0 for v in counts.values()),
    )

    return counts


async def get_erasure_request(
    request_id: uuid.UUID,
    db: AsyncSession,
) -> ErasureRequest | None:
    """Get an erasure request by ID."""
    request_row = await _load_request_row(db, request_id)
    if request_row is None:
        return None
    return await _build_response(db, request_row)


# ── Private execution steps ──────────────────────────────


async def _step_crypto_shred(
    db: AsyncSession,
    request_row: RgpdErasureRequest,
    key_provider: KeyProvider,
) -> ErasureRequest | None:
    """Step 1: Destroy encryption keys (must happen first)."""
    try:
        await key_provider.destroy_all_keys(request_row.organization_id)
        step_time = datetime.now(UTC).isoformat()
        await _append_audit_event(
            db,
            request_row.id,
            f"[{step_time}] Keys destroyed (crypto-shredding complete)",
        )
        logger.warning(
            "rgpd_erasure_keys_destroyed",
            erasure_request_id=str(request_row.id),
            organization_id=str(request_row.organization_id),
        )
    except Exception:
        logger.exception(
            "rgpd_erasure_key_destruction_failed",
            erasure_request_id=str(request_row.id),
            organization_id=str(request_row.organization_id),
        )
        return await _mark_failed(db, request_row, "Key destruction failed")
    return None


async def _step_drop_schemas(
    db: AsyncSession,
    request_row: RgpdErasureRequest,
) -> ErasureRequest | None:
    """Step 2: Drop client data schemas."""
    try:
        from app.services.schema_manager import drop_client_schemas

        await drop_client_schemas(request_row.org_slug)
        step_time = datetime.now(UTC).isoformat()
        await _append_audit_event(
            db,
            request_row.id,
            f"[{step_time}] Client schemas dropped",
        )
        logger.warning(
            "rgpd_erasure_schemas_dropped",
            erasure_request_id=str(request_row.id),
            organization_id=str(request_row.organization_id),
            org_slug=request_row.org_slug,
        )
    except Exception:
        logger.exception(
            "rgpd_erasure_schema_drop_failed",
            erasure_request_id=str(request_row.id),
            organization_id=str(request_row.organization_id),
        )
        return await _mark_failed(db, request_row, "Schema drop failed")
    return None


async def _step_delete_platform_rows(
    db: AsyncSession,
    request_row: RgpdErasureRequest,
) -> ErasureRequest | None:
    """Step 3: Delete all platform rows for the organization."""
    try:
        deleted_counts = await _delete_org_data(db, request_row.organization_id)
        await db.flush()

        step_time = datetime.now(UTC).isoformat()
        counts_str = ", ".join(f"{k}={v}" for k, v in deleted_counts.items())
        await _append_audit_event(
            db,
            request_row.id,
            f"[{step_time}] Platform rows deleted: {counts_str}",
        )
        logger.warning(
            "rgpd_erasure_rows_deleted",
            erasure_request_id=str(request_row.id),
            organization_id=str(request_row.organization_id),
            deleted_counts=deleted_counts,
        )
    except Exception:
        logger.exception(
            "rgpd_erasure_row_deletion_failed",
            erasure_request_id=str(request_row.id),
            organization_id=str(request_row.organization_id),
        )
        return await _mark_failed(db, request_row, "Platform row deletion failed")
    return None


async def _step_commit(
    db: AsyncSession,
    request_row: RgpdErasureRequest,
) -> ErasureRequest | None:
    """Step 4: Flush pending writes in current transaction."""
    try:
        await db.flush()
    except Exception:
        logger.exception(
            "rgpd_erasure_commit_failed",
            erasure_request_id=str(request_row.id),
        )
        return await _mark_failed(db, request_row, "Transaction commit failed")
    return None


async def _delete_org_data(
    db: AsyncSession,
    org_id: uuid.UUID,
) -> dict[str, int]:
    """Delete all platform rows for an organization."""
    dataset_ids_result = await db.execute(
        select(ClientDataset.id).where(
            ClientDataset.organization_id == org_id,
        )
    )
    dataset_ids = [row[0] for row in dataset_ids_result.fetchall()]

    deleted_counts: dict[str, int] = {
        table_name: 0
        for table_name, _ in [
            *_DATASET_SCOPED_TABLES,
            ("client_datasets", ClientDataset),
            *_ORG_DIRECT_DELETE_TABLES,
            ("users", User),
            ("organizations", Organization),
        ]
    }

    for table_name, model in _ORG_DIRECT_DELETE_TABLES:
        result = await db.execute(
            delete(model).where(
                model.organization_id == org_id,  # type: ignore[attr-defined]
            )
        )
        deleted_counts[table_name] = _rowcount(result)

    if dataset_ids:
        for table_name, model in _DATASET_SCOPED_TABLES:
            result = await db.execute(
                delete(model).where(
                    model.dataset_id.in_(dataset_ids),  # type: ignore[attr-defined]
                )
            )
            deleted_counts[table_name] = _rowcount(result)

        result = await db.execute(
            delete(ClientDataset).where(
                ClientDataset.organization_id == org_id,
            )
        )
        deleted_counts["client_datasets"] = _rowcount(result)

    result = await db.execute(delete(User).where(User.organization_id == org_id))
    deleted_counts["users"] = _rowcount(result)

    result = await db.execute(delete(Organization).where(Organization.id == org_id))
    deleted_counts["organizations"] = _rowcount(result)

    return deleted_counts


def _rowcount(result: Any) -> int:
    raw = getattr(result, "rowcount", 0)
    if isinstance(raw, int):
        return raw
    return int(raw or 0)


# ── Persistence helpers ─────────────────────────────────


async def _ensure_no_active_request(db: AsyncSession, org_id: uuid.UUID) -> None:
    result = await db.execute(
        select(func.count())
        .select_from(RgpdErasureRequest)
        .where(
            RgpdErasureRequest.organization_id == org_id,
            RgpdErasureRequest.status.in_(tuple(_ACTIVE_STATUSES)),
        )
    )
    if (result.scalar_one() or 0) > 0:
        msg = "An erasure request is already in progress"
        raise ConflictError(msg)


async def _get_canonical_org_slug(
    db: AsyncSession,
    org_id: uuid.UUID,
) -> str:
    """Load the canonical slug from Organizations for destructive RGPD steps."""
    result = await db.execute(
        select(Organization.slug).where(Organization.id == org_id)
    )
    slug = result.scalar_one_or_none()
    if slug is None:
        raise NotFoundError("Organization", str(org_id))

    cleaned_slug = slug.strip()
    if not cleaned_slug or len(cleaned_slug) > _MAX_SLUG_LENGTH:
        raise ConflictError("Invalid organization slug")

    return cleaned_slug


async def _load_request_row(
    db: AsyncSession,
    request_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> RgpdErasureRequest | None:
    stmt = select(RgpdErasureRequest).where(RgpdErasureRequest.id == request_id)
    if for_update:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _append_audit_event(
    db: AsyncSession,
    request_id: uuid.UUID,
    message: str,
) -> None:
    seq_result = await db.execute(
        select(func.coalesce(func.max(RgpdErasureAuditEvent.sequence_no), 0)).where(
            RgpdErasureAuditEvent.erasure_request_id == request_id
        )
    )
    current_max = int(seq_result.scalar_one() or 0)

    event = RgpdErasureAuditEvent(
        erasure_request_id=request_id,
        sequence_no=current_max + 1,
        message=message,
    )
    db.add(event)
    await _flush_with_conflict(
        db,
        "Failed to append RGPD erasure audit event",
    )


async def _fetch_audit_log(db: AsyncSession, request_id: uuid.UUID) -> list[str]:
    result = await db.execute(
        select(RgpdErasureAuditEvent.message)
        .where(RgpdErasureAuditEvent.erasure_request_id == request_id)
        .order_by(RgpdErasureAuditEvent.sequence_no.asc())
    )
    return [row[0] for row in result.all()]


async def _build_response(
    db: AsyncSession,
    request_row: RgpdErasureRequest,
) -> ErasureRequest:
    return ErasureRequest(
        id=request_row.id,
        organization_id=request_row.organization_id,
        org_slug=request_row.org_slug,
        initiated_by=request_row.initiated_by,
        approved_by=request_row.approved_by,
        status=request_row.status,
        created_at=request_row.created_at,
        completed_at=request_row.completed_at,
        audit_log=await _fetch_audit_log(db, request_row.id),
    )


async def _flush_with_conflict(db: AsyncSession, message: str) -> None:
    try:
        await db.flush()
    except IntegrityError as exc:
        raise ConflictError(message) from exc


async def _mark_failed(
    db: AsyncSession,
    request_row: RgpdErasureRequest,
    reason: str,
) -> ErasureRequest:
    failed_time = datetime.now(UTC)
    request_row.status = ErasureStatus.FAILED
    request_row.completed_at = failed_time
    await _append_audit_event(
        db,
        request_row.id,
        f"[{failed_time.isoformat()}] FAILED: {reason}",
    )
    await db.flush()

    logger.error(
        "rgpd_erasure_failed",
        erasure_request_id=str(request_row.id),
        organization_id=str(request_row.organization_id),
        reason=reason,
    )

    return await _build_response(db, request_row)
