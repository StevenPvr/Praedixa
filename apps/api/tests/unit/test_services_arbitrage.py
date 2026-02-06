"""Tests for app.services.arbitrage — scoring engine for gap resolution."""

import uuid
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace

import pytest

from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.services.arbitrage import (
    SCORING_CONSTANTS,
    ArbitrageOption,
    ArbitrageResult,
    _compute_deficit,
    _generate_options,
    get_arbitrage_options,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)


class TestArbitrageOption:
    """Test ArbitrageOption value object."""

    def test_slots(self):
        opt = ArbitrageOption(
            type="overtime",
            label="Heures sup",
            cost=100.0,
            delay_days=0,
            coverage_impact_pct=15.0,
            risk_level="medium",
            risk_details="fatigue",
            pros=["fast"],
            cons=["costly"],
            score=0.5,
        )
        assert opt.type == "overtime"
        assert opt.label == "Heures sup"
        assert opt.cost == 100.0
        assert opt.delay_days == 0
        assert opt.coverage_impact_pct == 15.0
        assert opt.risk_level == "medium"
        assert opt.pros == ["fast"]
        assert opt.cons == ["costly"]
        assert opt.score == 0.5


class TestArbitrageResult:
    """Test ArbitrageResult value object."""

    def test_slots(self):
        r = ArbitrageResult(
            alert_id=uuid.uuid4(),
            alert_title="Test Alert",
            alert_severity="warning",
            department_id=uuid.uuid4(),
            department_name="Dept A",
            site_name="Site 1",
            deficit_pct=15.0,
            horizon_days=7,
            options=[],
            recommendation_index=0,
        )
        assert r.alert_title == "Test Alert"
        assert r.site_name == "Site 1"
        assert r.deficit_pct == 15.0


class TestComputeDeficit:
    """Test _compute_deficit function."""

    def test_no_forecasts(self):
        total, pct, horizon = _compute_deficit([])
        assert total == 0.0
        assert pct == 0.0
        assert horizon == 0

    def test_no_negative_gaps(self):
        """Forecasts with positive gap (surplus) should not count."""
        forecasts = [
            SimpleNamespace(
                gap=5.0,
                predicted_demand=100.0,
                forecast_date=date(2026, 3, 1),
            ),
            SimpleNamespace(
                gap=10.0,
                predicted_demand=100.0,
                forecast_date=date(2026, 3, 2),
            ),
        ]
        total, pct, horizon = _compute_deficit(forecasts)
        assert total == 0.0
        assert pct == 0.0
        assert horizon == 0

    def test_all_negative_gaps(self):
        """All forecasts have negative gaps."""
        tomorrow = datetime.now(UTC).date() + timedelta(days=1)
        day_after = datetime.now(UTC).date() + timedelta(days=2)
        forecasts = [
            SimpleNamespace(gap=-10.0, predicted_demand=100.0, forecast_date=tomorrow),
            SimpleNamespace(gap=-20.0, predicted_demand=200.0, forecast_date=day_after),
        ]
        total, pct, horizon = _compute_deficit(forecasts)
        assert total == 30.0  # abs(-10) + abs(-20)
        assert pct == 10.0    # avg(10/100*100, 20/200*100) = avg(10, 10) = 10.0
        assert horizon == 2   # 2 future dates

    def test_mixed_gaps(self):
        """Only negative gaps count toward deficit."""
        today = datetime.now(UTC).date()
        tomorrow = today + timedelta(days=1)
        day_after = today + timedelta(days=2)
        forecasts = [
            SimpleNamespace(
                gap=-15.0,
                predicted_demand=100.0,
                forecast_date=tomorrow,
            ),
            SimpleNamespace(
                gap=5.0,
                predicted_demand=100.0,
                forecast_date=day_after,
            ),
        ]
        total, _pct, horizon = _compute_deficit(forecasts)
        assert total == 15.0
        assert horizon == 1

    def test_zero_demand_excluded_from_pct(self):
        """Rows with zero demand should not contribute to deficit percentage."""
        tomorrow = datetime.now(UTC).date() + timedelta(days=1)
        forecasts = [
            SimpleNamespace(gap=-10.0, predicted_demand=0.0, forecast_date=tomorrow),
            SimpleNamespace(gap=-20.0, predicted_demand=100.0, forecast_date=tomorrow),
        ]
        total, pct, _horizon = _compute_deficit(forecasts)
        assert total == 30.0
        # Only 1 row with demand > 0: 20/100*100 = 20.0
        assert pct == 20.0

    def test_past_dates_fall_back_to_row_count(self):
        """When all deficit dates are in the past, horizon = len(deficit_rows)."""
        past = datetime.now(UTC).date() - timedelta(days=5)
        forecasts = [
            SimpleNamespace(gap=-10.0, predicted_demand=50.0, forecast_date=past),
            SimpleNamespace(gap=-5.0, predicted_demand=50.0, forecast_date=past),
        ]
        _total, _pct, horizon = _compute_deficit(forecasts)
        assert horizon == 2  # no future dates, fallback to row count

    def test_zero_gap_not_counted(self):
        """gap = 0 is not negative, should not count."""
        tomorrow = datetime.now(UTC).date() + timedelta(days=1)
        forecasts = [
            SimpleNamespace(gap=0.0, predicted_demand=100.0, forecast_date=tomorrow),
        ]
        total, _pct, _horizon = _compute_deficit(forecasts)
        assert total == 0.0


