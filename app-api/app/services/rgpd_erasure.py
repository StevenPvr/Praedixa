"""RGPD Article 17 — Right-to-erasure service with dual-approval workflow.

Implements the complete data erasure lifecycle:
1. Initiation: Admin A creates an erasure request (pending_approval).
2. Approval: Admin B (different user!) approves (approved).
3. Execution: crypto-shredding -> schema drop -> platform row deletion.
4. Verification: confirm zero rows remain for the organization.

Security notes:
- Dual-approval enforcement: initiated_by MUST differ from approved_by.
  A single compromised admin account cannot unilaterally erase an org.
- Key destruction precedes schema deletion: restored database backups
  cannot be decrypted after crypto-shredding.
- Status transitions are strictly enforced via _VALID_TRANSITIONS:
  pending_approval -> approved -> executing -> completed/failed.
  No transition can be skipped or replayed.
- All operations are audit-logged via structlog with correlation context.
- The in-memory store is acceptable for MVP (erasure is rare). Production
  will migrate to a persistent table with HMAC integrity checks.
- org_slug is validated by schema_manager.drop_client_schemas via
  validate_client_slug (prevents SQL injection in schema names).
- Thread-safety: _store_lock serializes all writes to the in-memory store.
- Bounded capacity: _MAX_ERASURE_REQUESTS prevents memory exhaustion.

CNIL compliance:
- Article 17: Complete data erasure with verification.
- Article 20: Export is handled separately (not in this module).
- Article 30: Audit trail of every erasure step (structlog + audit_log field).
"""

from __future__ import annotations

import threading
import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import TYPE_CHECKING

import structlog
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, select

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.conversation import Conversation
from app.models.data_catalog import (
    ClientDataset,
    DatasetColumn,
    FitParameter,
    IngestionLog,
    PipelineConfigHistory,
)
from app.models.organization import Organization
from app.models.user import User

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.key_management import KeyProvider

logger = structlog.get_logger()

# Maximum slug length for early boundary validation.
_MAX_SLUG_LENGTH = 100


# ── Data Model ──────────────────────────────────────────


class ErasureStatus(str, Enum):
    """Erasure request lifecycle states.

    Transitions: pending_approval -> approved -> executing -> completed/failed
    No other transitions are valid.
    """

    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


# Valid status transitions — anything not in this map is rejected.
# Key: (action_verb, current_status) -> target_status
_VALID_TRANSITIONS: dict[tuple[str, ErasureStatus], ErasureStatus] = {
    ("approve", ErasureStatus.PENDING_APPROVAL): ErasureStatus.APPROVED,
    ("execute", ErasureStatus.APPROVED): ErasureStatus.EXECUTING,
    ("complete", ErasureStatus.EXECUTING): ErasureStatus.COMPLETED,
    ("fail", ErasureStatus.EXECUTING): ErasureStatus.FAILED,
}


class ErasureRequest(BaseModel):
    """RGPD erasure request with audit trail.

    Pydantic model (not ORM) -- stored in-memory for MVP.
    Production will use a persistent table with HMAC integrity checks.

    extra="forbid" prevents mass-assignment of unexpected fields.
    """

    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    organization_id: uuid.UUID
    org_slug: str
    initiated_by: str  # user_id of Admin A (from JWT, never from body)
    approved_by: str | None = None  # user_id of Admin B
    status: ErasureStatus = ErasureStatus.PENDING_APPROVAL
    created_at: datetime
    completed_at: datetime | None = None
    audit_log: list[str] = []  # chronological timeline of actions


# ── In-Memory Store (MVP) ──────────────────────────────
# Thread-safe via lock. Production: persistent audit table.
_erasure_requests: dict[uuid.UUID, ErasureRequest] = {}
_store_lock = threading.Lock()

# Bounded capacity to prevent memory exhaustion.
# A single erasure request is ~1KB; 1000 cap = ~1MB max.
_MAX_ERASURE_REQUESTS = 1000


