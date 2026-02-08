"""Tests for scenario_engine_service — Pareto-optimal remediation options.

Covers:
- _compute_all_options: each formula (HS, interim, realloc_intra,
  realloc_inter, service_adjust, outsource)
- constraints (caps)
- compute_pareto_frontier: non-dominated set
- select_recommendation: lowest cost at >=98% service
- Edge cases: zero gap, max cap, large gap
- generate_scenarios: integration with cost parameter
- get_scenarios_for_alert: read-only
"""

import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import NotFoundError
from app.models.operational import ScenarioOptionType
from app.services.scenario_engine_service import (
    _compute_all_options,
    _round2,
    _round4,
    compute_pareto_frontier,
    generate_scenarios,
    get_scenarios_for_alert,
    select_recommendation,
)
from tests.unit.conftest import (
    _make_cost_parameter,
    _make_coverage_alert,
    _make_scenario_option,
    _make_tenant,
    make_mock_session,
    make_scalars_result,
)

# ── Helpers ──────────────────────────────────────────────────────


def _make_cp_dict(**overrides):
    """Cost parameter SimpleNamespace for formula testing."""
    defaults = {
        "c_int": Decimal("35.00"),
        "maj_hs": Decimal("0.2500"),
        "c_interim": Decimal("45.00"),
        "premium_urgence": Decimal("0.1000"),
        "c_backlog": Decimal("60.00"),
        "cap_hs_shift": 30,
        "cap_interim_site": 50,
        "lead_time_jours": 2,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ── _round2 / _round4 ──────────────────────────────────────────


class TestRounding:
    def test_round2(self) -> None:
        assert _round2(Decimal("1.005")) == Decimal("1.00") or _round2(
            Decimal("1.005")
        ) == Decimal("1.01")
        assert _round2(Decimal("1.999")) == Decimal("2.00")

    def test_round4(self) -> None:
        assert _round4(Decimal("0.12345")) == Decimal("0.1235") or _round4(
            Decimal("0.12345")
        ) == Decimal("0.1234")


# ── _compute_all_options — zero gap ─────────────────────────────


class TestComputeAllOptionsZeroGap:
    def test_zero_gap_returns_six_options(self) -> None:
        cp = _make_cp_dict()
        options = _compute_all_options(Decimal("0"), cp)
        assert len(options) == 6

    def test_zero_gap_all_zero_cost(self) -> None:
        cp = _make_cp_dict()
        options = _compute_all_options(Decimal("0"), cp)
        for opt in options:
            assert opt["cout_total_eur"] == Decimal("0.00")

    def test_zero_gap_all_100_service(self) -> None:
        cp = _make_cp_dict()
        options = _compute_all_options(Decimal("0"), cp)
        for opt in options:
            assert opt["service_attendu_pct"] == Decimal("1.0000")

    def test_zero_gap_option_types(self) -> None:
        cp = _make_cp_dict()
        options = _compute_all_options(Decimal("0"), cp)
        types = [o["option_type"] for o in options]
        assert ScenarioOptionType.HS in types
        assert ScenarioOptionType.INTERIM in types
        assert ScenarioOptionType.REALLOC_INTRA in types
        assert ScenarioOptionType.REALLOC_INTER in types
        assert ScenarioOptionType.SERVICE_ADJUST in types
        assert ScenarioOptionType.OUTSOURCE in types

    def test_negative_gap_treated_as_zero(self) -> None:
        cp = _make_cp_dict()
        options = _compute_all_options(Decimal("-5"), cp)
        for opt in options:
            assert opt["cout_total_eur"] == Decimal("0.00")


# ── _compute_all_options — positive gap formulas ────────────────


class TestComputeAllOptionsFormulas:
    def test_hs_formula(self) -> None:
        cp = _make_cp_dict(
            c_int=Decimal("40.00"), maj_hs=Decimal("0.25"), cap_hs_shift=30
        )
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        # hs_hours = min(10, 30) = 10
        # hs_cost = 10 * 40 * 1.25 = 500
        assert hs["cout_total_eur"] == Decimal("500.00")
        assert hs["heures_couvertes"] == Decimal("10.00")
        assert hs["service_attendu_pct"] == Decimal("1.0000")

    def test_hs_capped(self) -> None:
        cp = _make_cp_dict(cap_hs_shift=5)
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["heures_couvertes"] == Decimal("5.00")
        assert hs["service_attendu_pct"] == Decimal("0.5000")
        assert hs["contraintes_json"]["capped"] is True

    def test_hs_not_capped(self) -> None:
        cp = _make_cp_dict(cap_hs_shift=30)
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["contraintes_json"]["capped"] is False

    def test_interim_formula(self) -> None:
        cp = _make_cp_dict(
            c_interim=Decimal("50.00"),
            premium_urgence=Decimal("0.10"),
            cap_interim_site=50,
        )
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        interim = next(
            o for o in options if o["option_type"] == ScenarioOptionType.INTERIM
        )
        # interim_hours = min(10, 50) = 10
        # interim_cost = 10 * 50 * 1.10 = 550
        assert interim["cout_total_eur"] == Decimal("550.00")
        assert interim["heures_couvertes"] == Decimal("10.00")
        assert interim["service_attendu_pct"] == Decimal("1.0000")

    def test_interim_capped(self) -> None:
        cp = _make_cp_dict(cap_interim_site=5)
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        interim = next(
            o for o in options if o["option_type"] == ScenarioOptionType.INTERIM
        )
        assert interim["heures_couvertes"] == Decimal("5.00")
        assert interim["service_attendu_pct"] == Decimal("0.5000")
        assert interim["contraintes_json"]["capped"] is True

    def test_realloc_intra_formula(self) -> None:
        cp = _make_cp_dict()
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        intra = next(
            o for o in options if o["option_type"] == ScenarioOptionType.REALLOC_INTRA
        )
        # intra_cost = 10 * 5.00 = 50.00
        assert intra["cout_total_eur"] == Decimal("50.00")
        # intra_covered = 10 * 0.85 = 8.50
        assert intra["heures_couvertes"] == Decimal("8.50")
        assert intra["service_attendu_pct"] == Decimal("0.8500")

    def test_realloc_inter_formula(self) -> None:
        cp = _make_cp_dict()
        gap = Decimal("16")  # 16h = 2 persons needed
        options = _compute_all_options(gap, cp)
        inter = next(
            o for o in options if o["option_type"] == ScenarioOptionType.REALLOC_INTER
        )
        # persons_needed = 16/8 = 2
        # inter_travel = 2 * 80 = 160
        # inter_friction = 16 * 8 = 128
        # inter_cost = 160 + 128 = 288
        assert inter["cout_total_eur"] == Decimal("288.00")
        # inter_covered = 16 * 0.75 = 12
        assert inter["heures_couvertes"] == Decimal("12.00")
        assert inter["service_attendu_pct"] == Decimal("0.7500")

    def test_service_adjust_formula(self) -> None:
        cp = _make_cp_dict(c_backlog=Decimal("60.00"))
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        adjust = next(
            o for o in options if o["option_type"] == ScenarioOptionType.SERVICE_ADJUST
        )
        # adjust_cost = 10 * 60 = 600
        assert adjust["cout_total_eur"] == Decimal("600.00")
        assert adjust["service_attendu_pct"] == Decimal("0.0000")
        assert adjust["heures_couvertes"] == Decimal("0.00")
        assert adjust["contraintes_json"]["accepts_full_gap"] is True

    def test_outsource_formula(self) -> None:
        cp = _make_cp_dict(c_interim=Decimal("50.00"))
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        outsource = next(
            o for o in options if o["option_type"] == ScenarioOptionType.OUTSOURCE
        )
        # outsource_cost = 10 * 50 * 1.5 = 750
        assert outsource["cout_total_eur"] == Decimal("750.00")
        assert outsource["service_attendu_pct"] == Decimal("1.0000")
        assert outsource["heures_couvertes"] == Decimal("10.00")

    def test_all_six_options_returned(self) -> None:
        cp = _make_cp_dict()
        options = _compute_all_options(Decimal("10"), cp)
        assert len(options) == 6

    def test_large_gap_respects_caps(self) -> None:
        cp = _make_cp_dict(cap_hs_shift=5, cap_interim_site=10)
        gap = Decimal("100")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["heures_couvertes"] == Decimal("5.00")
        interim = next(
            o for o in options if o["option_type"] == ScenarioOptionType.INTERIM
        )
        assert interim["heures_couvertes"] == Decimal("10.00")

    def test_very_small_gap(self) -> None:
        cp = _make_cp_dict()
        gap = Decimal("0.01")
        options = _compute_all_options(gap, cp)
        assert len(options) == 6
        for opt in options:
            assert opt["cout_total_eur"] >= Decimal("0")

    def test_exact_cap_hs(self) -> None:
        """Gap exactly equals cap should give 100% service."""
        cp = _make_cp_dict(cap_hs_shift=10)
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["service_attendu_pct"] == Decimal("1.0000")

    def test_exact_cap_interim(self) -> None:
        cp = _make_cp_dict(cap_interim_site=10)
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        interim = next(
            o for o in options if o["option_type"] == ScenarioOptionType.INTERIM
        )
        assert interim["service_attendu_pct"] == Decimal("1.0000")


# ── compute_pareto_frontier ─────────────────────────────────────


class TestComputeParetoFrontier:
    def test_empty_list(self) -> None:
        assert compute_pareto_frontier([]) == []

    def test_single_option(self) -> None:
        opt = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9000"),
        )
        result = compute_pareto_frontier([opt])
        assert len(result) == 1
        assert result[0] is opt

    def test_dominated_option_excluded(self) -> None:
        better = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9500"),
        )
        worse = _make_scenario_option(
            cout_total_eur=Decimal("200"),
            service_attendu_pct=Decimal("0.9000"),
        )
        result = compute_pareto_frontier([better, worse])
        assert len(result) == 1
        assert result[0] is better

    def test_non_dominated_pair(self) -> None:
        cheap = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.8000"),
        )
        good_service = _make_scenario_option(
            cout_total_eur=Decimal("200"),
            service_attendu_pct=Decimal("1.0000"),
        )
        result = compute_pareto_frontier([cheap, good_service])
        assert len(result) == 2

    def test_equal_options_both_kept(self) -> None:
        opt1 = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9000"),
        )
        opt2 = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9000"),
        )
        result = compute_pareto_frontier([opt1, opt2])
        assert len(result) == 2

    def test_three_options_one_dominated(self) -> None:
        a = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9000"),
        )
        b = _make_scenario_option(
            cout_total_eur=Decimal("150"),
            service_attendu_pct=Decimal("1.0000"),
        )
        dominated = _make_scenario_option(
            cout_total_eur=Decimal("200"),
            service_attendu_pct=Decimal("0.8000"),
        )
        result = compute_pareto_frontier([a, b, dominated])
        assert len(result) == 2
        assert dominated not in result

    def test_all_same_cost_different_service(self) -> None:
        low = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.7000"),
        )
        high = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("1.0000"),
        )
        result = compute_pareto_frontier([low, high])
        # high dominates low (same cost, better service)
        assert len(result) == 1
        assert result[0] is high

    def test_all_same_service_different_cost(self) -> None:
        cheap = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9000"),
        )
        expensive = _make_scenario_option(
            cout_total_eur=Decimal("200"),
            service_attendu_pct=Decimal("0.9000"),
        )
        result = compute_pareto_frontier([cheap, expensive])
        assert len(result) == 1
        assert result[0] is cheap

    def test_six_realistic_options(self) -> None:
        """Test with 6 realistic scenario options."""
        options = [
            _make_scenario_option(
                option_type=ScenarioOptionType.HS,
                cout_total_eur=Decimal("500"),
                service_attendu_pct=Decimal("1.0000"),
            ),
            _make_scenario_option(
                option_type=ScenarioOptionType.INTERIM,
                cout_total_eur=Decimal("550"),
                service_attendu_pct=Decimal("1.0000"),
            ),
            _make_scenario_option(
                option_type=ScenarioOptionType.REALLOC_INTRA,
                cout_total_eur=Decimal("50"),
                service_attendu_pct=Decimal("0.8500"),
            ),
            _make_scenario_option(
                option_type=ScenarioOptionType.REALLOC_INTER,
                cout_total_eur=Decimal("288"),
                service_attendu_pct=Decimal("0.7500"),
            ),
            _make_scenario_option(
                option_type=ScenarioOptionType.SERVICE_ADJUST,
                cout_total_eur=Decimal("600"),
                service_attendu_pct=Decimal("0.0000"),
            ),
            _make_scenario_option(
                option_type=ScenarioOptionType.OUTSOURCE,
                cout_total_eur=Decimal("750"),
                service_attendu_pct=Decimal("1.0000"),
            ),
        ]
        result = compute_pareto_frontier(options)
        # Pareto should include at least HS (cheapest at 100%)
        # and REALLOC_INTRA (cheapest overall)
        assert len(result) >= 2
        # HS dominates INTERIM and OUTSOURCE (same or better service, lower cost)
        assert options[1] not in result  # INTERIM dominated by HS
        assert options[5] not in result  # OUTSOURCE dominated by HS

    def test_pareto_is_non_dominated(self) -> None:
        """Every option in the frontier is truly non-dominated."""
        options = [
            _make_scenario_option(
                cout_total_eur=Decimal(str(100 + i * 50)),
                service_attendu_pct=Decimal(str(round(0.5 + i * 0.1, 4))),
            )
            for i in range(5)
        ]
        result = compute_pareto_frontier(options)
        # Each result should not be dominated by any other result
        for candidate in result:
            for other in result:
                if other is candidate:
                    continue
                # other should NOT dominate candidate
                dominates = (
                    other.cout_total_eur <= candidate.cout_total_eur
                    and other.service_attendu_pct >= candidate.service_attendu_pct
                    and (
                        other.cout_total_eur < candidate.cout_total_eur
                        or other.service_attendu_pct > candidate.service_attendu_pct
                    )
                )
                assert not dominates


