"""Shared test helpers for unit tests.

Provides lightweight mock factories for database session results
without spinning up an actual ASGI client or database.
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.models.operational import (
    CoverageAlertSeverity,
    CoverageAlertStatus,
    Horizon,
    ScenarioOptionType,
    ShiftType,
)


def make_scalar_result(value):
    """Return a mock execute result where scalar_one_or_none() returns `value`
    and scalar_one() returns `value`."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalar_one.return_value = value
    return result


def make_scalars_result(values):
    """Return a mock execute result where scalars().all() returns `values`."""
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


def make_all_result(rows):
    """Return a mock execute result where .all() returns `rows`."""
    result = MagicMock()
    result.all.return_value = rows
    return result


def make_mock_session(*execute_results):
    """Return an AsyncMock session.

    If ``execute_results`` are provided they are returned in order on
    successive ``await session.execute(...)`` calls.  Otherwise the
    default return is ``make_scalar_result(None)``.
    """
    session = AsyncMock()
    if execute_results:
        session.execute.side_effect = list(execute_results)
    else:
        session.execute.return_value = make_scalar_result(None)
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


# -- Operational layer mock factories -----------------------------
# Use SimpleNamespace (not MagicMock) for Pydantic model_validate compat.


def _make_tenant(org_id=None):
    """Return a mock TenantFilter."""
    oid = org_id or "11111111-1111-1111-1111-111111111111"
    tenant = MagicMock()
    tenant.organization_id = oid
    tenant.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
    return tenant


def _make_canonical_record(**overrides):
    """Build a canonical record SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "site_id": "site-paris",
        "date": date(2026, 1, 15),
        "shift": ShiftType.AM,
        "competence": "infirmier",
        "charge_units": Decimal("120.00"),
        "capacite_plan_h": Decimal("100.00"),
        "realise_h": Decimal("92.00"),
        "abs_h": Decimal("8.00"),
        "hs_h": Decimal("4.00"),
        "interim_h": Decimal("2.00"),
        "cout_interne_est": Decimal("3500.00"),
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_cost_parameter(**overrides):
    """Build a cost parameter SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "site_id": "site-paris",
        "version": 1,
        "c_int": Decimal("35.00"),
        "maj_hs": Decimal("0.2500"),
        "c_interim": Decimal("45.00"),
        "premium_urgence": Decimal("0.1000"),
        "c_backlog": Decimal("60.00"),
        "cap_hs_shift": 30,
        "cap_interim_site": 50,
        "lead_time_jours": 2,
        "effective_from": date(2026, 1, 1),
        "effective_until": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_coverage_alert(**overrides):
    """Build a coverage alert SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "site_id": "site-paris",
        "alert_date": date(2026, 1, 18),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "p_rupture": Decimal("0.6500"),
        "gap_h": Decimal("12.00"),
        "impact_eur": Decimal("420.00"),
        "severity": CoverageAlertSeverity.HIGH,
        "status": CoverageAlertStatus.OPEN,
        "drivers_json": ["Tendance absences", "Charge en hausse"],
        "acknowledged_at": None,
        "resolved_at": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_scenario_option(**overrides):
    """Build a scenario option SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "coverage_alert_id": uuid.uuid4(),
        "cost_parameter_id": uuid.uuid4(),
        "option_type": ScenarioOptionType.HS,
        "label": "Heures supplementaires",
        "cout_total_eur": Decimal("525.00"),
        "service_attendu_pct": Decimal("1.0000"),
        "heures_couvertes": Decimal("12.00"),
        "is_pareto_optimal": True,
        "is_recommended": False,
        "contraintes_json": {"cap_hs_shift": 30, "capped": False},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_operational_decision(**overrides):
    """Build an operational decision SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "coverage_alert_id": uuid.uuid4(),
        "recommended_option_id": uuid.uuid4(),
        "chosen_option_id": uuid.uuid4(),
        "site_id": "site-paris",
        "decision_date": date(2026, 1, 18),
        "shift": ShiftType.AM,
        "horizon": Horizon.J3,
        "gap_h": Decimal("12.00"),
        "is_override": False,
        "override_reason": None,
        "cout_attendu_eur": Decimal("525.00"),
        "service_attendu_pct": Decimal("1.0000"),
        "cout_observe_eur": None,
        "service_observe_pct": None,
        "decided_by": uuid.uuid4(),
        "comment": None,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_proof_record(**overrides):
    """Build a proof record SimpleNamespace with sensible defaults."""
    now = datetime.now(UTC)
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "site_id": "site-paris",
        "month": date(2026, 1, 1),
        "cout_bau_eur": Decimal("4800.00"),
        "cout_100_eur": Decimal("2100.00"),
        "cout_reel_eur": Decimal("2500.00"),
        "gain_net_eur": Decimal("2300.00"),
        "service_bau_pct": Decimal("0.6000"),
        "service_reel_pct": Decimal("0.8500"),
        "adoption_pct": Decimal("0.9000"),
        "alertes_emises": 10,
        "alertes_traitees": 9,
        "details_json": {"total_gap_h": "120", "bau_rate": "40.00"},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)