def _store_request(request: ErasureRequest) -> None:
    """Store an erasure request with bounded capacity.

    Evicts completed/failed requests if capacity is reached.
    """
    with _store_lock:
        if len(_erasure_requests) >= _MAX_ERASURE_REQUESTS:  # pragma: no cover
            # Evict terminal requests (completed/failed) oldest first
            terminal_ids = [
                rid
                for rid, req in _erasure_requests.items()
                if req.status in (ErasureStatus.COMPLETED, ErasureStatus.FAILED)
            ]
            for rid in terminal_ids:
                del _erasure_requests[rid]
                if len(_erasure_requests) < _MAX_ERASURE_REQUESTS:
                    break

        if len(_erasure_requests) >= _MAX_ERASURE_REQUESTS:  # pragma: no cover
            msg = "Too many pending erasure requests"
            raise ConflictError(msg)

        _erasure_requests[request.id] = request


def _get_request(request_id: uuid.UUID) -> ErasureRequest | None:
    """Retrieve an erasure request by ID (thread-safe read)."""
    with _store_lock:
        return _erasure_requests.get(request_id)


def _update_request(request: ErasureRequest) -> None:
    """Update an existing erasure request in the store."""
    with _store_lock:
        if request.id not in _erasure_requests:  # pragma: no cover
            return
        _erasure_requests[request.id] = request


def _validate_transition(
    action: str,
    current_status: ErasureStatus,
) -> ErasureStatus:
    """Validate and return the target status for a state transition.

    Raises ConflictError if the transition is not in _VALID_TRANSITIONS.
    """
    key = (action, current_status)
    target = _VALID_TRANSITIONS.get(key)
    if target is None:
        msg = f"Cannot {action} erasure request in status {current_status.value}"
        raise ConflictError(msg)
    return target


# ── Tables verified after erasure ────────────────────────
# All platform tables that may contain org-specific data.
# Ordered leaves-first for verification clarity.
_VERIFICATION_TABLES: list[tuple[str, type]] = [
    ("pipeline_config_history", PipelineConfigHistory),
    ("ingestion_log", IngestionLog),
    ("fit_parameters", FitParameter),
    ("dataset_columns", DatasetColumn),
    ("client_datasets", ClientDataset),
    ("conversations", Conversation),
    ("users", User),
    ("organizations", Organization),
]


# ── Public API ──────────────────────────────────────────


async def initiate_erasure(
    org_id: uuid.UUID,
    org_slug: str,
    initiated_by: str,
) -> ErasureRequest:
    """Create an erasure request for an organization.

    This is step 1 of the dual-approval workflow. The request is stored
    in pending_approval status and must be approved by a different admin.

    Args:
        org_id: Target organization UUID.
        org_slug: Organization slug (used for schema name resolution).
        initiated_by: user_id of the initiating admin (from JWT).

    Returns:
        The created ErasureRequest in pending_approval status.

    Raises:
        ConflictError: If an active erasure request already exists for
            this org, or if the slug is invalid.
    """
    # Validate org_slug format at the boundary. The actual DDL validation
    # happens in drop_client_schemas via validate_client_slug, but we
    # reject obviously malformed slugs early.
    if not org_slug or len(org_slug) > _MAX_SLUG_LENGTH:
        msg = "Invalid organization slug"
        raise ConflictError(msg)

    # Check for existing active (non-terminal) erasure request for this org.
    # Only one erasure can be in-flight per organization at a time.
    with _store_lock:
        for existing in _erasure_requests.values():
            if existing.organization_id == org_id and existing.status not in (
                ErasureStatus.COMPLETED,
                ErasureStatus.FAILED,
            ):
                msg = "An erasure request is already in progress for this organization"
                raise ConflictError(msg)

    now = datetime.now(UTC)
    request = ErasureRequest(
        id=uuid.uuid4(),
        organization_id=org_id,
        org_slug=org_slug,
        initiated_by=initiated_by,
        status=ErasureStatus.PENDING_APPROVAL,
        created_at=now,
        audit_log=[
            f"[{now.isoformat()}] Erasure initiated by {initiated_by}",
        ],
    )

    _store_request(request)

    logger.warning(
        "rgpd_erasure_initiated",
        erasure_request_id=str(request.id),
        organization_id=str(org_id),
        initiated_by=initiated_by,
    )

    return request


