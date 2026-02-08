"""Tests for app.services.decisions — decision CRUD and lifecycle."""

import uuid
from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import NotFoundError, PraedixaError
from app.core.security import TenantFilter
from app.models.decision import DecisionPriority, DecisionStatus, DecisionType
from app.services.decisions import (
    _REVIEW_TRANSITIONS,
    InvalidTransitionError,
    create_decision,
    get_decision,
    list_decisions,
    record_outcome,
    review_decision,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


class TestInvalidTransitionError:
    """Test InvalidTransitionError exception."""

    def test_message_format(self) -> None:
        err = InvalidTransitionError("approved", "reject")
        assert "Cannot reject a decision in status 'approved'" in err.message

    def test_code_and_status(self) -> None:
        err = InvalidTransitionError("suggested", "approve")
        assert err.code == "INVALID_TRANSITION"
        assert err.status_code == 409

    def test_inherits_from_praedixa_error(self) -> None:
        err = InvalidTransitionError("x", "y")
        assert isinstance(err, PraedixaError)


class TestReviewTransitions:
    """Test the _REVIEW_TRANSITIONS mapping."""

    def test_approve_from_suggested(self) -> None:
        transitions = _REVIEW_TRANSITIONS["approve"]
        assert transitions[DecisionStatus.SUGGESTED.value] == (DecisionStatus.APPROVED)

    def test_approve_from_pending_review(self) -> None:
        transitions = _REVIEW_TRANSITIONS["approve"]
        assert transitions[DecisionStatus.PENDING_REVIEW.value] == (
            DecisionStatus.APPROVED
        )

    def test_reject_from_suggested(self) -> None:
        transitions = _REVIEW_TRANSITIONS["reject"]
        assert transitions[DecisionStatus.SUGGESTED.value] == (DecisionStatus.REJECTED)

    def test_reject_from_pending_review(self) -> None:
        transitions = _REVIEW_TRANSITIONS["reject"]
        assert transitions[DecisionStatus.PENDING_REVIEW.value] == (
            DecisionStatus.REJECTED
        )

    def test_defer_from_suggested(self) -> None:
        transitions = _REVIEW_TRANSITIONS["defer"]
        assert transitions[DecisionStatus.SUGGESTED.value] == (
            DecisionStatus.PENDING_REVIEW
        )

    def test_defer_from_pending_review_not_allowed(self) -> None:
        """Cannot defer from pending_review — not in the map."""
        assert DecisionStatus.PENDING_REVIEW.value not in _REVIEW_TRANSITIONS["defer"]


class TestListDecisions:
    """Test list_decisions service function."""

    @pytest.mark.asyncio
    async def test_returns_items_and_total(self) -> None:
        tenant = TenantFilter("org-1")
        items = [SimpleNamespace(id=uuid.uuid4())]
        session = make_mock_session(
            make_scalar_result(1),  # count
            make_scalars_result(items),  # items
        )

        result_items, total = await list_decisions(tenant, session)
        assert total == 1
        assert len(result_items) == 1

    @pytest.mark.asyncio
    async def test_count_none_defaults_to_zero(self) -> None:
        """If count returns None (or 0), total should be 0."""
        tenant = TenantFilter("org-1")
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        session = make_mock_session(
            count_result,
            make_scalars_result([]),
        )

        _, total = await list_decisions(tenant, session)
        assert total == 0

    @pytest.mark.asyncio
    async def test_status_filter(self) -> None:
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _items, total = await list_decisions(tenant, session, status_filter="suggested")
        assert total == 0

    @pytest.mark.asyncio
    async def test_invalid_status_filter_ignored(self) -> None:
        """Invalid status string should not cause errors (silently ignored)."""
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _items, total = await list_decisions(
            tenant, session, status_filter="nonexistent"
        )
        assert total == 0

    @pytest.mark.asyncio
    async def test_type_filter(self) -> None:
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _items, total = await list_decisions(tenant, session, type_filter="overtime")
        assert total == 0

    @pytest.mark.asyncio
    async def test_invalid_type_filter_ignored(self) -> None:
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _items, total = await list_decisions(
            tenant, session, type_filter="nonexistent_type"
        )
        assert total == 0

    @pytest.mark.asyncio
    async def test_status_filter_enum_instance(self) -> None:
        """When status_filter is a DecisionStatus enum, it is used directly."""
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _items, total = await list_decisions(
            tenant, session, status_filter=DecisionStatus.APPROVED
        )
        assert total == 0

    @pytest.mark.asyncio
    async def test_type_filter_enum_instance(self) -> None:
        """When type_filter is a DecisionType enum, it is used directly."""
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )

        _items, total = await list_decisions(
            tenant, session, type_filter=DecisionType.OVERTIME
        )
        assert total == 0

    @pytest.mark.asyncio
    async def test_pagination(self) -> None:
        tenant = TenantFilter("org-1")
        session = make_mock_session(
            make_scalar_result(100),
            make_scalars_result([SimpleNamespace(id=uuid.uuid4())]),
        )

        _items, total = await list_decisions(tenant, session, limit=10, offset=20)
        assert total == 100


