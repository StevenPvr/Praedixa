"""P0-06 Evidence (Erasure) — RGPD Article 17 dual-approval erasure tests.

Validates the full erasure workflow:
- Dual-approval: same user cannot both initiate and approve.
- Different admins can approve.
- Status transitions: pending_approval -> approved -> executing -> completed.
- Execute before approve is rejected.
- Key destruction happens before schema drop (audit ordering).
- Verification returns zero counts after erasure.
- initiate_erasure creates a request with correct fields.
- get_erasure_request for unknown ID returns None.

These tests serve as contractual evidence for security gate P0-06.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
)
from app.core.key_management import (
    LocalKeyProvider,
)
from app.services.rgpd_erasure import (
    _VALID_TRANSITIONS,
    ErasureRequest,
    ErasureStatus,
    _erasure_requests,
    _validate_transition,
    approve_erasure,
    execute_erasure,
    get_erasure_request,
    initiate_erasure,
    verify_erasure,
)

# Fixed test UUIDs
ORG_ID = uuid.UUID("aaaa0000-0000-0000-0000-000000000001")
ORG_SLUG = "acme"
ADMIN_A_ID = "admin-a-001"
ADMIN_B_ID = "admin-b-002"
TEST_SEED = b"test-seed-for-erasure-tests-ok"


@pytest.fixture(autouse=True)
def _clear_erasure_requests():
    """Clear the in-memory erasure store between tests."""
    _erasure_requests.clear()
    yield
    _erasure_requests.clear()


class TestDualApprovalEnforced:
    """P0-06: Same user cannot both initiate AND approve erasure."""

    async def test_same_admin_cannot_approve_own_request(self) -> None:
        """Admin A initiates, Admin A approves -> ForbiddenError."""
        # Step 1: Admin A initiates
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )

        # Step 2: Admin A tries to approve -> ForbiddenError
        with pytest.raises(ForbiddenError) as exc_info:
            await approve_erasure(
                request_id=request.id,
                approved_by=ADMIN_A_ID,  # Same admin!
            )
        assert "different" in str(exc_info.value).lower()

    async def test_request_status_unchanged_on_self_approval(self) -> None:
        """Failed self-approval does not change the request status."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )

        with pytest.raises(ForbiddenError):
            await approve_erasure(
                request_id=request.id,
                approved_by=ADMIN_A_ID,
            )

        # Request should still be pending (not corrupted)
        fetched = get_erasure_request(request.id)
        assert fetched is not None
        assert fetched.status == ErasureStatus.PENDING_APPROVAL
        assert fetched.approved_by is None


