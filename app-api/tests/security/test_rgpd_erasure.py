"""RGPD erasure service tests for the DB-backed implementation."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.services.rgpd_erasure import (
    _VALID_TRANSITIONS,
    _VERIFICATION_TABLES,
    ErasureRequest,
    ErasureStatus,
    _validate_transition,
    approve_erasure,
    execute_erasure,
    get_erasure_request,
    initiate_erasure,
    verify_erasure,
)

ORG_ID = uuid.UUID("aaaa0000-0000-0000-0000-000000000001")
ORG_SLUG = "acme"
ADMIN_A = "admin-a-001"
ADMIN_B = "admin-b-002"


class _ScalarResult:
    def __init__(self, value: int) -> None:
        self.value = value

    def scalar_one(self) -> int:
        return self.value


@pytest.fixture
def db() -> AsyncMock:
    session = AsyncMock()
    session.add = MagicMock()
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


def _response(
    *,
    request_id: uuid.UUID,
    status: ErasureStatus,
    approved_by: str | None = None,
) -> ErasureRequest:
    return ErasureRequest(
        id=request_id,
        organization_id=ORG_ID,
        org_slug=ORG_SLUG,
        initiated_by=ADMIN_A,
        approved_by=approved_by,
        status=status,
        created_at=datetime.now(UTC),
        completed_at=None,
        audit_log=["ok"],
    )


class TestTransitions:
    def test_valid_transition_map(self) -> None:
        assert _VALID_TRANSITIONS[("approve", ErasureStatus.PENDING_APPROVAL)] == (
            ErasureStatus.APPROVED
        )
        assert _VALID_TRANSITIONS[("execute", ErasureStatus.APPROVED)] == (
            ErasureStatus.EXECUTING
        )

    @pytest.mark.parametrize(
        ("action", "status"),
        [
            ("execute", ErasureStatus.PENDING_APPROVAL),
            ("approve", ErasureStatus.APPROVED),
            ("complete", ErasureStatus.APPROVED),
            ("approve", ErasureStatus.FAILED),
        ],
    )
    def test_invalid_transition_raises(
        self,
        action: str,
        status: ErasureStatus,
    ) -> None:
        with pytest.raises(ConflictError):
            _validate_transition(action, status)


class TestInitiation:
    async def test_initiate_rejects_invalid_slug(self, db: AsyncMock) -> None:
        with pytest.raises(ConflictError):
            await initiate_erasure(
                org_id=ORG_ID,
                org_slug="",
                initiated_by=ADMIN_A,
                db=db,
            )

    async def test_initiate_creates_pending_request(self, db: AsyncMock) -> None:
        expected = _response(
            request_id=uuid.uuid4(),
            status=ErasureStatus.PENDING_APPROVAL,
        )
        with (
            patch(
                "app.services.rgpd_erasure._ensure_no_active_request",
                new=AsyncMock(),
            ),
            patch(
                "app.services.rgpd_erasure._flush_with_conflict",
                new=AsyncMock(),
            ),
            patch(
                "app.services.rgpd_erasure._append_audit_event",
                new=AsyncMock(),
            ),
            patch(
                "app.services.rgpd_erasure._build_response",
                new=AsyncMock(return_value=expected),
            ),
        ):
            result = await initiate_erasure(
                org_id=ORG_ID,
                org_slug=ORG_SLUG,
                initiated_by=ADMIN_A,
                db=db,
            )

        assert result.status == ErasureStatus.PENDING_APPROVAL
        db.add.assert_called_once()


class TestApproval:
    async def test_approve_not_found(self, db: AsyncMock) -> None:
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=None),
            ),
            pytest.raises(NotFoundError),
        ):
            await approve_erasure(uuid.uuid4(), ADMIN_B, db)

    async def test_approve_self_forbidden(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.PENDING_APPROVAL)
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            pytest.raises(ForbiddenError),
        ):
            await approve_erasure(row.id, ADMIN_A, db)

    async def test_approve_sets_status_and_approver(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.PENDING_APPROVAL)
        expected = _response(
            request_id=row.id,
            status=ErasureStatus.APPROVED,
            approved_by=ADMIN_B,
        )
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            patch(
                "app.services.rgpd_erasure._append_audit_event",
                new=AsyncMock(),
            ),
            patch(
                "app.services.rgpd_erasure._build_response",
                new=AsyncMock(return_value=expected),
            ),
        ):
            result = await approve_erasure(row.id, ADMIN_B, db)

        assert result.status == ErasureStatus.APPROVED
        assert row.status == ErasureStatus.APPROVED
        assert row.approved_by == ADMIN_B


class TestExecution:
    async def test_execute_not_found(self, db: AsyncMock) -> None:
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=None),
            ),
            pytest.raises(NotFoundError),
        ):
            await execute_erasure(uuid.uuid4(), db, AsyncMock())

    async def test_execute_rejects_non_approved(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.PENDING_APPROVAL)
        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            pytest.raises(ConflictError),
        ):
            await execute_erasure(row.id, db, AsyncMock())

    async def test_execute_success_path_completes_request(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.APPROVED)
        expected = _response(request_id=row.id, status=ErasureStatus.COMPLETED)

        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            patch(
                "app.services.rgpd_erasure._append_audit_event",
                new=AsyncMock(),
            ),
            patch(
                "app.services.rgpd_erasure._step_crypto_shred",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.rgpd_erasure._step_drop_schemas",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.rgpd_erasure._step_delete_platform_rows",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.rgpd_erasure._step_commit",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.rgpd_erasure._build_response",
                new=AsyncMock(return_value=expected),
            ),
        ):
            result = await execute_erasure(row.id, db, AsyncMock())

        assert result.status == ErasureStatus.COMPLETED
        assert row.status == ErasureStatus.COMPLETED
        assert row.completed_at is not None

    async def test_execute_short_circuits_on_failed_step(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.APPROVED)
        failed = _response(request_id=row.id, status=ErasureStatus.FAILED)

        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            patch(
                "app.services.rgpd_erasure._append_audit_event",
                new=AsyncMock(),
            ),
            patch(
                "app.services.rgpd_erasure._step_crypto_shred",
                new=AsyncMock(return_value=failed),
            ),
            patch(
                "app.services.rgpd_erasure._step_drop_schemas",
                new=AsyncMock(return_value=None),
            ) as step_drop,
        ):
            result = await execute_erasure(row.id, db, AsyncMock())

        assert result.status == ErasureStatus.FAILED
        step_drop.assert_not_called()


class TestVerificationAndRead:
    async def test_verify_erasure_returns_table_counts(self, db: AsyncMock) -> None:
        db.execute = AsyncMock(
            side_effect=[_ScalarResult(0) for _ in _VERIFICATION_TABLES]
        )

        counts = await verify_erasure(ORG_ID, db)

        assert set(counts) == {name for name, _ in _VERIFICATION_TABLES}
        assert all(value == 0 for value in counts.values())

    async def test_get_erasure_request_not_found_returns_none(
        self,
        db: AsyncMock,
    ) -> None:
        with patch(
            "app.services.rgpd_erasure._load_request_row",
            new=AsyncMock(return_value=None),
        ):
            result = await get_erasure_request(uuid.uuid4(), db)

        assert result is None

    async def test_get_erasure_request_returns_payload(self, db: AsyncMock) -> None:
        row = _request_row(status=ErasureStatus.APPROVED)
        expected = _response(request_id=row.id, status=ErasureStatus.APPROVED)

        with (
            patch(
                "app.services.rgpd_erasure._load_request_row",
                new=AsyncMock(return_value=row),
            ),
            patch(
                "app.services.rgpd_erasure._build_response",
                new=AsyncMock(return_value=expected),
            ),
        ):
            result = await get_erasure_request(row.id, db)

        assert result is not None
        assert result.id == row.id
        assert result.status == ErasureStatus.APPROVED
