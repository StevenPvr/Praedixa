"""Security tests — scenario engine formula correctness and Pareto integrity.

Verifies:
- Each formula produces mathematically correct results
- Pareto frontier is truly non-dominated
- Recommendation is valid
- Cost parameters are respected (caps, rates)
"""

from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.operational import ScenarioOptionType
from app.services.scenario_engine_service import (
    _compute_all_options,
    compute_pareto_frontier,
    select_recommendation,
)
from tests.unit.conftest import _make_scenario_option


def _cp(**overrides):
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


# ── Formula correctness ─────────────────────────────────────────


class TestHSFormulaCorrectness:
    def test_cost_equals_hours_times_rate_times_surcharge(self):
        cp = _cp(c_int=Decimal("40"), maj_hs=Decimal("0.50"), cap_hs_shift=100)
        gap = Decimal("20")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        expected = Decimal("20") * Decimal("40") * Decimal("1.50")
        assert hs["cout_total_eur"] == expected.quantize(Decimal("0.01"))

    def test_service_is_covered_over_gap(self):
        cp = _cp(cap_hs_shift=15)
        gap = Decimal("20")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["service_attendu_pct"] == Decimal("0.7500")

    def test_cap_limits_hours(self):
        cp = _cp(cap_hs_shift=5)
        gap = Decimal("50")
        options = _compute_all_options(gap, cp)
        hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
        assert hs["heures_couvertes"] == Decimal("5.00")


class TestInterimFormulaCorrectness:
    def test_cost_includes_urgency_premium(self):
        cp = _cp(c_interim=Decimal("50"), premium_urgence=Decimal("0.20"), cap_interim_site=100)
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        interim = next(o for o in options if o["option_type"] == ScenarioOptionType.INTERIM)
        expected = Decimal("10") * Decimal("50") * Decimal("1.20")
        assert interim["cout_total_eur"] == expected.quantize(Decimal("0.01"))

    def test_cap_limits_hours(self):
        cp = _cp(cap_interim_site=8)
        gap = Decimal("20")
        options = _compute_all_options(gap, cp)
        interim = next(o for o in options if o["option_type"] == ScenarioOptionType.INTERIM)
        assert interim["heures_couvertes"] == Decimal("8.00")


class TestReallocationFormulas:
    def test_intra_productivity_85_percent(self):
        cp = _cp()
        gap = Decimal("20")
        options = _compute_all_options(gap, cp)
        intra = next(o for o in options if o["option_type"] == ScenarioOptionType.REALLOC_INTRA)
        assert intra["heures_couvertes"] == Decimal("17.00")
        assert intra["service_attendu_pct"] == Decimal("0.8500")

    def test_inter_productivity_75_percent(self):
        cp = _cp()
        gap = Decimal("20")
        options = _compute_all_options(gap, cp)
        inter = next(o for o in options if o["option_type"] == ScenarioOptionType.REALLOC_INTER)
        assert inter["heures_couvertes"] == Decimal("15.00")
        assert inter["service_attendu_pct"] == Decimal("0.7500")

    def test_inter_includes_travel_cost(self):
        cp = _cp()
        gap = Decimal("8")  # 1 person needed
        options = _compute_all_options(gap, cp)
        inter = next(o for o in options if o["option_type"] == ScenarioOptionType.REALLOC_INTER)
        # travel = 1 * 80 = 80, friction = 8 * 8 = 64, total = 144
        assert inter["cout_total_eur"] == Decimal("144.00")


class TestServiceAdjustFormula:
    def test_cost_is_gap_times_backlog(self):
        cp = _cp(c_backlog=Decimal("100"))
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        adjust = next(o for o in options if o["option_type"] == ScenarioOptionType.SERVICE_ADJUST)
        assert adjust["cout_total_eur"] == Decimal("1000.00")

    def test_service_is_zero(self):
        cp = _cp()
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        adjust = next(o for o in options if o["option_type"] == ScenarioOptionType.SERVICE_ADJUST)
        assert adjust["service_attendu_pct"] == Decimal("0.0000")


class TestOutsourceFormula:
    def test_cost_is_150_percent_interim(self):
        cp = _cp(c_interim=Decimal("50"))
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        outsource = next(o for o in options if o["option_type"] == ScenarioOptionType.OUTSOURCE)
        expected = Decimal("10") * Decimal("50") * Decimal("1.50")
        assert outsource["cout_total_eur"] == expected.quantize(Decimal("0.01"))

    def test_service_is_100_percent(self):
        cp = _cp()
        gap = Decimal("10")
        options = _compute_all_options(gap, cp)
        outsource = next(o for o in options if o["option_type"] == ScenarioOptionType.OUTSOURCE)
        assert outsource["service_attendu_pct"] == Decimal("1.0000")


