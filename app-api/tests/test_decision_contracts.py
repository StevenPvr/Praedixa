from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING, cast

import pytest
from sqlalchemy import literal, select

from app.core.exceptions import PraedixaError
from app.services.gold_live_data import (
    build_gold_provenance,
    build_proof_records,
    get_gold_snapshot,
)
from app.services.proof_service import (
    _BAU_METHOD_VERSION_HISTORICAL,
    _BAU_METHOD_VERSION_UNPROVEN,
    _bounded_ratio,
    _build_observed_decision_aggregate_query,
    resolve_bau_baseline,
    resolve_proof_outcome,
)
from app.services.scenario_engine_service import (
    build_scenario_option_blueprints,
    resolve_recommendation_outcome,
    select_recommendation,
)
from scripts.medallion_pipeline import (
    DEFAULT_COLUMN_ALIASES,
    BronzeAsset,
    build_silver_rows,
    split_gold_features_and_quality_metadata,
)

if TYPE_CHECKING:
    from app.models.operational import ScenarioOption


class _Option:
    def __init__(
        self,
        *,
        cost: str,
        service: str,
        policy_compliance: bool | None,
        risk: str = "0.1000",
        feasibility: str = "0.9500",
    ) -> None:
        self.cout_total_eur = Decimal(cost)
        self.service_attendu_pct = Decimal(service)
        self.policy_compliance = policy_compliance
        self.risk_score = Decimal(risk)
        self.feasibility_score = Decimal(feasibility)


def test_gold_snapshot_rejects_forbidden_mock_runtime_columns(
    tmp_path: Path,
) -> None:
    csv_path = tmp_path / "gold.csv"
    csv_path.write_text(
        (
            "client_slug,site_code,date,"
            "mock_forecasts_daily__forecasted_orders,"
            "mock_forecasts_daily__predicted_required_fte\n"
            "acme-logistics,LYO,2026-03-01,120,14"
        ),
        encoding="utf-8",
    )

    with pytest.raises(PraedixaError) as error:
        get_gold_snapshot(csv_path)

    assert error.value.code == "GOLD_RUNTIME_FORBIDDEN_COLUMNS"


def test_build_silver_rows_requires_canonical_dataset_names(tmp_path: Path) -> None:
    csv_path = tmp_path / "forecasts_daily.csv"
    csv_path.write_text(
        (
            "date,site_code,site_name,forecasted_orders,predicted_required_fte\n"
            "2026-03-01,LYO,Lyon,120,14\n"
        ),
        encoding="utf-8",
    )
    rows = build_silver_rows(
        [
            BronzeAsset(
                client_slug="acme-logistics",
                dataset="forecasts_daily",
                domain="mlops",
                path=csv_path,
                ingested_at=datetime.now(UTC).isoformat(),
            )
        ],
        DEFAULT_COLUMN_ALIASES,
    )

    assert rows[0]["forecasts_daily__forecasted_orders"] == 120
    assert rows[0]["forecasts_daily__predicted_required_fte"] == 14


def test_build_silver_rows_rejects_obsolete_mock_dataset_names(
    tmp_path: Path,
) -> None:
    csv_path = tmp_path / "mock_forecasts_daily.csv"
    csv_path.write_text(
        (
            "date,site_code,site_name,forecasted_orders,predicted_required_fte\n"
            "2026-03-01,LYO,Lyon,120,14\n"
        ),
        encoding="utf-8",
    )

    with pytest.raises(
        RuntimeError,
        match="Bronze assets must already use canonical dataset names",
    ):
        build_silver_rows(
            [
                BronzeAsset(
                    client_slug="acme-logistics",
                    dataset="mock_forecasts_daily",
                    domain="mlops",
                    path=csv_path,
                    ingested_at=datetime.now(UTC).isoformat(),
                )
            ],
            DEFAULT_COLUMN_ALIASES,
        )


def test_split_gold_features_rejects_legacy_runtime_columns() -> None:
    with pytest.raises(RuntimeError, match="canonical runtime column names"):
        split_gold_features_and_quality_metadata(
            [
                {
                    "client_slug": "acme-logistics",
                    "site_code": "LYO",
                    "site_name": "Lyon",
                    "date": "2026-03-01",
                    "mock_forecasts_daily__forecasted_orders": 120,
                }
            ]
        )


def test_gold_provenance_reports_canonical_runtime_policy(tmp_path: Path) -> None:
    csv_path = tmp_path / "gold-canonical.csv"
    csv_path.write_text(
        (
            "client_slug,site_code,date,forecasts_daily__forecasted_orders\n"
            "acme-logistics,LYO,2026-03-01,120\n"
        ),
        encoding="utf-8",
    )
    snapshot = get_gold_snapshot(csv_path)
    provenance = build_gold_provenance(snapshot)

    assert provenance["policy"]["legacy_runtime_columns_detected"] == []
    assert provenance["policy"]["strict_data_policy_ok"] is True