# ── select_recommendation ───────────────────────────────────────


class TestSelectRecommendation:
    def test_empty_list(self) -> None:
        assert select_recommendation([]) is None

    def test_single_high_service(self) -> None:
        opt = _make_scenario_option(
            cout_total_eur=Decimal("500"),
            service_attendu_pct=Decimal("0.9900"),
        )
        result = select_recommendation([opt])
        assert result is opt

    def test_prefers_98_pct_threshold(self) -> None:
        low_service = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.8000"),
        )
        high_service = _make_scenario_option(
            cout_total_eur=Decimal("500"),
            service_attendu_pct=Decimal("0.9900"),
        )
        result = select_recommendation([low_service, high_service])
        assert result is high_service

    def test_lowest_cost_among_high_service(self) -> None:
        expensive = _make_scenario_option(
            cout_total_eur=Decimal("1000"),
            service_attendu_pct=Decimal("1.0000"),
        )
        cheap = _make_scenario_option(
            cout_total_eur=Decimal("500"),
            service_attendu_pct=Decimal("0.9800"),
        )
        result = select_recommendation([expensive, cheap])
        assert result is cheap

    def test_no_option_at_98_takes_highest_service(self) -> None:
        low = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.7000"),
        )
        mid = _make_scenario_option(
            cout_total_eur=Decimal("200"),
            service_attendu_pct=Decimal("0.8500"),
        )
        result = select_recommendation([low, mid])
        assert result is mid

    def test_no_option_at_98_ties_highest_service_takes_cheapest(self) -> None:
        a = _make_scenario_option(
            cout_total_eur=Decimal("300"),
            service_attendu_pct=Decimal("0.8500"),
        )
        b = _make_scenario_option(
            cout_total_eur=Decimal("200"),
            service_attendu_pct=Decimal("0.8500"),
        )
        result = select_recommendation([a, b])
        assert result is b

    def test_exact_98_threshold(self) -> None:
        opt = _make_scenario_option(
            cout_total_eur=Decimal("500"),
            service_attendu_pct=Decimal("0.9800"),
        )
        result = select_recommendation([opt])
        assert result is opt

    def test_just_below_98_not_counted(self) -> None:
        below = _make_scenario_option(
            cout_total_eur=Decimal("100"),
            service_attendu_pct=Decimal("0.9799"),
        )
        result = select_recommendation([below])
        # No option at 98%, so take highest service (which is the only one)
        assert result is below

    def test_multiple_at_98_takes_cheapest(self) -> None:
        opts = [
            _make_scenario_option(
                cout_total_eur=Decimal(str(100 + i * 100)),
                service_attendu_pct=Decimal("1.0000"),
            )
            for i in range(5)
        ]
        result = select_recommendation(opts)
        assert result is opts[0]


