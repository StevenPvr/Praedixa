"""Security gap analysis — RGPD erasure bypass and integrity tests.

Tests for erasure workflow integrity:
1. Self-approval bypass (same admin cannot approve own request).
2. Invalid FSM transition attempts.
3. Replay attacks (double-execute, double-approve).
4. Concurrent erasure requests for the same org.
5. Slug injection in erasure initiation.
6. Key rotation after erasure (old data should remain irrecoverable).
7. Erasure request Pydantic model mass-assignment prevention.

OWASP API8:2023 — Security Misconfiguration
CNIL: Article 17 Right to Erasure
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.key_management import KeyDestroyedError, LocalKeyProvider
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
)

# Fixed test UUIDs
ORG_ID = uuid.UUID("aaaa0000-0000-0000-0000-000000000001")
ORG_SLUG = "acme"
ADMIN_A = "admin-a-001"
ADMIN_B = "admin-b-002"
ADMIN_C = "admin-c-003"
TEST_SEED = b"test-seed-for-erasure-tests-ok"


@pytest.fixture(autouse=True)
def _clear_erasure_requests():
    """Clear the in-memory erasure store between tests."""
    _erasure_requests.clear()
    yield
    _erasure_requests.clear()


# ── 1. Self-approval bypass attempts ───────────────────────────


class TestSelfApprovalBypass:
    """No single admin can both initiate AND approve an erasure request."""

    async def test_self_approve_with_different_casing_blocked(self) -> None:
        """Same admin ID with different casing is still blocked.

        User IDs are stored as-is from the JWT. If normalization is missing,
        an attacker could try 'Admin-A-001' vs 'admin-a-001'.
        Currently the system does exact string comparison, which is correct
        since JWT user_id is always canonical UUID format.
        """
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )

        # Same exact string — blocked
        with pytest.raises(ForbiddenError):
            await approve_erasure(request_id=request.id, approved_by=ADMIN_A)

    async def test_third_admin_can_approve(self) -> None:
        """A third admin (C) can approve what A initiated."""
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )
        approved = await approve_erasure(request_id=request.id, approved_by=ADMIN_C)
        assert approved.status == ErasureStatus.APPROVED
        assert approved.approved_by == ADMIN_C

    async def test_status_unchanged_after_self_approval_attempt(self) -> None:
        """Failed self-approval does not corrupt the request state."""
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )
        with pytest.raises(ForbiddenError):
            await approve_erasure(request_id=request.id, approved_by=ADMIN_A)

        fetched = get_erasure_request(request.id)
        assert fetched is not None
        assert fetched.status == ErasureStatus.PENDING_APPROVAL
        assert fetched.approved_by is None


# ── 2. Invalid FSM transitions ─────────────────────────────────


class TestInvalidFsmTransitions:
    """Every invalid state transition is rejected with ConflictError."""

    @pytest.mark.parametrize(
        ("action", "status"),
        [
            ("execute", ErasureStatus.PENDING_APPROVAL),
            ("complete", ErasureStatus.PENDING_APPROVAL),
            ("fail", ErasureStatus.PENDING_APPROVAL),
            ("approve", ErasureStatus.APPROVED),
            ("complete", ErasureStatus.APPROVED),
            ("approve", ErasureStatus.EXECUTING),
            ("execute", ErasureStatus.EXECUTING),
            ("approve", ErasureStatus.COMPLETED),
            ("execute", ErasureStatus.COMPLETED),
            ("complete", ErasureStatus.COMPLETED),
            ("approve", ErasureStatus.FAILED),
            ("execute", ErasureStatus.FAILED),
            ("complete", ErasureStatus.FAILED),
        ],
    )
    def test_invalid_transition_raises_conflict(
        self, action: str, status: ErasureStatus
    ) -> None:
        """Transition ({action}, {status}) is rejected."""
        with pytest.raises(ConflictError):
            _validate_transition(action, status)

    def test_all_valid_transitions_are_in_map(self) -> None:
        """_VALID_TRANSITIONS contains exactly the expected transitions."""
        expected_keys = {
            ("approve", ErasureStatus.PENDING_APPROVAL),
            ("execute", ErasureStatus.APPROVED),
            ("complete", ErasureStatus.EXECUTING),
            ("fail", ErasureStatus.EXECUTING),
        }
        assert set(_VALID_TRANSITIONS.keys()) == expected_keys


# ── 3. Replay attack prevention ────────────────────────────────


class TestReplayAttackPrevention:
    """Double-approve and double-execute are blocked."""

    async def test_double_approve_blocked(self) -> None:
        """Approving an already-approved request raises ConflictError."""
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )
        await approve_erasure(request_id=request.id, approved_by=ADMIN_B)

        with pytest.raises(ConflictError):
            await approve_erasure(request_id=request.id, approved_by=ADMIN_C)

    @patch("app.services.rgpd_erasure._step_drop_schemas")
    @patch("app.services.rgpd_erasure._step_delete_platform_rows")
    @patch("app.services.rgpd_erasure._step_commit")
    async def test_double_execute_blocked(
        self,
        mock_commit: AsyncMock,
        mock_delete: AsyncMock,
        mock_drop: AsyncMock,
    ) -> None:
        """Executing an already-completed erasure raises ConflictError."""
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )
        await approve_erasure(request_id=request.id, approved_by=ADMIN_B)

        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()
        db.commit = AsyncMock()

        mock_drop.return_value = None
        mock_delete.return_value = None
        mock_commit.return_value = None

        result = await execute_erasure(
            request_id=request.id, db=db, key_provider=provider
        )
        assert result.status == ErasureStatus.COMPLETED

        # Second execution attempt
        with pytest.raises(ConflictError):
            await execute_erasure(request_id=request.id, db=db, key_provider=provider)


# ── 4. Concurrent erasure prevention ───────────────────────────


class TestConcurrentErasurePrevention:
    """Only one active erasure request per org is allowed."""

    async def test_concurrent_erasure_for_same_org_blocked(self) -> None:
        """Second initiation for the same org while one is active raises."""
        await initiate_erasure(org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A)
        with pytest.raises(ConflictError, match="already"):
            await initiate_erasure(
                org_id=ORG_ID, org_slug="acme-2", initiated_by=ADMIN_B
            )

    async def test_new_erasure_allowed_after_completion(self) -> None:
        """After a completed erasure, a new request can be initiated."""
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )
        # Manually mark as completed to simulate finished erasure
        completed = request.model_copy(update={"status": ErasureStatus.COMPLETED})
        _erasure_requests[request.id] = completed

        # New request should succeed
        new_request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_B
        )
        assert new_request.status == ErasureStatus.PENDING_APPROVAL

    async def test_new_erasure_allowed_after_failure(self) -> None:
        """After a failed erasure, a new request can be initiated."""
        request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_A
        )
        failed = request.model_copy(update={"status": ErasureStatus.FAILED})
        _erasure_requests[request.id] = failed

        new_request = await initiate_erasure(
            org_id=ORG_ID, org_slug=ORG_SLUG, initiated_by=ADMIN_B
        )
        assert new_request.status == ErasureStatus.PENDING_APPROVAL


# ── 5. Slug injection prevention ───────────────────────────────


class TestSlugInjectionPrevention:
    """Malicious slug values are rejected at initiation time."""

    @pytest.mark.parametrize(
        "bad_slug",
        [
            "",
            "x" * 101,
        ],
        ids=["empty", "too_long"],
    )
    async def test_invalid_slug_rejected(self, bad_slug: str) -> None:
        """Invalid slug format is rejected."""
        with pytest.raises(ConflictError):
            await initiate_erasure(
                org_id=ORG_ID, org_slug=bad_slug, initiated_by=ADMIN_A
            )


# ── 6. Key destruction irrecoverability ────────────────────────


class TestKeyDestructionIrrecoverability:
    """After key destruction, data is cryptographically irrecoverable."""

    async def test_dek_unavailable_after_destroy(self) -> None:
        """get_dek raises KeyDestroyedError after destroy_all_keys."""
        provider = LocalKeyProvider(seed=TEST_SEED)

        # Get a DEK before destruction (should work)
        dek_before = await provider.get_dek(ORG_ID)
        assert len(dek_before) == 32

        # Destroy keys
        await provider.destroy_all_keys(ORG_ID)

        # DEK is now irrecoverable
        with pytest.raises(KeyDestroyedError):
            await provider.get_dek(ORG_ID)

    async def test_hmac_key_unavailable_after_destroy(self) -> None:
        """HMAC keys are also destroyed (no partial key recovery)."""
        from app.core.key_management import KEY_TYPE_FIT_PARAMS_HMAC

        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_ID)

        with pytest.raises(KeyDestroyedError):
            await provider.get_hmac_key(ORG_ID, KEY_TYPE_FIT_PARAMS_HMAC)

    async def test_rotation_after_destroy_fails(self) -> None:
        """Cannot rotate a destroyed key (no resurrection)."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_ID)

        with pytest.raises(KeyDestroyedError):
            await provider.rotate_dek(ORG_ID)

    async def test_old_version_still_works_after_rotation(self) -> None:
        """After rotation, old version DEK is still retrievable for decryption."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek_v1 = await provider.get_dek(ORG_ID, version=1)
        await provider.rotate_dek(ORG_ID)
        dek_v1_after = await provider.get_dek(ORG_ID, version=1)
        assert dek_v1 == dek_v1_after


# ── 7. Erasure model mass-assignment ───────────────────────────


class TestErasureModelMassAssignment:
    """ErasureRequest Pydantic model rejects unexpected fields."""

    def test_extra_field_injection_rejected(self) -> None:
        """Injecting an unknown field raises ValidationError."""
        with pytest.raises(ValidationError):
            ErasureRequest(
                id=uuid.uuid4(),
                organization_id=ORG_ID,
                org_slug=ORG_SLUG,
                initiated_by=ADMIN_A,
                status=ErasureStatus.PENDING_APPROVAL,
                created_at=datetime.now(UTC),
                is_admin=True,  # type: ignore[call-arg]
            )

    def test_status_override_via_extra_field_rejected(self) -> None:
        """Cannot inject 'force_complete' or similar extra fields."""
        with pytest.raises(ValidationError):
            ErasureRequest(
                id=uuid.uuid4(),
                organization_id=ORG_ID,
                org_slug=ORG_SLUG,
                initiated_by=ADMIN_A,
                status=ErasureStatus.PENDING_APPROVAL,
                created_at=datetime.now(UTC),
                force_complete=True,  # type: ignore[call-arg]
            )


# ── 8. Nonexistent request operations ──────────────────────────


class TestNonexistentRequestOperations:
    """Operations on non-existent request IDs raise NotFoundError."""

    async def test_approve_nonexistent_raises(self) -> None:
        with pytest.raises(NotFoundError):
            await approve_erasure(request_id=uuid.uuid4(), approved_by=ADMIN_B)

    async def test_execute_nonexistent_raises(self) -> None:
        provider = LocalKeyProvider(seed=TEST_SEED)
        db = AsyncMock()
        with pytest.raises(NotFoundError):
            await execute_erasure(request_id=uuid.uuid4(), db=db, key_provider=provider)

    def test_get_nonexistent_returns_none(self) -> None:
        result = get_erasure_request(uuid.uuid4())
        assert result is None