# ── Pareto non-domination verification ──────────────────────────


class TestParetoIntegrity:
    def test_no_frontier_member_dominated_by_another(self):
        """For any two options in the frontier, neither dominates the other."""
        cp = _cp()
        for gap_val in [1, 5, 10, 20, 50, 100]:
            gap = Decimal(str(gap_val))
            options_data = _compute_all_options(gap, cp)
            options = [
                _make_scenario_option(
                    cout_total_eur=d["cout_total_eur"],
                    service_attendu_pct=d["service_attendu_pct"],
                )
                for d in options_data
            ]
            frontier = compute_pareto_frontier(options)

            for a in frontier:
                for b in frontier:
                    if a is b:
                        continue
                    a_dominates_b = (
                        a.cout_total_eur <= b.cout_total_eur
                        and a.service_attendu_pct >= b.service_attendu_pct
                        and (
                            a.cout_total_eur < b.cout_total_eur
                            or a.service_attendu_pct > b.service_attendu_pct
                        )
                    )
                    assert not a_dominates_b, (
                        f"Pareto violation: {a} dominates {b}"
                    )

    def test_every_non_frontier_member_is_dominated(self):
        """Every option NOT in the frontier is dominated by some frontier member."""
        cp = _cp()
        gap = Decimal("20")
        options_data = _compute_all_options(gap, cp)
        options = [
            _make_scenario_option(
                cout_total_eur=d["cout_total_eur"],
                service_attendu_pct=d["service_attendu_pct"],
            )
            for d in options_data
        ]
        frontier = compute_pareto_frontier(options)
        non_frontier = [o for o in options if o not in frontier]

        for nf in non_frontier:
            is_dominated = False
            for f_opt in frontier:
                cost_le = f_opt.cout_total_eur <= nf.cout_total_eur
                svc_ge = f_opt.service_attendu_pct >= nf.service_attendu_pct
                cost_lt = f_opt.cout_total_eur < nf.cout_total_eur
                svc_gt = f_opt.service_attendu_pct > nf.service_attendu_pct
                if cost_le and svc_ge and (cost_lt or svc_gt):
                    is_dominated = True
                    break
            assert is_dominated, f"Non-frontier option {nf} is not dominated"

    def test_recommendation_is_in_frontier(self):
        """The recommended option must be in the Pareto frontier."""
        cp = _cp()
        for gap_val in [5, 10, 20, 50]:
            gap = Decimal(str(gap_val))
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
            if rec is not None:
                assert rec in frontier

    def test_recommendation_cheapest_at_98_or_highest_service(self):
        """If any frontier option has service >= 98%, rec is the cheapest among those.
        Otherwise rec has the highest service at lowest cost."""
        cp = _cp()
        gap = Decimal("10")
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

        if rec is None:
            return

        high_service = [
            o for o in frontier if o.service_attendu_pct >= Decimal("0.9800")
        ]
        if high_service:
            # rec should be the cheapest
            cheapest = min(high_service, key=lambda o: o.cout_total_eur)
            assert rec.cout_total_eur == cheapest.cout_total_eur
        else:
            # rec should have highest service
            highest = max(frontier, key=lambda o: o.service_attendu_pct)
            assert rec.service_attendu_pct == highest.service_attendu_pct


# ── Cost parameter respect verification ─────────────────────────


class TestCostParameterRespect:
    def test_cap_hs_never_exceeded(self):
        for cap in [0, 1, 5, 10, 30, 100]:
            cp = _cp(cap_hs_shift=cap)
            gap = Decimal("200")
            options = _compute_all_options(gap, cp)
            hs = next(o for o in options if o["option_type"] == ScenarioOptionType.HS)
            assert hs["heures_couvertes"] <= Decimal(str(cap))

    def test_cap_interim_never_exceeded(self):
        for cap in [0, 1, 5, 10, 50, 100]:
            cp = _cp(cap_interim_site=cap)
            gap = Decimal("200")
            options = _compute_all_options(gap, cp)
            interim = next(o for o in options if o["option_type"] == ScenarioOptionType.INTERIM)
            assert interim["heures_couvertes"] <= Decimal(str(cap))

    def test_service_never_exceeds_one(self):
        cp = _cp()
        for gap_val in [1, 5, 10, 20, 50]:
            gap = Decimal(str(gap_val))
            options = _compute_all_options(gap, cp)
            for opt in options:
                assert opt["service_attendu_pct"] <= Decimal("1.0000")

    def test_cost_never_negative(self):
        cp = _cp()
        for gap_val in [0, 1, 5, 10, 20, 50, 100]:
            gap = Decimal(str(gap_val))
            options = _compute_all_options(gap, cp)
            for opt in options:
                assert opt["cout_total_eur"] >= Decimal("0.00")