async def approve_erasure(
    request_id: uuid.UUID,
    approved_by: str,
) -> ErasureRequest:
    """Approve an erasure request. The approver MUST differ from the initiator.

    This is the dual-approval gate. A single compromised admin account
    cannot unilaterally erase an organization's data.

    Args:
        request_id: The erasure request UUID to approve.
        approved_by: user_id of Admin B (from JWT, must differ from initiator).

    Returns:
        The updated ErasureRequest in approved status.

    Raises:
        NotFoundError: Request does not exist.
        ForbiddenError: Same user tried to both initiate and approve.
        ConflictError: Request is not in pending_approval status.
    """
    request = _get_request(request_id)
    if request is None:
        raise NotFoundError("ErasureRequest", str(request_id))

    # Enforce dual-approval: different admin must approve
    if request.initiated_by == approved_by:
        raise ForbiddenError("Erasure approval requires a different administrator")

    # Validate status transition
    _validate_transition("approve", request.status)

    now = datetime.now(UTC)
    updated = request.model_copy(
        update={
            "status": ErasureStatus.APPROVED,
            "approved_by": approved_by,
            "audit_log": [
                *request.audit_log,
                f"[{now.isoformat()}] Erasure approved by {approved_by}",
            ],
        },
    )

    _update_request(updated)

    logger.warning(
        "rgpd_erasure_approved",
        erasure_request_id=str(request_id),
        organization_id=str(request.organization_id),
        approved_by=approved_by,
    )

    return updated


async def execute_erasure(
    request_id: uuid.UUID,
    db: AsyncSession,
    key_provider: KeyProvider,
) -> ErasureRequest:
    """Execute the approved erasure: crypto-shred + drop schemas + delete rows.

    Execution order is critical for security:
    1. Destroy encryption keys (makes backup data irrecoverable)
    2. Drop client schemas (raw + transformed data tables)
    3. Delete platform rows (client_datasets cascades to children)
    4. Delete organization row itself

    If any step fails, the request is marked as failed with the error
    recorded in the audit log. Partial erasure is acceptable from a
    security standpoint because key destruction (step 1) happens first --
    even if subsequent steps fail, the data is cryptographically dead.

    Args:
        request_id: The approved erasure request UUID.
        db: Async database session for platform row deletion.
        key_provider: KeyProvider for crypto-shredding.

    Returns:
        The updated ErasureRequest (completed or failed).

    Raises:
        NotFoundError: Request does not exist.
        ConflictError: Request is not in approved status.
    """
    request = _get_request(request_id)
    if request is None:
        raise NotFoundError("ErasureRequest", str(request_id))

    # Validate status transition to executing
    _validate_transition("execute", request.status)

    now = datetime.now(UTC)
    audit_log = [
        *request.audit_log,
        f"[{now.isoformat()}] Execution started",
    ]

    # Transition to executing state
    executing = request.model_copy(
        update={
            "status": ErasureStatus.EXECUTING,
            "audit_log": audit_log,
        },
    )
    _update_request(executing)

    org_id = request.organization_id
    org_slug = request.org_slug

    logger.warning(
        "rgpd_erasure_executing",
        erasure_request_id=str(request_id),
        organization_id=str(org_id),
    )

    # Execute each step; on failure, mark failed and return early.
    # Step order is security-critical: keys MUST be destroyed first.
    for step_fn in (
        lambda: _step_crypto_shred(key_provider, org_id, request_id, audit_log),
        lambda: _step_drop_schemas(org_slug, org_id, request_id, audit_log),
        lambda: _step_delete_platform_rows(db, org_id, request_id, audit_log),
        lambda: _step_commit(db, request_id, audit_log),
    ):
        failed = await step_fn()  # type: ignore[no-untyped-call]
        if failed is not None:
            return failed

    # All steps succeeded -- mark complete
    completed_time = datetime.now(UTC)
    audit_log.append(f"[{completed_time.isoformat()}] Erasure completed successfully")

    completed = executing.model_copy(
        update={
            "status": ErasureStatus.COMPLETED,
            "completed_at": completed_time,
            "audit_log": audit_log,
        },
    )
    _update_request(completed)

    logger.warning(
        "rgpd_erasure_completed",
        erasure_request_id=str(request_id),
        organization_id=str(org_id),
    )

    return completed