class TestGenerateOptions:
    """Test _generate_options function."""

    def test_generates_four_options(self):
        options = _generate_options(
            deficit_hours=40.0,
            deficit_pct=15.0,
            horizon_days=7,
            headcount=25,
        )
        assert len(options) == 4

    def test_option_types(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        types = [o.type for o in options]
        assert types == ["overtime", "external", "redistribution", "no_action"]

    def test_option_labels(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[0].label == "Heures supplementaires"
        assert options[1].label == "Personnel interimaire"
        assert options[2].label == "Reallocation interne"
        assert options[3].label == "Accepter la degradation"

    def test_overtime_cost_calculation(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        ot = options[0]
        expected = 40.0 * 25.0 * 1.25  # deficit_hours * hourly_rate * multiplier
        assert ot.cost == expected

    def test_overtime_delay_zero(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[0].delay_days == 0

    def test_no_action_cost_zero(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[3].cost == 0.0

    def test_no_action_delay_zero(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[3].delay_days == 0

    def test_no_action_coverage_zero(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[3].coverage_impact_pct == 0.0

    def test_risk_levels(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[0].risk_level == "medium"
        assert options[1].risk_level == "medium"
        assert options[2].risk_level == "low"
        assert options[3].risk_level == "high"

    def test_scores_are_positive(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        for opt in options:
            assert opt.score >= 0

    def test_coverage_capped_by_max(self):
        """With large deficit_pct, coverage should be capped."""
        options = _generate_options(100.0, 90.0, 7, 25)
        ot_max = SCORING_CONSTANTS["overtime"]["max_coverage_pct"]
        assert options[0].coverage_impact_pct == ot_max

    def test_each_option_has_pros_and_cons(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        for opt in options:
            assert len(opt.pros) >= 2
            assert len(opt.cons) >= 2

    def test_external_delay_is_average(self):
        ext = SCORING_CONSTANTS["external"]
        expected_delay = int((ext["delay_min"] + ext["delay_max"]) / 2)
        options = _generate_options(40.0, 15.0, 7, 25)
        assert options[1].delay_days == expected_delay

    def test_redistribution_cost(self):
        options = _generate_options(40.0, 15.0, 7, 25)
        rd = SCORING_CONSTANTS["redistribution"]
        transfer_days = max(1, min(7, 5))  # min(horizon_days, 5)
        expected = transfer_days * rd["transfer_cost_per_day"]
        assert options[2].cost == round(expected, 2)


class TestGetArbitrageOptions:
    """Test get_arbitrage_options async service function."""

    @pytest.mark.asyncio
    async def test_alert_not_found(self):
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        session = make_mock_session(make_scalar_result(None))

        with pytest.raises(NotFoundError):
            await get_arbitrage_options(alert_id, tenant, session)

    @pytest.mark.asyncio
    async def test_no_entity_id_raises(self):
        """Alert without related_entity_id should raise NotFoundError."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=None,
            severity="warning",
            title="Test",
        )

        session = make_mock_session(make_scalar_result(alert))

        with pytest.raises(NotFoundError) as exc_info:
            await get_arbitrage_options(alert_id, tenant, session)
        assert "Department" in exc_info.value.message

    @pytest.mark.asyncio
    async def test_department_not_found(self):
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()
        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="warning",
            title="Test",
        )

        session = make_mock_session(
            make_scalar_result(alert),    # alert found
            make_scalar_result(None),     # department not found
        )

        with pytest.raises(NotFoundError) as exc_info:
            await get_arbitrage_options(alert_id, tenant, session)
        assert "Department" in exc_info.value.message

    @pytest.mark.asyncio
    async def test_full_flow_with_deficit(self):
        """Full flow: alert -> department -> site -> forecasts -> options."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()
        site_id = uuid.uuid4()

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="warning",
            title="Capacity Risk",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Logistics",
            site_id=site_id,
            headcount=30,
        )
        site = SimpleNamespace(
            id=site_id,
            name="Paris Hub",
        )
        tomorrow = datetime.now(UTC).date() + timedelta(days=1)
        forecasts = [
            SimpleNamespace(
                gap=-20.0,
                predicted_demand=100.0,
                forecast_date=tomorrow,
            ),
        ]

        session = make_mock_session(
            make_scalar_result(alert),       # alert lookup
            make_scalar_result(dept),        # department lookup
            make_scalar_result(site),        # site lookup
            make_scalars_result(forecasts),  # forecasts
        )

        result = await get_arbitrage_options(alert_id, tenant, session)

        assert isinstance(result, ArbitrageResult)
        assert result.alert_title == "Capacity Risk"
        assert result.department_name == "Logistics"
        assert result.site_name == "Paris Hub"
        assert len(result.options) == 4
        assert 0 <= result.recommendation_index < 4

    @pytest.mark.asyncio
    async def test_no_site_id_default_name(self):
        """When department has no site_id, site_name should be 'Site inconnu'."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="info",
            title="Alert",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Depot",
            site_id=None,  # no site
            headcount=10,
        )

        session = make_mock_session(
            make_scalar_result(alert),
            make_scalar_result(dept),
            # No site query needed since site_id is None
            make_scalars_result([]),  # no forecasts
        )

        result = await get_arbitrage_options(alert_id, tenant, session)
        assert result.site_name == "Site inconnu"

    @pytest.mark.asyncio
    async def test_site_not_found_default_name(self):
        """When site lookup returns None, site_name should stay 'Site inconnu'."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()
        site_id = uuid.uuid4()

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="error",
            title="Alert",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Depot",
            site_id=site_id,
            headcount=10,
        )

        session = make_mock_session(
            make_scalar_result(alert),
            make_scalar_result(dept),
            make_scalar_result(None),     # site not found
            make_scalars_result([]),       # no forecasts
        )

        result = await get_arbitrage_options(alert_id, tenant, session)
        assert result.site_name == "Site inconnu"

    @pytest.mark.asyncio
    async def test_zero_deficit_uses_minimum_values(self):
        """When no deficit forecasts found, use minimum nominal values."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="info",
            title="Alert",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Depot",
            site_id=None,
            headcount=20,
        )

        session = make_mock_session(
            make_scalar_result(alert),
            make_scalar_result(dept),
            make_scalars_result([]),  # no deficit forecasts
        )

        result = await get_arbitrage_options(alert_id, tenant, session)
        assert result.deficit_pct == 5.0  # minimum nominal
        assert result.horizon_days >= 1

    @pytest.mark.asyncio
    async def test_headcount_none_defaults_to_20(self):
        """When department.headcount is None, default to 20."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="warning",
            title="Alert",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Depot",
            site_id=None,
            headcount=None,
        )

        session = make_mock_session(
            make_scalar_result(alert),
            make_scalar_result(dept),
            make_scalars_result([]),
        )

        result = await get_arbitrage_options(alert_id, tenant, session)
        # Should not crash; headcount defaults to 20
        assert len(result.options) == 4

    @pytest.mark.asyncio
    async def test_recommendation_is_highest_score(self):
        """recommendation_index should point to the option with highest score."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity="warning",
            title="Alert",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Logistics",
            site_id=None,
            headcount=25,
        )
        tomorrow = datetime.now(UTC).date() + timedelta(days=1)
        forecasts = [
            SimpleNamespace(gap=-50.0, predicted_demand=200.0, forecast_date=tomorrow),
        ]

        session = make_mock_session(
            make_scalar_result(alert),
            make_scalar_result(dept),
            make_scalars_result(forecasts),
        )

        result = await get_arbitrage_options(alert_id, tenant, session)
        best = max(result.options, key=lambda o: o.score)
        assert result.options[result.recommendation_index].score == best.score

    @pytest.mark.asyncio
    async def test_severity_as_enum(self):
        """When alert.severity is an enum, should use .value."""
        tenant = TenantFilter("org-1")
        alert_id = uuid.uuid4()
        dept_id = uuid.uuid4()

        from app.models.dashboard_alert import AlertSeverity

        alert = SimpleNamespace(
            id=alert_id,
            related_entity_id=dept_id,
            severity=AlertSeverity.CRITICAL,
            title="Critical Alert",
        )
        dept = SimpleNamespace(
            id=dept_id,
            name="Logistics",
            site_id=None,
            headcount=25,
        )

        session = make_mock_session(
            make_scalar_result(alert),
            make_scalar_result(dept),
            make_scalars_result([]),
        )

        result = await get_arbitrage_options(alert_id, tenant, session)
        assert result.alert_severity == "critical"


class TestScoringConstants:
    """Test SCORING_CONSTANTS structure."""

    def test_has_four_types(self):
        assert set(SCORING_CONSTANTS.keys()) == {
            "overtime", "external", "redistribution", "no_action"
        }

    def test_overtime_has_required_keys(self):
        ot = SCORING_CONSTANTS["overtime"]
        assert "hourly_rate" in ot
        assert "overtime_multiplier" in ot
        assert "max_coverage_pct" in ot
        assert "risk_weight" in ot

    def test_all_risk_weights_between_0_and_1(self):
        for name, constants in SCORING_CONSTANTS.items():
            weight = constants["risk_weight"]
            assert 0 <= weight <= 1, f"{name} risk_weight out of range"
