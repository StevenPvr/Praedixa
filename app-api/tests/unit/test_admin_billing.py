"""Tests for app.services.admin_billing — plan management and usage tracking."""

import uuid
from types import SimpleNamespace

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.models.organization import SubscriptionPlan
from app.services.admin_billing import (
    PLAN_LIMITS,
    change_plan,
    get_billing_info,
    get_plan_history,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


def _make_org(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "name": "Billing Org",
        "slug": "billing-org",
        "plan": SubscriptionPlan.STARTER,
        "status": "active",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestPlanLimits:
    """Tests for PLAN_LIMITS constant."""

    def test_all_plans_present(self) -> None:
        assert set(PLAN_LIMITS.keys()) == {
            "free",
            "starter",
            "professional",
            "enterprise",
        }

    def test_free_has_lowest_limits(self) -> None:
        assert PLAN_LIMITS["free"]["users"] == 3
        assert PLAN_LIMITS["free"]["datasets"] == 2
        assert PLAN_LIMITS["free"]["sites"] == 1
        assert PLAN_LIMITS["free"]["forecasts_per_month"] == 5

    def test_enterprise_has_unlimited_users(self) -> None:
        assert PLAN_LIMITS["enterprise"]["users"] is None

    def test_enterprise_has_unlimited_sites(self) -> None:
        assert PLAN_LIMITS["enterprise"]["sites"] is None

    def test_enterprise_has_unlimited_forecasts(self) -> None:
        assert PLAN_LIMITS["enterprise"]["forecasts_per_month"] is None

    def test_professional_limits(self) -> None:
        assert PLAN_LIMITS["professional"]["users"] == 50
        assert PLAN_LIMITS["professional"]["datasets"] == 50
        assert PLAN_LIMITS["professional"]["sites"] == 20

    def test_starter_limits(self) -> None:
        assert PLAN_LIMITS["starter"]["users"] == 10
        assert PLAN_LIMITS["starter"]["datasets"] == 10
        assert PLAN_LIMITS["starter"]["sites"] == 3


class TestGetBillingInfo:
    """Tests for get_billing_info()."""

    @pytest.mark.asyncio
    async def test_returns_plan_and_usage(self) -> None:
        org = _make_org()
        session = make_mock_session(
            make_scalar_result(org),  # org query
            make_scalar_result(5),  # user count
            make_scalar_result(2),  # site count
            make_scalar_result(3),  # dataset count
            make_scalar_result(10),  # forecast count
        )
        result = await get_billing_info(session, org.id)
        assert result["plan"] == "starter"
        assert result["usage"]["users"] == 5
        assert result["usage"]["sites"] == 2
        assert result["usage"]["datasets"] == 3
        assert result["usage"]["forecasts_this_month"] == 10
        assert result["organization_id"] == org.id

    @pytest.mark.asyncio
    async def test_limits_match_plan(self) -> None:
        org = _make_org(plan=SubscriptionPlan.PROFESSIONAL)
        session = make_mock_session(
            make_scalar_result(org),
            make_scalar_result(0),
            make_scalar_result(0),
            make_scalar_result(0),
            make_scalar_result(0),
        )
        result = await get_billing_info(session, org.id)
        assert result["limits"] == PLAN_LIMITS["professional"]

    @pytest.mark.asyncio
    async def test_org_not_found_raises(self) -> None:
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await get_billing_info(session, uuid.uuid4())

    @pytest.mark.asyncio
    async def test_zero_usage(self) -> None:
        org = _make_org(plan=SubscriptionPlan.FREE)
        session = make_mock_session(
            make_scalar_result(org),
            make_scalar_result(0),
            make_scalar_result(0),
            make_scalar_result(0),
            make_scalar_result(0),
        )
        result = await get_billing_info(session, org.id)
        assert result["usage"]["users"] == 0
        assert result["usage"]["forecasts_this_month"] == 0

    @pytest.mark.asyncio
    async def test_unknown_plan_falls_back_to_free(self) -> None:
        """If org has a plan not in PLAN_LIMITS, fallback to free."""
        org = _make_org(plan="unknown_plan")
        session = make_mock_session(
            make_scalar_result(org),
            make_scalar_result(0),
            make_scalar_result(0),
            make_scalar_result(0),
            make_scalar_result(0),
        )
        result = await get_billing_info(session, org.id)
        assert result["limits"] == PLAN_LIMITS["free"]


class TestChangePlan:
    """Tests for change_plan()."""

    @pytest.mark.asyncio
    async def test_success(self) -> None:
        org = _make_org(plan=SubscriptionPlan.STARTER)
        session = make_mock_session(
            make_scalar_result(org),  # org query
            make_scalar_result(None),  # UPDATE execute
        )

        history = await change_plan(
            session,
            org_id=org.id,
            new_plan=SubscriptionPlan.PROFESSIONAL,
            reason="Client upgraded",
            changed_by=str(uuid.uuid4()),
        )
        session.add.assert_called_once()
        session.flush.assert_awaited_once()
        assert history.old_plan == SubscriptionPlan.STARTER
        assert history.new_plan == SubscriptionPlan.PROFESSIONAL

    @pytest.mark.asyncio
    async def test_same_plan_raises_conflict(self) -> None:
        org = _make_org(plan=SubscriptionPlan.STARTER)
        session = make_mock_session(make_scalar_result(org))

        with pytest.raises(ConflictError, match="already on this plan"):
            await change_plan(
                session,
                org_id=org.id,
                new_plan=SubscriptionPlan.STARTER,
                reason="Duplicate",
                changed_by=str(uuid.uuid4()),
            )

    @pytest.mark.asyncio
    async def test_org_not_found_raises(self) -> None:
        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError):
            await change_plan(
                session,
                org_id=uuid.uuid4(),
                new_plan=SubscriptionPlan.ENTERPRISE,
                reason="Test",
                changed_by=str(uuid.uuid4()),
            )

    @pytest.mark.asyncio
    async def test_reason_sanitized(self) -> None:
        org = _make_org(plan=SubscriptionPlan.FREE)
        session = make_mock_session(
            make_scalar_result(org),
            make_scalar_result(None),
        )

        history = await change_plan(
            session,
            org_id=org.id,
            new_plan=SubscriptionPlan.STARTER,
            reason="<script>alert('xss')</script>",
            changed_by=str(uuid.uuid4()),
        )
        # sanitize_text should have escaped the HTML
        assert "<script>" not in history.reason

    @pytest.mark.asyncio
    async def test_downgrade_allowed(self) -> None:
        org = _make_org(plan=SubscriptionPlan.ENTERPRISE)
        session = make_mock_session(
            make_scalar_result(org),
            make_scalar_result(None),
        )

        history = await change_plan(
            session,
            org_id=org.id,
            new_plan=SubscriptionPlan.FREE,
            reason="Downgrade requested",
            changed_by=str(uuid.uuid4()),
        )
        assert history.new_plan == SubscriptionPlan.FREE

    @pytest.mark.asyncio
    async def test_changed_by_stored_as_uuid(self) -> None:
        org = _make_org(plan=SubscriptionPlan.FREE)
        admin_id = str(uuid.uuid4())
        session = make_mock_session(
            make_scalar_result(org),
            make_scalar_result(None),
        )

        history = await change_plan(
            session,
            org_id=org.id,
            new_plan=SubscriptionPlan.STARTER,
            reason="Upgrade",
            changed_by=admin_id,
        )
        assert str(history.changed_by) == admin_id


class TestGetPlanHistory:
    """Tests for get_plan_history()."""

    @pytest.mark.asyncio
    async def test_returns_items_and_total(self) -> None:
        item = SimpleNamespace(id=uuid.uuid4())
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([item]),
        )
        items, total = await get_plan_history(session, uuid.uuid4())
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_pagination(self) -> None:
        session = make_mock_session(
            make_scalar_result(30),
            make_scalars_result([]),
        )
        _, total = await get_plan_history(session, uuid.uuid4(), page=2, page_size=10)
        assert total == 30

    @pytest.mark.asyncio
    async def test_empty_history(self) -> None:
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await get_plan_history(session, uuid.uuid4())
        assert total == 0
        assert items == []