class TestGetDecision:
    """Test get_decision service function."""

    @pytest.mark.asyncio
    async def test_found(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(id=d_id, title="Test Decision")

        session = make_mock_session(make_scalar_result(decision))

        result = await get_decision(d_id, tenant, session)
        assert result.title == "Test Decision"

    @pytest.mark.asyncio
    async def test_not_found_raises(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()

        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError):
            await get_decision(d_id, tenant, session)


class TestCreateDecision:
    """Test create_decision service function."""

    @pytest.mark.asyncio
    async def test_successful_creation(self) -> None:
        tenant = TenantFilter("550e8400-e29b-41d4-a716-446655440000")
        dept_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(dept_id),  # dept exists
            make_scalar_result(None),  # no duplicate
        )

        await create_decision(
            tenant,
            session,
            department_id=dept_id,
            type=DecisionType.OVERTIME,
            priority=DecisionPriority.HIGH,
            title="Test Decision",
            description="A test decision",
            rationale="Because testing",
            target_period={"startDate": "2026-01-01", "endDate": "2026-01-31"},
            confidence_score=85.0,
            user_id="user-1",
        )

        session.add.assert_called_once()
        session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_department_not_found(self) -> None:
        tenant = TenantFilter("550e8400-e29b-41d4-a716-446655440000")
        dept_id = uuid.uuid4()

        session = make_mock_session(make_scalar_result(None))  # dept not found

        with pytest.raises(NotFoundError) as exc_info:
            await create_decision(
                tenant,
                session,
                department_id=dept_id,
                type=DecisionType.OVERTIME,
                priority=DecisionPriority.HIGH,
                title="Test",
                description="Desc",
                rationale="Rationale",
                target_period={},
                confidence_score=50.0,
                user_id="u1",
            )
        assert "Department" in exc_info.value.message

    @pytest.mark.asyncio
    async def test_duplicate_returns_existing(self) -> None:
        """Idempotence: recent duplicate returns existing decision."""
        tenant = TenantFilter("550e8400-e29b-41d4-a716-446655440000")
        dept_id = uuid.uuid4()
        existing = SimpleNamespace(id=uuid.uuid4(), title="Existing")

        session = make_mock_session(
            make_scalar_result(dept_id),  # dept exists
            make_scalar_result(existing),  # duplicate found
        )

        result = await create_decision(
            tenant,
            session,
            department_id=dept_id,
            type=DecisionType.OVERTIME,
            priority=DecisionPriority.HIGH,
            title="New Decision",
            description="Desc",
            rationale="Rationale",
            target_period={},
            confidence_score=50.0,
            user_id="u1",
        )

        assert result is existing
        session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_sanitizes_text_fields(self) -> None:
        """Title, description, rationale should be sanitized."""
        tenant = TenantFilter("550e8400-e29b-41d4-a716-446655440000")
        dept_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(dept_id),
            make_scalar_result(None),
        )

        with patch("app.services.decisions.sanitize_text") as mock_sanitize:
            mock_sanitize.side_effect = lambda text, **kw: text.strip()

            await create_decision(
                tenant,
                session,
                department_id=dept_id,
                type=DecisionType.OVERTIME,
                priority=DecisionPriority.MEDIUM,
                title="<script>xss</script>",
                description="desc",
                rationale="rationale",
                target_period={},
                confidence_score=50.0,
                user_id="u1",
            )

            assert mock_sanitize.call_count == 3

    @pytest.mark.asyncio
    async def test_optional_fields(self) -> None:
        """Optional fields: estimated_cost, cost_of_inaction, etc."""
        tenant = TenantFilter("550e8400-e29b-41d4-a716-446655440000")
        dept_id = uuid.uuid4()

        session = make_mock_session(
            make_scalar_result(dept_id),
            make_scalar_result(None),
        )

        await create_decision(
            tenant,
            session,
            department_id=dept_id,
            type=DecisionType.EXTERNAL,
            priority=DecisionPriority.LOW,
            title="Title",
            description="Desc",
            rationale="Rationale",
            target_period={},
            confidence_score=75.0,
            user_id="u1",
            estimated_cost=1500.0,
            cost_of_inaction=5000.0,
            risk_indicators={"level": "high"},
            forecast_run_id=uuid.uuid4(),
        )

        session.add.assert_called_once()