# ── generate_scenarios ──────────────────────────────────────────


class TestGenerateScenarios:
    @pytest.mark.asyncio
    async def test_alert_not_found(self) -> None:
        tenant = _make_tenant()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session = make_mock_session(result_mock)
        with pytest.raises(NotFoundError, match="CoverageAlert"):
            await generate_scenarios(session, tenant, uuid.uuid4())

    @pytest.mark.asyncio
    @patch("app.services.cost_parameter_service.get_effective_cost_parameter")
    async def test_happy_path(self, mock_get_cp) -> None:
        tenant = _make_tenant()
        alert = _make_coverage_alert(gap_h=Decimal("12.00"))
        cp = _make_cost_parameter()
        mock_get_cp.return_value = cp

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert

        session = make_mock_session(alert_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        options = await generate_scenarios(session, tenant, alert.id)
        assert len(options) == 6
        # At least one should be marked as pareto
        pareto_count = sum(1 for o in options if o.is_pareto_optimal)
        assert pareto_count >= 1
        # Exactly one should be recommended
        rec_count = sum(1 for o in options if o.is_recommended)
        assert rec_count == 1

    @pytest.mark.asyncio
    @patch("app.services.cost_parameter_service.get_effective_cost_parameter")
    async def test_session_add_called_6_times(self, mock_get_cp) -> None:
        tenant = _make_tenant()
        alert = _make_coverage_alert(gap_h=Decimal("12.00"))
        cp = _make_cost_parameter()
        mock_get_cp.return_value = cp

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert

        session = make_mock_session(alert_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        await generate_scenarios(session, tenant, alert.id)
        assert session.add.call_count == 6

    @pytest.mark.asyncio
    @patch("app.services.cost_parameter_service.get_effective_cost_parameter")
    async def test_flush_called_twice(self, mock_get_cp) -> None:
        """flush called once after add, once after pareto marking."""
        tenant = _make_tenant()
        alert = _make_coverage_alert(gap_h=Decimal("12.00"))
        cp = _make_cost_parameter()
        mock_get_cp.return_value = cp

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert

        session = make_mock_session(alert_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        await generate_scenarios(session, tenant, alert.id)
        assert session.flush.await_count == 2

    @pytest.mark.asyncio
    @patch("app.services.cost_parameter_service.get_effective_cost_parameter")
    async def test_tenant_filter_applied(self, mock_get_cp) -> None:
        tenant = _make_tenant()
        alert = _make_coverage_alert()
        cp = _make_cost_parameter()
        mock_get_cp.return_value = cp

        alert_result = MagicMock()
        alert_result.scalar_one_or_none.return_value = alert

        session = make_mock_session(alert_result)
        session.add = MagicMock()
        session.flush = AsyncMock()

        await generate_scenarios(session, tenant, alert.id)
        tenant.apply.assert_called()


# ── get_scenarios_for_alert ─────────────────────────────────────


class TestGetScenariosForAlert:
    @pytest.mark.asyncio
    async def test_returns_scenarios(self) -> None:
        opts = [_make_scenario_option(), _make_scenario_option()]
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result(opts))
        result = await get_scenarios_for_alert(session, tenant, uuid.uuid4())
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_returns_empty_list(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result([]))
        result = await get_scenarios_for_alert(session, tenant, uuid.uuid4())
        assert result == []

    @pytest.mark.asyncio
    async def test_tenant_filter_applied(self) -> None:
        tenant = _make_tenant()
        session = make_mock_session(make_scalars_result([]))
        await get_scenarios_for_alert(session, tenant, uuid.uuid4())
        tenant.apply.assert_called()