async def verify_erasure(
    org_id: uuid.UUID,
    db: AsyncSession,
) -> dict[str, int]:
    """Post-erasure verification: confirm zero rows remain for the org.

    Queries all platform tables that may contain organization-specific
    data. Returns a dict of {table_name: row_count}. All values should
    be 0 after a successful erasure.

    For child tables (dataset_columns, fit_parameters, etc.) that are
    scoped by dataset_id rather than organization_id, we join through
    client_datasets. After client_datasets are deleted (CASCADE), these
    should be empty for the org.

    Args:
        org_id: The organization UUID that was erased.
        db: Async database session.

    Returns:
        Dict mapping table name to remaining row count.
    """
    counts: dict[str, int] = {}

    for table_name, model in _VERIFICATION_TABLES:
        if table_name == "organizations":
            # Organization uses id, not organization_id
            result = await db.execute(
                select(func.count())
                .select_from(model)
                .where(
                    model.id == org_id,  # type: ignore[attr-defined]
                )
            )
        elif hasattr(model, "organization_id"):
            # Tables directly scoped by organization_id
            result = await db.execute(
                select(func.count())
                .select_from(model)
                .where(
                    model.organization_id == org_id,
                )
            )
        else:
            # Child tables scoped by dataset_id (not organization_id).
            # Verify by checking for rows whose dataset_id would belong
            # to the erased org. After CASCADE delete, should be 0.
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

        row_count = result.scalar_one()
        counts[table_name] = row_count

    all_zero = all(v == 0 for v in counts.values())

    logger.info(
        "rgpd_erasure_verification",
        organization_id=str(org_id),
        remaining_counts=counts,
        all_zero=all_zero,
    )

    return counts


def get_erasure_request(request_id: uuid.UUID) -> ErasureRequest | None:
    """Get an erasure request by ID.

    Args:
        request_id: The erasure request UUID.

    Returns:
        The ErasureRequest, or None if not found.
    """
    return _get_request(request_id)


# ── Private execution steps ──────────────────────────────
# Each step returns None on success or an ErasureRequest on failure.
# This pattern keeps execute_erasure under the statement limit.


async def _step_crypto_shred(
    key_provider: KeyProvider,
    org_id: uuid.UUID,
    request_id: uuid.UUID,
    audit_log: list[str],
) -> ErasureRequest | None:
    """Step 1: Destroy encryption keys (crypto-shredding).

    MUST happen first -- makes backup data irrecoverable even if
    subsequent steps fail.
    """
    try:
        await key_provider.destroy_all_keys(org_id)
        step_time = datetime.now(UTC).isoformat()
        audit_log.append(f"[{step_time}] Keys destroyed (crypto-shredding complete)")
        logger.warning(
            "rgpd_erasure_keys_destroyed",
            erasure_request_id=str(request_id),
            organization_id=str(org_id),
        )
    except Exception:  # pragma: no cover
        step_time = datetime.now(UTC).isoformat()
        audit_log.append(f"[{step_time}] FAILED: Key destruction failed")
        logger.exception(
            "rgpd_erasure_key_destruction_failed",
            erasure_request_id=str(request_id),
            organization_id=str(org_id),
        )
        return _mark_failed(request_id, audit_log)
    return None


async def _step_drop_schemas(  # pragma: no cover
    org_slug: str,
    org_id: uuid.UUID,
    request_id: uuid.UUID,
    audit_log: list[str],
) -> ErasureRequest | None:
    """Step 2: Drop client data schema."""
    try:
        # Import here to avoid circular dependency at module level
        from app.services.schema_manager import drop_client_schemas

        await drop_client_schemas(org_slug)
        step_time = datetime.now(UTC).isoformat()
        audit_log.append(f"[{step_time}] Client schemas dropped")
        logger.warning(
            "rgpd_erasure_schemas_dropped",
            erasure_request_id=str(request_id),
            organization_id=str(org_id),
            org_slug=org_slug,
        )
    except Exception:
        step_time = datetime.now(UTC).isoformat()
        audit_log.append(f"[{step_time}] FAILED: Schema drop failed")
        logger.exception(
            "rgpd_erasure_schema_drop_failed",
            erasure_request_id=str(request_id),
            organization_id=str(org_id),
        )
        return _mark_failed(request_id, audit_log)
    return None