class TestReviewDecision:
    """Test review_decision service function."""

    @pytest.mark.asyncio
    async def test_approve_from_suggested(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),  # get_decision
            MagicMock(),  # update
        )

        result = await review_decision(
            d_id,
            tenant,
            session,
            reviewer_id="550e8400-e29b-41d4-a716-446655440000",
            action="approve",
        )

        assert result.status == DecisionStatus.APPROVED
        assert result.reviewed_by == uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
        assert result.reviewed_at is not None

    @pytest.mark.asyncio
    async def test_reject_from_pending_review(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.PENDING_REVIEW,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await review_decision(
            d_id,
            tenant,
            session,
            reviewer_id="550e8400-e29b-41d4-a716-446655440000",
            action="reject",
        )
        assert result.status == DecisionStatus.REJECTED

    @pytest.mark.asyncio
    async def test_defer_from_suggested(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await review_decision(
            d_id,
            tenant,
            session,
            reviewer_id="550e8400-e29b-41d4-a716-446655440000",
            action="defer",
        )
        assert result.status == DecisionStatus.PENDING_REVIEW

    @pytest.mark.asyncio
    async def test_invalid_transition_raises(self) -> None:
        """Approve from REJECTED should fail."""
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.REJECTED,
            organization_id="org-1",
        )

        session = make_mock_session(make_scalar_result(decision))

        with pytest.raises(InvalidTransitionError):
            await review_decision(
                d_id,
                tenant,
                session,
                reviewer_id="550e8400-e29b-41d4-a716-446655440000",
                action="approve",
            )

    @pytest.mark.asyncio
    async def test_unknown_action_raises(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(make_scalar_result(decision))

        with pytest.raises(InvalidTransitionError):
            await review_decision(
                d_id,
                tenant,
                session,
                reviewer_id="550e8400-e29b-41d4-a716-446655440000",
                action="unknown_action",
            )

    @pytest.mark.asyncio
    async def test_notes_sanitized(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        with patch("app.services.decisions.sanitize_text") as mock_sanitize:
            mock_sanitize.return_value = "clean notes"

            await review_decision(
                d_id,
                tenant,
                session,
                reviewer_id="550e8400-e29b-41d4-a716-446655440000",
                action="approve",
                notes="<script>xss</script>",
            )
            # sanitize_text should be called for notes
            mock_sanitize.assert_called()

    @pytest.mark.asyncio
    async def test_deadline_only_on_approve(self) -> None:
        """Deadline should only be set when action is 'approve'."""
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await review_decision(
            d_id,
            tenant,
            session,
            reviewer_id="550e8400-e29b-41d4-a716-446655440000",
            action="approve",
            deadline=date(2026, 3, 1),
        )
        assert result.implementation_deadline == date(2026, 3, 1)

    @pytest.mark.asyncio
    async def test_deadline_ignored_on_reject(self) -> None:
        """Deadline should be ignored when action is 'reject'."""
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await review_decision(
            d_id,
            tenant,
            session,
            reviewer_id="550e8400-e29b-41d4-a716-446655440000",
            action="reject",
            deadline=date(2026, 3, 1),
        )
        has_deadline = hasattr(result, "implementation_deadline")
        if has_deadline:
            assert result.implementation_deadline != date(2026, 3, 1)

    @pytest.mark.asyncio
    async def test_status_as_string(self) -> None:
        """When status is already a string (not enum), should still work."""
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status="suggested",  # string, not enum
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await review_decision(
            d_id,
            tenant,
            session,
            reviewer_id="550e8400-e29b-41d4-a716-446655440000",
            action="approve",
        )
        assert result.status == DecisionStatus.APPROVED


class TestRecordOutcome:
    """Test record_outcome service function."""

    @pytest.mark.asyncio
    async def test_successful_outcome(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.APPROVED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await record_outcome(
            d_id,
            tenant,
            session,
            recorder_id="550e8400-e29b-41d4-a716-446655440000",
            effective=True,
            actual_impact="Improved capacity by 15%",
        )

        assert result.status == DecisionStatus.IMPLEMENTED
        expected_uuid = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
        assert result.implemented_by == expected_uuid
        assert result.outcome["effective"] is True

    @pytest.mark.asyncio
    async def test_non_approved_raises(self) -> None:
        """Only APPROVED decisions can have outcomes recorded."""
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.SUGGESTED,
            organization_id="org-1",
        )

        session = make_mock_session(make_scalar_result(decision))

        with pytest.raises(InvalidTransitionError):
            await record_outcome(
                d_id,
                tenant,
                session,
                recorder_id="550e8400-e29b-41d4-a716-446655440000",
                effective=True,
                actual_impact="Impact",
            )

    @pytest.mark.asyncio
    async def test_rejected_status_raises(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.REJECTED,
            organization_id="org-1",
        )

        session = make_mock_session(make_scalar_result(decision))

        with pytest.raises(InvalidTransitionError):
            await record_outcome(
                d_id,
                tenant,
                session,
                recorder_id="550e8400-e29b-41d4-a716-446655440000",
                effective=False,
                actual_impact="N/A",
            )

    @pytest.mark.asyncio
    async def test_optional_actual_cost(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.APPROVED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await record_outcome(
            d_id,
            tenant,
            session,
            recorder_id="550e8400-e29b-41d4-a716-446655440000",
            effective=True,
            actual_cost=1500.0,
            actual_impact="Good outcome",
        )
        assert result.outcome["actual_cost"] == 1500.0

    @pytest.mark.asyncio
    async def test_optional_lessons_learned(self) -> None:
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status=DecisionStatus.APPROVED,
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await record_outcome(
            d_id,
            tenant,
            session,
            recorder_id="550e8400-e29b-41d4-a716-446655440000",
            effective=False,
            actual_impact="Did not work",
            lessons_learned="Should have used external",
        )
        assert "lessons_learned" in result.outcome

    @pytest.mark.asyncio
    async def test_status_as_string(self) -> None:
        """When status is a plain string 'approved'."""
        tenant = TenantFilter("org-1")
        d_id = uuid.uuid4()
        decision = SimpleNamespace(
            id=d_id,
            status="approved",
            organization_id="org-1",
        )

        session = make_mock_session(
            make_scalar_result(decision),
            MagicMock(),
        )

        result = await record_outcome(
            d_id,
            tenant,
            session,
            recorder_id="550e8400-e29b-41d4-a716-446655440000",
            effective=True,
            actual_impact="OK",
        )
        assert result.status == DecisionStatus.IMPLEMENTED