def test_select_recommendation_fails_closed_without_explicit_policy_flags() -> None:
    options = cast(
        "list[ScenarioOption]",
        [
            _Option(cost="100.00", service="0.9900", policy_compliance=None),
            _Option(cost="90.00", service="0.9800", policy_compliance=None),
        ],
    )

    assert select_recommendation(options) is None
    outcome = resolve_recommendation_outcome(options)
    assert outcome["state"] == "unconfigured"
    assert outcome["reason"] == "missing_policy_compliance_flags"


def test_select_recommendation_returns_none_when_policy_rejects_all_options() -> None:
    options = cast(
        "list[ScenarioOption]",
        [
            _Option(cost="80.00", service="0.9950", policy_compliance=False),
            _Option(cost="70.00", service="0.9800", policy_compliance=False),
        ],
    )

    assert select_recommendation(options) is None
    outcome = resolve_recommendation_outcome(options)
    assert outcome["state"] == "no_feasible_solution"
    assert outcome["reason"] == "no_policy_compliant_option"


def test_scenario_blueprints_require_explicit_cost_configuration() -> None:
    class _IncompleteCostParam:
        c_int = Decimal("18.00")
        maj_hs = Decimal("0.25")

    with pytest.raises(ValueError, match="unconfigured cost parameter"):
        build_scenario_option_blueprints(
            gap=Decimal("8.0"),
            cost_param=_IncompleteCostParam(),
            horizon="j7",
        )


def test_scenario_blueprints_mark_no_gap_explicitly() -> None:
    class _CostParam:
        c_int = Decimal("18.00")
        maj_hs = Decimal("0.25")
        c_interim = Decimal("28.00")
        premium_urgence = Decimal("0.10")
        c_backlog = Decimal("60.00")
        cap_hs_shift = 30
        cap_interim_site = 50
        lead_time_jours = 2

    options = build_scenario_option_blueprints(
        gap=Decimal("0.00"),
        cost_param=_CostParam(),
        horizon="j7",
    )
    selection_states = [
        cast("dict[str, str]", option["contraintes_json"])["selection_state"]
        for option in options
    ]

    assert len(options) == 6
    assert all(state == "no_gap" for state in selection_states)
    assert all(option["is_recommended"] is False for option in options)


def test_resolve_bau_baseline_marks_unproven_records_explicitly() -> None:
    proven = resolve_bau_baseline(
        total_gap=Decimal("12.5"),
        cout_reel=Decimal("200.00"),
        historical_bau_rate=Decimal("42.00"),
        historical_service_bau=Decimal("0.9700"),
    )
    assert proven["bau_method_version"] == _BAU_METHOD_VERSION_HISTORICAL
    assert proven["proof_status"] == "proved"
    assert proven["proof_blockers"] == []
    assert proven["historical_bau_status"] == "configured"
    assert proven["service_bau_status"] == "configured"
    assert proven["gain_net"] == Decimal("325.00")

    unproven = resolve_bau_baseline(
        total_gap=Decimal("12.5"),
        cout_reel=Decimal("200.00"),
        historical_bau_rate=None,
        historical_service_bau=None,
    )
    assert unproven["bau_method_version"] == _BAU_METHOD_VERSION_UNPROVEN
    assert unproven["proof_status"] == "cannot_prove_yet"
    assert unproven["proof_blockers"] == ["missing_historical_bau"]
    assert unproven["historical_bau_status"] == "cannot_prove_yet"
    assert unproven["cout_bau"] == Decimal("200.00")
    assert unproven["gain_net"] == Decimal("0.00")


def test_resolve_bau_baseline_keeps_service_proxy_explicitly_unconfigured() -> None:
    proven_without_service = resolve_bau_baseline(
        total_gap=Decimal("10.0"),
        cout_reel=Decimal("150.00"),
        historical_bau_rate=Decimal("30.00"),
        historical_service_bau=None,
    )

    assert proven_without_service["proof_status"] == "cannot_prove_yet"
    assert proven_without_service["proof_blockers"] == ["missing_service_bau"]
    assert proven_without_service["service_bau"] is None
    assert proven_without_service["service_bau_status"] == "cannot_prove_yet"


def test_proof_ratios_are_bounded_to_distinct_alert_coverage() -> None:
    assert _bounded_ratio(5, 4) == Decimal("1.0000")
    assert _bounded_ratio(2, 4) == Decimal("0.5000")
    assert _bounded_ratio(0, 4) == Decimal("0.0000")


def test_observed_decision_query_counts_distinct_alerts() -> None:
    alerts_subq = select(literal("alert-1").label("id")).subquery()
    query = _build_observed_decision_aggregate_query(alerts_subq)
    sql = str(query).lower()

    assert "count(distinct" in sql
    assert "coverage_alert_id" in sql
    assert "count(operational_decisions.id)" not in sql