async def _step_delete_platform_rows(  # pragma: no cover
    db: AsyncSession,
    org_id: uuid.UUID,
    request_id: uuid.UUID,
    audit_log: list[str],
) -> ErasureRequest | None:
    """Step 3: Delete all platform rows for the organization.

    Deletes in dependency order (children before parents) for
    defense in depth, even though CASCADE would handle it.
    """
    try:
        deleted_counts = await _delete_org_data(db, org_id)
        await db.flush()

        step_time = datetime.now(UTC).isoformat()
        counts_str = ", ".join(f"{k}={v}" for k, v in deleted_counts.items())
        audit_log.append(f"[{step_time}] Platform rows deleted: {counts_str}")
        logger.warning(
            "rgpd_erasure_rows_deleted",
            erasure_request_id=str(request_id),
            organization_id=str(org_id),
            deleted_counts=deleted_counts,
        )
    except Exception:
        step_time = datetime.now(UTC).isoformat()
        audit_log.append(f"[{step_time}] FAILED: Platform row deletion failed")
        logger.exception(
            "rgpd_erasure_row_deletion_failed",
            erasure_request_id=str(request_id),
            organization_id=str(org_id),
        )
        return _mark_failed(request_id, audit_log)
    return None


async def _step_commit(  # pragma: no cover
    db: AsyncSession,
    request_id: uuid.UUID,
    audit_log: list[str],
) -> ErasureRequest | None:
    """Step 4: Commit the transaction."""
    try:
        await db.commit()
    except Exception:
        step_time = datetime.now(UTC).isoformat()
        audit_log.append(f"[{step_time}] FAILED: Transaction commit failed")
        logger.exception(
            "rgpd_erasure_commit_failed",
            erasure_request_id=str(request_id),
        )
        return _mark_failed(request_id, audit_log)
    return None


async def _delete_org_data(  # pragma: no cover
    db: AsyncSession,
    org_id: uuid.UUID,
) -> dict[str, int]:
    """Delete all platform rows for an organization.

    Returns a dict of {table_name: deleted_count} for audit logging.
    Deletes in dependency order: child tables first, then parents.
    """
    # Find all dataset IDs for this org to delete child rows
    dataset_ids_result = await db.execute(
        select(ClientDataset.id).where(
            ClientDataset.organization_id == org_id,
        )
    )
    dataset_ids = [row[0] for row in dataset_ids_result.fetchall()]

    deleted_counts: dict[str, int] = {}

    if dataset_ids:
        # Delete child tables that reference datasets (leaves first)
        for table_name, model in [
            ("pipeline_config_history", PipelineConfigHistory),
            ("ingestion_log", IngestionLog),
            ("fit_parameters", FitParameter),
            ("dataset_columns", DatasetColumn),
        ]:
            result = await db.execute(
                delete(model).where(
                    model.dataset_id.in_(dataset_ids),  # type: ignore[attr-defined]
                )
            )
            deleted_counts[table_name] = result.rowcount  # type: ignore[attr-defined]

        # Delete client_datasets themselves
        result = await db.execute(
            delete(ClientDataset).where(
                ClientDataset.organization_id == org_id,
            )
        )
        deleted_counts["client_datasets"] = result.rowcount  # type: ignore[attr-defined]

    # Delete users for this org
    result = await db.execute(delete(User).where(User.organization_id == org_id))
    deleted_counts["users"] = result.rowcount  # type: ignore[attr-defined]

    # Delete the organization itself (also cascades to sites, etc.)
    result = await db.execute(delete(Organization).where(Organization.id == org_id))
    deleted_counts["organizations"] = result.rowcount  # type: ignore[attr-defined]

    return deleted_counts


# ── Private helpers ──────────────────────────────────────


def _mark_failed(  # pragma: no cover
    request_id: uuid.UUID,
    audit_log: list[str],
) -> ErasureRequest:
    """Mark an erasure request as failed with the current audit log.

    Called when an execution step fails. The audit_log preserves the
    full timeline of what succeeded and what failed, which is essential
    for incident response and CNIL reporting.
    """
    request = _get_request(request_id)
    if request is None:
        # Should never happen -- defensive guard against store corruption
        raise NotFoundError("ErasureRequest", str(request_id))

    failed_time = datetime.now(UTC)
    failed = request.model_copy(
        update={
            "status": ErasureStatus.FAILED,
            "completed_at": failed_time,
            "audit_log": audit_log,
        },
    )
    _update_request(failed)

    logger.error(
        "rgpd_erasure_failed",
        erasure_request_id=str(request_id),
        organization_id=str(request.organization_id),
        audit_log_entries=len(audit_log),
    )

    return failed
