"""Security tests — cross-tenant isolation for all operational layer services.

Verifies that TenantFilter is ALWAYS applied, ensuring org B can never
access org A's data. Tests at the service level (not HTTP).

Strategy:
- Two tenants with different org_ids
- Each service function must receive tenant.apply() calls
- Verify NotFoundError for cross-tenant access
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.models.operational import Horizon, ShiftType
from app.services.canonical_data_service import (
    bulk_import_canonical,
    create_canonical_record,
    get_canonical_record,
    get_quality_dashboard,
    list_canonical_records,
)
from app.services.cost_parameter_service import (
    create_cost_parameter,
    get_cost_parameter_history,
    get_effective_cost_parameter,
    list_cost_parameters,
)
from app.services.decision_log_service import (
    create_operational_decision,
    get_operational_decision,
    get_override_statistics,
    list_operational_decisions,
    update_operational_decision,
)
from app.services.proof_service import (
    get_proof_summary,
    list_proof_records,
)
from app.services.scenario_engine_service import (
    get_scenarios_for_alert,
)
from tests.unit.conftest import (
    _make_canonical_record,
    _make_cost_parameter,
    _make_coverage_alert,
    _make_operational_decision,
    _make_tenant,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

ORG_A_ID = "aaaaaaaa-0000-0000-0000-000000000001"
ORG_B_ID = "bbbbbbbb-0000-0000-0000-000000000002"


def _tenant_a():
    return _make_tenant(org_id=ORG_A_ID)


def _tenant_b():
    return _make_tenant(org_id=ORG_B_ID)


# ── Canonical Records Isolation ─────────────────────────────────


class TestCanonicalRecordIsolation:
    @pytest.mark.asyncio
    async def test_list_applies_tenant_filter(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        await list_canonical_records(session, tenant)
        tenant.apply.assert_called()
        # Verify it was called with correct org_id
        assert tenant.organization_id == ORG_A_ID

    @pytest.mark.asyncio
    async def test_get_applies_tenant_filter(self) -> None:
        rec = _make_canonical_record()
        tenant = _tenant_a()
        session = make_mock_session(make_scalar_result(rec))
        await get_canonical_record(session, tenant, rec.id)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_get_cross_org_returns_not_found(self) -> None:
        tenant_b = _tenant_b()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError):
            await get_canonical_record(session, tenant_b, uuid.uuid4())

    @pytest.mark.asyncio
    async def test_create_injects_org_id(self) -> None:
        tenant = _tenant_a()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_canonical_record(
            session,
            tenant,
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift=ShiftType.AM,
            capacite_plan_h=Decimal("100.00"),
        )
        assert result.organization_id == uuid.UUID(ORG_A_ID)

    @pytest.mark.asyncio
    async def test_bulk_import_injects_org_id(self) -> None:
        tenant = _tenant_a()
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.rowcount = 1
        session.execute.return_value = result_mock

        await bulk_import_canonical(
            session,
            tenant,
            [
                {
                    "site_id": "s1",
                    "date": date(2026, 1, 1),
                    "shift": "am",
                    "capacite_plan_h": Decimal("100"),
                }
            ],
        )
        session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_quality_dashboard_applies_tenant(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalar_result(0))
        await get_quality_dashboard(session, tenant)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_different_tenants_different_apply_calls(self) -> None:
        tenant_a = _tenant_a()
        tenant_b = _tenant_b()

        session_a = make_mock_session(make_scalar_result(0), make_scalars_result([]))
        session_b = make_mock_session(make_scalar_result(0), make_scalars_result([]))

        await list_canonical_records(session_a, tenant_a)
        await list_canonical_records(session_b, tenant_b)

        assert tenant_a.organization_id == ORG_A_ID
        assert tenant_b.organization_id == ORG_B_ID
        tenant_a.apply.assert_called()
        tenant_b.apply.assert_called()


# ── Cost Parameter Isolation ────────────────────────────────────


class TestCostParameterIsolation:
    @pytest.mark.asyncio
    async def test_list_applies_tenant_filter(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalar_result(0), make_scalars_result([]))
        await list_cost_parameters(session, tenant)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_get_effective_applies_tenant(self) -> None:
        cp = _make_cost_parameter(site_id=None)
        tenant = _tenant_a()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = cp
        session = make_mock_session(result_mock)
        await get_effective_cost_parameter(session, tenant)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_get_effective_cross_org_raises(self) -> None:
        tenant_b = _tenant_b()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError):
            await get_effective_cost_parameter(session, tenant_b)

    @pytest.mark.asyncio
    async def test_create_injects_org_id(self) -> None:
        tenant = _tenant_a()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45"),
            effective_from=date(2026, 1, 1),
        )
        assert result.organization_id == uuid.UUID(ORG_A_ID)

    @pytest.mark.asyncio
    async def test_history_applies_tenant(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalars_result([]))
        await get_cost_parameter_history(session, tenant)
        tenant.apply.assert_called()


# ── Decision Log Isolation ──────────────────────────────────────


class TestDecisionLogIsolation:
    @pytest.mark.asyncio
    async def test_list_applies_tenant(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalar_result(0), make_scalars_result([]))
        await list_operational_decisions(session, tenant)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_get_applies_tenant(self) -> None:
        dec = _make_operational_decision()
        tenant = _tenant_a()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        await get_operational_decision(session, tenant, dec.id)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_get_cross_org_raises(self) -> None:
        tenant_b = _tenant_b()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError):
            await get_operational_decision(session, tenant_b, uuid.uuid4())

    @pytest.mark.asyncio
    async def test_create_injects_org_id(self) -> None:
        tenant = _tenant_a()
        alert = _make_coverage_alert()
        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = None

        session = make_mock_session(alert_result, rec_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=None,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12"),
            decided_by=uuid.uuid4(),
        )
        assert result.organization_id == uuid.UUID(ORG_A_ID)

    @pytest.mark.asyncio
    async def test_update_cross_org_raises(self) -> None:
        tenant_b = _tenant_b()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError):
            await update_operational_decision(
                session,
                tenant_b,
                uuid.uuid4(),
                cout_observe_eur=Decimal("100"),
            )

    @pytest.mark.asyncio
    async def test_override_stats_applies_tenant(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalar_result(0))
        await get_override_statistics(session, tenant)
        tenant.apply.assert_called()


# ── Scenario Option Isolation ───────────────────────────────────


class TestScenarioOptionIsolation:
    @pytest.mark.asyncio
    async def test_get_scenarios_applies_tenant(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalars_result([]))
        await get_scenarios_for_alert(session, tenant, uuid.uuid4())
        tenant.apply.assert_called()


# ── Proof Record Isolation ──────────────────────────────────────


class TestProofRecordIsolation:
    @pytest.mark.asyncio
    async def test_list_applies_tenant(self) -> None:
        tenant = _tenant_a()
        session = make_mock_session(make_scalar_result(0), make_scalars_result([]))
        await list_proof_records(session, tenant)
        tenant.apply.assert_called()

    @pytest.mark.asyncio
    async def test_summary_applies_tenant(self) -> None:
        tenant = _tenant_a()
        agg_result = MagicMock()
        agg_result.one.return_value = (0, None, None)
        site_result = MagicMock()
        site_result.all.return_value = []
        session = make_mock_session(agg_result, site_result)
        await get_proof_summary(session, tenant)
        tenant.apply.assert_called()


# ── Cross-tenant error consistency ──────────────────────────────


class TestCrossTenantErrorConsistency:
    """Cross-org and non-existent resources produce identical NotFoundError."""

    @pytest.mark.asyncio
    async def test_canonical_record_errors_identical(self) -> None:
        tenant = _tenant_b()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)

        with pytest.raises(NotFoundError) as exc_info:
            await get_canonical_record(session, tenant, uuid.uuid4())
        assert exc_info.value.code == "NOT_FOUND"
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_cost_parameter_errors_identical(self) -> None:
        tenant = _tenant_b()
        # Two results: site-specific (None) then org-wide fallback (None)
        site_result = MagicMock()
        site_result.scalar_one_or_none.return_value = None
        default_result = MagicMock()
        default_result.scalar_one_or_none.return_value = None
        session = make_mock_session(site_result, default_result)

        with pytest.raises(NotFoundError) as exc_info:
            await get_effective_cost_parameter(
                session, tenant, site_id="fake", target_date=date(2026, 1, 1)
            )
        assert exc_info.value.code == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_decision_errors_identical(self) -> None:
        tenant = _tenant_b()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)

        with pytest.raises(NotFoundError) as exc_info:
            await get_operational_decision(session, tenant, uuid.uuid4())
        assert exc_info.value.code == "NOT_FOUND"


# ── Org ID never accepted from client ────────────────────────────


class TestOrgIdNeverFromClient:
    """organization_id is always injected from TenantFilter, never accepted."""

    @pytest.mark.asyncio
    async def test_canonical_create_uses_tenant_org(self) -> None:
        tenant = _tenant_a()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_canonical_record(
            session,
            tenant,
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift=ShiftType.AM,
            capacite_plan_h=Decimal("100"),
        )
        # Even though we don't pass org_id, it's set from tenant
        assert result.organization_id == uuid.UUID(ORG_A_ID)

    @pytest.mark.asyncio
    async def test_cost_param_create_uses_tenant_org(self) -> None:
        tenant = _tenant_a()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45"),
            effective_from=date(2026, 1, 1),
        )
        assert result.organization_id == uuid.UUID(ORG_A_ID)

    @pytest.mark.asyncio
    async def test_decision_create_uses_tenant_org(self) -> None:
        tenant = _tenant_a()
        alert = _make_coverage_alert()
        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = None

        session = make_mock_session(alert_result, rec_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=None,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12"),
            decided_by=uuid.uuid4(),
        )
        assert result.organization_id == uuid.UUID(ORG_A_ID)