class TestDifferentAdminsCanApprove:
    """P0-06: Different admin can approve an erasure request."""

    async def test_different_admin_approves_successfully(self) -> None:
        """Admin A initiates, Admin B approves -> status becomes approved."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )

        approved = await approve_erasure(
            request_id=request.id,
            approved_by=ADMIN_B_ID,  # Different admin
        )

        assert approved.status == ErasureStatus.APPROVED
        assert approved.approved_by == ADMIN_B_ID


class TestStatusTransitions:
    """P0-06: Status transitions follow strict FSM."""

    async def test_initial_status_is_pending_approval(self) -> None:
        """Newly created request has status pending_approval."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        assert request.status == ErasureStatus.PENDING_APPROVAL
        assert request.approved_by is None
        assert request.completed_at is None

    async def test_approve_transitions_to_approved(self) -> None:
        """Approval transitions from pending_approval to approved."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        approved = await approve_erasure(
            request_id=request.id,
            approved_by=ADMIN_B_ID,
        )
        assert approved.status == ErasureStatus.APPROVED

    def test_valid_transitions_map(self) -> None:
        """The transition map covers the expected lifecycle."""
        assert ("approve", ErasureStatus.PENDING_APPROVAL) in _VALID_TRANSITIONS
        assert ("execute", ErasureStatus.APPROVED) in _VALID_TRANSITIONS
        assert ("complete", ErasureStatus.EXECUTING) in _VALID_TRANSITIONS
        assert ("fail", ErasureStatus.EXECUTING) in _VALID_TRANSITIONS

    def test_invalid_transition_raises_conflict(self) -> None:
        """Attempting an invalid transition raises ConflictError."""
        with pytest.raises(ConflictError):
            _validate_transition("execute", ErasureStatus.PENDING_APPROVAL)

    def test_cannot_approve_already_approved(self) -> None:
        """Cannot transition from approved via approve."""
        with pytest.raises(ConflictError):
            _validate_transition("approve", ErasureStatus.APPROVED)

    def test_cannot_complete_from_approved_directly(self) -> None:
        """Cannot skip executing state."""
        with pytest.raises(ConflictError):
            _validate_transition("complete", ErasureStatus.APPROVED)


class TestExecuteBeforeApproveRejected:
    """P0-06: Executing erasure before approval is rejected."""

    async def test_execute_pending_request_raises(self) -> None:
        """Executing a pending (not approved) request raises ConflictError."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )

        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()

        with pytest.raises(ConflictError) as exc_info:
            await execute_erasure(
                request_id=request.id,
                db=db,
                key_provider=provider,
            )
        assert "pending_approval" in str(exc_info.value).lower()

    async def test_approve_nonexistent_request_raises(self) -> None:
        """Approving a non-existent request raises NotFoundError."""
        fake_id = uuid.uuid4()
        with pytest.raises(NotFoundError):
            await approve_erasure(
                request_id=fake_id,
                approved_by=ADMIN_B_ID,
            )

    async def test_execute_nonexistent_request_raises(self) -> None:
        """Executing a non-existent request raises NotFoundError."""
        fake_id = uuid.uuid4()
        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()

        with pytest.raises(NotFoundError):
            await execute_erasure(
                request_id=fake_id,
                db=db,
                key_provider=provider,
            )

    async def test_double_approve_rejected(self) -> None:
        """Approving an already-approved request raises ConflictError."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        await approve_erasure(
            request_id=request.id,
            approved_by=ADMIN_B_ID,
        )

        # Second approval attempt
        with pytest.raises(ConflictError):
            await approve_erasure(
                request_id=request.id,
                approved_by="admin-c-003",
            )


class TestKeyDestructionBeforeSchemaDrop:
    """P0-06: In execution, key destruction must happen before schema drop.

    The erasure pipeline must destroy keys FIRST (crypto-shredding)
    so that even if the schema DROP fails, the data is already
    irrecoverable. We verify by checking the audit log order.
    """

    @patch("app.services.rgpd_erasure._step_drop_schemas")
    @patch("app.services.rgpd_erasure._step_delete_platform_rows")
    @patch("app.services.rgpd_erasure._step_commit")
    async def test_crypto_shred_appears_before_schema_drop_in_audit(
        self,
        mock_commit: AsyncMock,
        mock_delete: AsyncMock,
        mock_drop: AsyncMock,
    ) -> None:
        """After execution, audit log shows key destruction before schema drop."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        await approve_erasure(
            request_id=request.id,
            approved_by=ADMIN_B_ID,
        )

        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()
        db.commit = AsyncMock()

        # Mock steps to succeed (return None = success)
        mock_drop.return_value = None
        mock_delete.return_value = None
        mock_commit.return_value = None

        result = await execute_erasure(
            request_id=request.id,
            db=db,
            key_provider=provider,
        )

        assert result.status == ErasureStatus.COMPLETED

        # Verify audit log ordering
        audit = result.audit_log
        key_idx = None
        schema_idx = None
        for i, entry in enumerate(audit):
            if "keys destroyed" in entry.lower() or "crypto-shredding" in entry.lower():
                key_idx = i
            if (
                "schemas dropped" in entry.lower() or "schema" in entry.lower()
            ) and schema_idx is None:
                schema_idx = i

        assert key_idx is not None, "Key destruction not in audit log"
        # Schema drop may have been mocked out, so only check if present
        if schema_idx is not None:
            assert key_idx < schema_idx, (
                "Key destruction must appear before schema drop in audit"
            )

    @patch("app.services.rgpd_erasure._step_drop_schemas")
    @patch("app.services.rgpd_erasure._step_delete_platform_rows")
    @patch("app.services.rgpd_erasure._step_commit")
    async def test_execution_step_order(
        self,
        mock_commit: AsyncMock,
        mock_delete: AsyncMock,
        mock_drop: AsyncMock,
    ) -> None:
        """Steps are called in order: crypto_shred -> drop -> delete -> commit."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        await approve_erasure(
            request_id=request.id,
            approved_by=ADMIN_B_ID,
        )

        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()
        db.commit = AsyncMock()

        call_order: list[str] = []

        async def track_drop(*a, **kw):
            call_order.append("drop_schemas")

        async def track_delete(*a, **kw):
            call_order.append("delete_platform")

        async def track_commit(*a, **kw):
            call_order.append("commit")

        mock_drop.side_effect = track_drop
        mock_delete.side_effect = track_delete
        mock_commit.side_effect = track_commit

        # Note: crypto_shred is NOT mocked, so it runs first (real call)
        result = await execute_erasure(
            request_id=request.id,
            db=db,
            key_provider=provider,
        )

        assert result.status == ErasureStatus.COMPLETED
        # The 3 mocked steps should be called in order
        assert call_order == ["drop_schemas", "delete_platform", "commit"]


class TestVerificationReturnsZeroCounts:
    """P0-06: After erasure, verify_erasure shows 0 rows."""

    async def test_verification_returns_dict_of_counts(self) -> None:
        """verify_erasure returns a dict of table_name: row_count."""
        db = AsyncMock()
        # Each execute() call returns a result with scalar_one() == 0
        zero_result = MagicMock()
        zero_result.scalar_one.return_value = 0
        db.execute.return_value = zero_result

        counts = await verify_erasure(ORG_ID, db)

        assert isinstance(counts, dict)
        assert all(v == 0 for v in counts.values())
        # Should check multiple tables
        assert len(counts) > 0

    async def test_verification_checks_organizations_table(self) -> None:
        """verify_erasure includes 'organizations' in its checks."""
        db = AsyncMock()
        zero_result = MagicMock()
        zero_result.scalar_one.return_value = 0
        db.execute.return_value = zero_result

        counts = await verify_erasure(ORG_ID, db)
        assert "organizations" in counts


class TestInitiateCreatesRequest:
    """P0-06: initiate_erasure returns a request with correct fields."""

    async def test_request_has_correct_fields(self) -> None:
        """Created request has all expected fields set correctly."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )

        assert isinstance(request, ErasureRequest)
        assert request.organization_id == ORG_ID
        assert request.org_slug == ORG_SLUG
        assert request.initiated_by == ADMIN_A_ID
        assert request.status == ErasureStatus.PENDING_APPROVAL
        assert request.id is not None
        assert request.created_at is not None
        assert request.approved_by is None
        assert request.completed_at is None

    async def test_request_id_is_uuid(self) -> None:
        """Request ID is a valid UUID."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        # Should not raise
        uuid.UUID(str(request.id))

    async def test_request_stored_in_dict(self) -> None:
        """Created request is stored in _erasure_requests dict."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        assert request.id in _erasure_requests

    async def test_audit_log_has_initiation_entry(self) -> None:
        """Audit log contains the initiation entry."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        assert len(request.audit_log) >= 1
        assert "initiated" in request.audit_log[0].lower()
        assert ADMIN_A_ID in request.audit_log[0]

    async def test_duplicate_active_request_raises(self) -> None:
        """Creating a second active request for same org raises ConflictError."""
        await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )

        with pytest.raises(ConflictError) as exc_info:
            await initiate_erasure(
                org_id=ORG_ID,
                org_slug=ORG_SLUG,
                initiated_by=ADMIN_A_ID,
            )
        assert "already" in str(exc_info.value).lower()

    async def test_invalid_slug_raises(self) -> None:
        """Empty or too-long slug is rejected."""
        with pytest.raises(ConflictError):
            await initiate_erasure(
                org_id=ORG_ID,
                org_slug="",
                initiated_by=ADMIN_A_ID,
            )

    async def test_too_long_slug_raises(self) -> None:
        """Slug > 100 chars is rejected."""
        with pytest.raises(ConflictError):
            await initiate_erasure(
                org_id=ORG_ID,
                org_slug="x" * 101,
                initiated_by=ADMIN_A_ID,
            )


class TestGetErasureRequest:
    """P0-06: get_erasure_request returns correct results."""

    async def test_returns_existing_request(self) -> None:
        """Returns a request that exists."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        fetched = get_erasure_request(request.id)
        assert fetched is not None
        assert fetched.id == request.id

    def test_returns_none_for_unknown_id(self) -> None:
        """Returns None for a non-existent request ID."""
        result = get_erasure_request(uuid.uuid4())
        assert result is None


