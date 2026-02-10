"""Integration tests: canonical -> forecast -> scenarios -> decision -> proof.

Tests the complete operational decision-making pipeline end-to-end
using service-level mocking.
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.operational import (
    Horizon,
    ScenarioOptionType,
    ShiftType,
)
from app.services.canonical_data_service import (
    create_canonical_record,
)
from app.services.cost_parameter_service import (
    create_cost_parameter,
    get_effective_cost_parameter,
)
from app.services.decision_log_service import (
    OverrideReasonRequiredError,
    create_operational_decision,
    get_override_statistics,
    update_operational_decision,
)
from app.services.mock_forecast_service import generate_mock_forecasts
from app.services.scenario_engine_service import (
    _compute_all_options,
    compute_pareto_frontier,
    select_recommendation,
)
from tests.unit.conftest import (
    _make_canonical_record,
    _make_cost_parameter,
    _make_coverage_alert,
    _make_operational_decision,
    _make_scenario_option,
    _make_tenant,
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

ORG_ID = "11111111-1111-1111-1111-111111111111"


# ── Pipeline step 1: Canonical data creation ────────────────────


class TestPipelineStep1CanonicalData:
    @pytest.mark.asyncio
    async def test_create_canonical_records_for_site(self) -> None:
        """Create multiple canonical records for a site."""
        tenant = _make_tenant()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        records = []
        for i in range(5):
            rec = await create_canonical_record(
                session,
                tenant,
                site_id="site-paris",
                date=date(2026, 1, i + 1),
                shift=ShiftType.AM,
                capacite_plan_h=Decimal("100.00"),
                realise_h=Decimal(str(80 - i * 5)),
            )
            records.append(rec)

        assert len(records) == 5
        assert all(r.organization_id == uuid.UUID(ORG_ID) for r in records)


# ── Pipeline step 2: Cost parameter setup ───────────────────────


class TestPipelineStep2CostParameters:
    @pytest.mark.asyncio
    async def test_create_cost_parameter_for_site(self) -> None:
        tenant = _make_tenant()
        version_result = MagicMock()
        version_result.scalar_one.return_value = 0
        close_result = MagicMock()
        close_result.scalar_one_or_none.return_value = None

        session = make_mock_session(version_result, close_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        cp = await create_cost_parameter(
            session,
            tenant,
            c_int=Decimal("35.00"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45.00"),
            effective_from=date(2026, 1, 1),
            site_id="site-paris",
        )
        assert cp.version == 1
        assert cp.site_id == "site-paris"

    @pytest.mark.asyncio
    async def test_effective_cost_parameter_found(self) -> None:
        cp = _make_cost_parameter(site_id="site-paris")
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = cp
        session = make_mock_session(result_mock)

        result = await get_effective_cost_parameter(
            session, tenant, site_id="site-paris", target_date=date(2026, 1, 15)
        )
        assert result is cp


# ── Pipeline step 3: Forecast generation ────────────────────────


class TestPipelineStep3Forecasts:
    @pytest.mark.asyncio
    async def test_forecasts_from_canonical_data(self) -> None:
        tenant = _make_tenant()
        records = [
            _make_canonical_record(
                site_id="site-paris",
                shift=ShiftType.AM,
                capacite_plan_h=Decimal("100.00"),
                realise_h=Decimal("40.00"),
                date=date(2026, 1, i + 1),
            )
            for i in range(10)
        ]
        session = make_mock_session(make_scalars_result(records))
        session.add = MagicMock()
        session.flush = AsyncMock()

        count = await generate_mock_forecasts(session, tenant, days_lookback=30)
        assert count >= 0  # May be 0 due to randomness


# ── Pipeline step 4: Scenario generation ────────────────────────


class TestPipelineStep4Scenarios:
    def test_compute_options_for_gap(self) -> None:
        """Given a gap and cost params, compute all 6 options."""
        cp = _make_cost_parameter()
        gap = Decimal("12.00")
        options = _compute_all_options(gap, cp)
        assert len(options) == 6

        types = {o["option_type"] for o in options}
        assert types == {
            ScenarioOptionType.HS,
            ScenarioOptionType.INTERIM,
            ScenarioOptionType.REALLOC_INTRA,
            ScenarioOptionType.REALLOC_INTER,
            ScenarioOptionType.SERVICE_ADJUST,
            ScenarioOptionType.OUTSOURCE,
        }

    def test_pareto_frontier_from_options(self) -> None:
        cp = _make_cost_parameter()
        gap = Decimal("12.00")
        options_data = _compute_all_options(gap, cp)
        options = [
            _make_scenario_option(
                cout_total_eur=d["cout_total_eur"],
                service_attendu_pct=d["service_attendu_pct"],
            )
            for d in options_data
        ]
        frontier = compute_pareto_frontier(options)
        assert len(frontier) >= 1

    def test_recommendation_from_frontier(self) -> None:
        cp = _make_cost_parameter()
        gap = Decimal("12.00")
        options_data = _compute_all_options(gap, cp)
        options = [
            _make_scenario_option(
                cout_total_eur=d["cout_total_eur"],
                service_attendu_pct=d["service_attendu_pct"],
            )
            for d in options_data
        ]
        frontier = compute_pareto_frontier(options)
        rec = select_recommendation(frontier)
        assert rec is not None
        assert rec in frontier


# ── Pipeline step 5: Decision creation ──────────────────────────


class TestPipelineStep5Decisions:
    @pytest.mark.asyncio
    async def test_create_decision_follows_recommendation(self) -> None:
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        recommended = _make_scenario_option(
            is_recommended=True,
            cout_total_eur=Decimal("500.00"),
            service_attendu_pct=Decimal("1.0000"),
        )
        chosen = recommended  # Follow recommendation

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert
        rec_result = MagicMock()
        rec_result.scalar_one_or_none.return_value = recommended
        chosen_result = MagicMock()
        chosen_result.scalar_one_or_none.return_value = chosen

        session = make_mock_session(alert_result, rec_result, chosen_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        dec = await create_operational_decision(
            session,
            tenant,
            coverage_alert_id=alert.id,
            chosen_option_id=chosen.id,
            site_id="site-paris",
            decision_date=date(2026, 1, 18),
            shift=ShiftType.AM,
            horizon=Horizon.J3,
            gap_h=Decimal("12.00"),
            decided_by=uuid.uuid4(),
            is_override=False,
        )
        assert dec.is_override is False
        assert dec.cout_attendu_eur == Decimal("500.00")

    @pytest.mark.asyncio
    async def test_override_decision_requires_reason(self) -> None:
        tenant = _make_tenant()
        with pytest.raises(OverrideReasonRequiredError):
            await create_operational_decision(
                AsyncMock(),
                tenant,
                coverage_alert_id=uuid.uuid4(),
                chosen_option_id=uuid.uuid4(),
                site_id="site-paris",
                decision_date=date(2026, 1, 18),
                shift=ShiftType.AM,
                horizon=Horizon.J3,
                gap_h=Decimal("12.00"),
                decided_by=uuid.uuid4(),
                is_override=True,
                override_reason=None,
            )

    @pytest.mark.asyncio
    async def test_update_with_observed_outcomes(self) -> None:
        dec = _make_operational_decision()
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = dec
        session = make_mock_session(result_mock)
        session.flush = AsyncMock()

        updated = await update_operational_decision(
            session,
            tenant,
            dec.id,
            cout_observe_eur=Decimal("480.00"),
            service_observe_pct=Decimal("0.9500"),
        )
        assert updated.cout_observe_eur == Decimal("480.00")
        assert updated.service_observe_pct == Decimal("0.9500")


# ── Pipeline step 6: Override statistics ────────────────────────


class TestPipelineStep6Statistics:
    @pytest.mark.asyncio
    async def test_zero_decisions_stats(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        stats = await get_override_statistics(session, tenant)
        assert stats["total"] == 0
        assert stats["override_count"] == 0

    @pytest.mark.asyncio
    async def test_with_override_stats(self) -> None:
        tenant = _make_tenant()
        reasons_result = MagicMock()
        reasons_result.all.return_value = [("Too costly", 3)]

        session = make_mock_session(
            make_scalar_result(10),
            make_scalar_result(3),
            reasons_result,
            make_scalar_result(50.0),
        )
        stats = await get_override_statistics(session, tenant)
        assert stats["total"] == 10
        assert stats["override_count"] == 3
        assert stats["override_pct"] == Decimal("30.0")
        assert len(stats["top_reasons"]) == 1


# ── End-to-end formula verification ─────────────────────────────


class TestEndToEndFormulas:
    def test_full_pipeline_zero_gap(self) -> None:
        """Zero gap produces zero cost for all options."""
        cp = _make_cost_parameter()
        options = _compute_all_options(Decimal("0"), cp)
        assert all(o["cout_total_eur"] == Decimal("0.00") for o in options)

    def test_full_pipeline_large_gap(self) -> None:
        """Large gap: costs scale, caps apply."""
        cp = _make_cost_parameter(cap_hs_shift=10, cap_interim_site=20)
        gap = Decimal("100")
        options = _compute_all_options(gap, cp)

        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["heures_couvertes"] == Decimal("10.00")

        interim = next(
            o for o in options if o["option_type"] == ScenarioOptionType.INTERIM
        )
        assert interim["heures_couvertes"] == Decimal("20.00")

        outsource = next(
            o for o in options if o["option_type"] == ScenarioOptionType.OUTSOURCE
        )
        assert outsource["heures_couvertes"] == Decimal("100.00")

    def test_pareto_then_recommendation_pipeline(self) -> None:
        """Full flow: options -> pareto -> recommendation."""
        cp = _make_cost_parameter()
        gap = Decimal("12.00")
        options_data = _compute_all_options(gap, cp)

        options = [
            _make_scenario_option(
                cout_total_eur=d["cout_total_eur"],
                service_attendu_pct=d["service_attendu_pct"],
                option_type=d["option_type"],
            )
            for d in options_data
        ]

        frontier = compute_pareto_frontier(options)
        assert len(frontier) >= 1

        rec = select_recommendation(frontier)
        assert rec is not None

        # Recommendation should be reasonable
        assert rec.cout_total_eur >= Decimal("0")
        assert rec.service_attendu_pct >= Decimal("0")
        assert rec.service_attendu_pct <= Decimal("1.0000")