def test_resolve_proof_outcome_requires_observed_and_optimized_inputs() -> None:
    outcome = resolve_proof_outcome(
        cout_bau=Decimal("420.00"),
        cout_100=Decimal("0.00"),
        cout_reel=Decimal("0.00"),
        adoption_pct=Decimal("0.7500"),
        alertes_emises=4,
        alertes_traitees=0,
        recommended_alert_count=0,
        bau_baseline=resolve_bau_baseline(
            total_gap=Decimal("10.0"),
            cout_reel=Decimal("0.00"),
            historical_bau_rate=Decimal("42.00"),
            historical_service_bau=Decimal("0.9600"),
        ),
    )

    assert outcome["proof_status"] == "cannot_prove_yet"
    assert outcome["optimized_counterfactual_status"] == "cannot_prove_yet"
    assert outcome["gain_net"] == Decimal("0.00")
    assert outcome["proof_blockers"] == [
        "missing_observed_decisions",
        "missing_optimized_counterfactual",
    ]


def test_resolve_proof_outcome_marks_no_feasible_solution_explicitly() -> None:
    outcome = resolve_proof_outcome(
        cout_bau=Decimal("420.00"),
        cout_100=Decimal("430.00"),
        cout_reel=Decimal("390.00"),
        adoption_pct=Decimal("0.9000"),
        alertes_emises=2,
        alertes_traitees=2,
        recommended_alert_count=2,
        bau_baseline=resolve_bau_baseline(
            total_gap=Decimal("10.0"),
            cout_reel=Decimal("390.00"),
            historical_bau_rate=Decimal("42.00"),
            historical_service_bau=Decimal("0.9600"),
        ),
    )

    assert outcome["proof_status"] == "no_feasible_solution"
    assert outcome["optimized_counterfactual_status"] == "no_feasible_solution"
    assert outcome["proof_blockers"] == ["optimized_counterfactual_not_better_than_bau"]
    assert outcome["gain_net"] == Decimal("0.00")


def test_resolve_proof_outcome_clamps_attribution_confidence() -> None:
    outcome = resolve_proof_outcome(
        cout_bau=Decimal("420.00"),
        cout_100=Decimal("300.00"),
        cout_reel=Decimal("320.00"),
        adoption_pct=Decimal("1.2500"),
        alertes_emises=2,
        alertes_traitees=2,
        recommended_alert_count=2,
        bau_baseline=resolve_bau_baseline(
            total_gap=Decimal("10.0"),
            cout_reel=Decimal("320.00"),
            historical_bau_rate=Decimal("42.00"),
            historical_service_bau=Decimal("0.9600"),
        ),
    )

    assert outcome["proof_status"] == "proved"
    assert outcome["attribution_confidence"] == Decimal("1.0000")


def test_gold_live_proof_records_fail_closed_without_explicit_bau_inputs() -> None:
    result = build_proof_records(
        rows=[
            {
                "date": "2026-03-20",
                "site_code": "LYO",
                "finance_monthly__labor_cost_eur": 1200,
                "roi_monthly__savings_eur": 300,
                "roi_monthly__avoided_cost_eur": 180,
                "roi_monthly__net_gain_eur": 220,
                "actions_adoption_daily__adoption_rate_pct": 80,
                "operations_daily__on_time_rate_pct": 97,
                "quality_incidents_daily__quality_incidents": 5,
                "actions_adoption_daily__executed_actions_count": 4,
            }
        ],
        organization_id=uuid.uuid4(),
    )
    record = result[0]
    assert record["bau_method_version"] == "gold_live_cannot_prove_yet_v1"
    assert record["gain_net_eur"] == 0.0
    assert record["service_bau_pct"] is None
    assert record["capture_rate"] is None
    assert record["details_json"]["proof_status"] == "cannot_prove_yet"
    assert "missing_bau_cost" in record["details_json"]["proof_blockers"]
    assert "missing_optimized_cost" in record["details_json"]["proof_blockers"]


def test_gold_live_proof_records_use_explicit_cost_inputs_when_present() -> None:
    result = build_proof_records(
        rows=[
            {
                "date": "2026-03-20",
                "site_code": "LYO",
                "finance_monthly__labor_cost_eur": 1700,
                "roi_monthly__bau_cost_eur": 2100,
                "roi_monthly__optimized_cost_eur": 1600,
                "roi_monthly__bau_service_pct": 95,
                "roi_monthly__net_gain_eur": 400,
                "actions_adoption_daily__adoption_rate_pct": 80,
                "operations_daily__on_time_rate_pct": 97,
                "quality_incidents_daily__quality_incidents": 5,
                "actions_adoption_daily__executed_actions_count": 4,
            }
        ],
        organization_id=uuid.uuid4(),
    )
    record = result[0]
    assert record["bau_method_version"] == "gold_live_explicit_cost_inputs_v1"
    assert record["cout_bau_eur"] == 2100.0
    assert record["cout_100_eur"] == 1600.0
    assert record["cout_reel_eur"] == 1700.0
    assert record["gain_net_eur"] == 400.0
    assert record["service_bau_pct"] == 0.95
    assert record["service_reel_pct"] == 0.97
    assert record["capture_rate"] == 0.8
    assert record["details_json"]["proof_status"] == "proved"