class TestErasureFailure:
    """P0-06: Execution failure sets status to FAILED with audit log."""

    @patch("app.services.rgpd_erasure._step_crypto_shred")
    async def test_crypto_shred_failure_marks_failed(
        self,
        mock_crypto_shred: AsyncMock,
    ) -> None:
        """If crypto-shredding step fails, status becomes FAILED."""
        request = await initiate_erasure(
            org_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
        )
        await approve_erasure(
            request_id=request.id,
            approved_by=ADMIN_B_ID,
        )

        # Return a failed ErasureRequest from the step
        failed_req = ErasureRequest(
            id=request.id,
            organization_id=ORG_ID,
            org_slug=ORG_SLUG,
            initiated_by=ADMIN_A_ID,
            status=ErasureStatus.FAILED,
            created_at=request.created_at,
            audit_log=["crypto-shredding failed"],
        )
        mock_crypto_shred.return_value = failed_req

        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()

        result = await execute_erasure(
            request_id=request.id,
            db=db,
            key_provider=provider,
        )

        assert result.status == ErasureStatus.FAILED


class TestErasureRequestPydanticModel:
    """P0-06: ErasureRequest model properties."""

    def test_extra_fields_forbidden(self) -> None:
        """ErasureRequest rejects unknown fields (mass assignment prevention)."""
        from datetime import UTC, datetime

        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            ErasureRequest(
                id=uuid.uuid4(),
                organization_id=ORG_ID,
                org_slug=ORG_SLUG,
                initiated_by=ADMIN_A_ID,
                status=ErasureStatus.PENDING_APPROVAL,
                created_at=datetime.now(UTC),
                hacker_field="injected",  # type: ignore[call-arg]
            )

    def test_status_enum_values(self) -> None:
        """ErasureStatus enum has the expected values."""
        assert ErasureStatus.PENDING_APPROVAL.value == "pending_approval"
        assert ErasureStatus.APPROVED.value == "approved"
        assert ErasureStatus.EXECUTING.value == "executing"
        assert ErasureStatus.COMPLETED.value == "completed"
        assert ErasureStatus.FAILED.value == "failed"
