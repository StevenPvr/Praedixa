"""RGPD bypass and hardening regression tests for the DB-backed workflow."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.key_management import KeyDestroyedError, LocalKeyProvider
from app.services.rgpd_erasure import (
    ErasureRequest,
    ErasureStatus,
    _validate_transition,
    approve_erasure,
    execute_erasure,
    get_erasure_request,
    initiate_erasure,
)

ORG_ID = uuid.UUID("aaaa0000-0000-0000-0000-000000000001")
ORG_SLUG = "acme"
ADMIN_A = "admin-a-001"
ADMIN_B = "admin-b-002"
TEST_SEED = b"test-seed-for-erasure-tests-ok"


@pytest.fixture
def db() -> AsyncMock:
    session = AsyncMock()
    session.flush = AsyncMock()
    session.execute = AsyncMock()
    return session


def _request_row(*, status: ErasureStatus) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        org_slug=ORG_SLUG,
        initiated_by=ADMIN_A,
        approved_by=None,
        status=status,
        created_at=datetime.now(UTC),
        completed_at=None,
    )


class TestTransitionBypass:
    @pytest.mark.parametrize(
        ("action", "status"),
        [
            ("execute", ErasureStatus.PENDING_APPROVAL),
            ("approve", ErasureStatus.APPROVED),
            ("complete", ErasureStatus.APPROVED),
            ("execute", ErasureStatus.COMPLETED),
        ],
    )
    def test_invalid_transitions_rejected(
        self,
        action: str,
        status: ErasureStatus,
    ) -> None:
        with pytest.raises(ConflictError):
            _validate_transition(action, status)


class TestInitiationValidation:
    @pytest.mark.parametrize("slug", ["", "x" * 101])
    async def test_invalid_slug_rejected(self, db: AsyncMock, slug: str) -> None:
        with pytest.raises(ConflictError):
            await initiate_erasure(
                org_id=ORG_ID,
                org_slug=slug,
                initiated_by=ADMIN_A,
                db=db,
            )

    def test_erasure_request_model_forbids_extra_fields(self) -> None:
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


class TestApprovalBypass:
    async def test_self_approval_rejected(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.PENDING_APPROVAL)
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            pytest.raises(ForbiddenError),
        ):
            await approve_erasure(row.id, ADMIN_A, db)

    async def test_approve_nonexistent_request_rejected(self, db: AsyncMock) -> None:
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=None),
            ),
            pytest.raises(NotFoundError),
        ):
            await approve_erasure(uuid.uuid4(), ADMIN_B, db)


class TestExecutionBypass:
    async def test_execute_nonexistent_request_rejected(self, db: AsyncMock) -> None:
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=None),
            ),
            pytest.raises(NotFoundError),
        ):
            await execute_erasure(uuid.uuid4(), db, AsyncMock())

    async def test_execute_before_approval_rejected(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.PENDING_APPROVAL)
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            pytest.raises(ConflictError),
        ):
            await execute_erasure(row.id, db, AsyncMock())

    async def test_nonexistent_read_returns_none(self, db: AsyncMock) -> None:
        with patch(
            "app.services.rgpd_erasure._load_request_row",
            new=AsyncMock(return_value=None),
        ):
            result = await get_erasure_request(uuid.uuid4(), db)
        assert result is None


class TestKeyIrrecoverability:
    async def test_dek_unavailable_after_destroy(self) -> None:
        provider = LocalKeyProvider(seed=TEST_SEED)
        _ = await provider.get_dek(ORG_ID)

        await provider.destroy_all_keys(ORG_ID)

        with pytest.raises(KeyDestroyedError):
            await provider.get_dek(ORG_ID)

    async def test_hmac_key_unavailable_after_destroy(self) -> None:
        from app.core.key_management import KEY_TYPE_FIT_PARAMS_HMAC

        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_ID)

        with pytest.raises(KeyDestroyedError):
            await provider.get_hmac_key(ORG_ID, KEY_TYPE_FIT_PARAMS_HMAC)

    async def test_rotation_after_destroy_fails(self) -> None:
        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_ID)

        with pytest.raises(KeyDestroyedError):
            await provider.rotate_dek(ORG_ID)
