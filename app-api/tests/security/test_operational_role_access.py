"""Security tests — schema hardening with extra='forbid'.

Verifies that Pydantic schemas reject unexpected fields,
preventing mass assignment attacks.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.operational import (
    CanonicalRecordBulkCreate,
    CanonicalRecordCreate,
    CostParameterCreate,
    CoverageAlertAcknowledge,
    CoverageAlertResolve,
    MockForecastTriggerRequest,
    OperationalDecisionCreate,
    OperationalDecisionUpdate,
)

# ── CanonicalRecordCreate ───────────────────────────────────────


class TestCanonicalRecordCreateSchema:
    def test_rejects_organization_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CanonicalRecordCreate(
                site_id="site-paris",
                date=date(2026, 1, 15),
                shift="am",
                capacite_plan_h=Decimal("100"),
                organization_id=str(uuid.uuid4()),
            )

    def test_rejects_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CanonicalRecordCreate(
                site_id="site-paris",
                date=date(2026, 1, 15),
                shift="am",
                capacite_plan_h=Decimal("100"),
                id=str(uuid.uuid4()),
            )

    def test_rejects_unknown_field(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CanonicalRecordCreate(
                site_id="site-paris",
                date=date(2026, 1, 15),
                shift="am",
                capacite_plan_h=Decimal("100"),
                hacked_field="value",
            )

    def test_rejects_negative_capacite(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordCreate(
                site_id="site-paris",
                date=date(2026, 1, 15),
                shift="am",
                capacite_plan_h=Decimal("-1"),
            )

    def test_valid_record_accepted(self) -> None:
        rec = CanonicalRecordCreate(
            site_id="site-paris",
            date=date(2026, 1, 15),
            shift="am",
            capacite_plan_h=Decimal("100"),
        )
        assert rec.site_id == "site-paris"


# ── CanonicalRecordBulkCreate ───────────────────────────────────


class TestCanonicalRecordBulkCreateSchema:
    def test_rejects_empty_list(self) -> None:
        with pytest.raises(ValidationError):
            CanonicalRecordBulkCreate(records=[])

    def test_rejects_extra_field(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CanonicalRecordBulkCreate(
                records=[
                    {
                        "site_id": "s1",
                        "date": "2026-01-01",
                        "shift": "am",
                        "capacite_plan_h": 100,
                    }
                ],
                organization_id=str(uuid.uuid4()),
            )

    def test_valid_bulk_accepted(self) -> None:
        bulk = CanonicalRecordBulkCreate(
            records=[
                {
                    "site_id": "s1",
                    "date": "2026-01-01",
                    "shift": "am",
                    "capacite_plan_h": 100,
                }
            ]
        )
        assert len(bulk.records) == 1


# ── CostParameterCreate ────────────────────────────────────────


class TestCostParameterCreateSchema:
    def test_rejects_organization_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CostParameterCreate(
                c_int=Decimal("35"),
                maj_hs=Decimal("0.25"),
                c_interim=Decimal("45"),
                effective_from=date(2026, 1, 1),
                organization_id=str(uuid.uuid4()),
            )

    def test_rejects_version(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CostParameterCreate(
                c_int=Decimal("35"),
                maj_hs=Decimal("0.25"),
                c_interim=Decimal("45"),
                effective_from=date(2026, 1, 1),
                version=5,
            )

    def test_rejects_negative_cost(self) -> None:
        with pytest.raises(ValidationError):
            CostParameterCreate(
                c_int=Decimal("-1"),
                maj_hs=Decimal("0.25"),
                c_interim=Decimal("45"),
                effective_from=date(2026, 1, 1),
            )

    def test_rejects_maj_hs_above_one(self) -> None:
        with pytest.raises(ValidationError):
            CostParameterCreate(
                c_int=Decimal("35"),
                maj_hs=Decimal("1.5"),
                c_interim=Decimal("45"),
                effective_from=date(2026, 1, 1),
            )

    def test_valid_accepted(self) -> None:
        cp = CostParameterCreate(
            c_int=Decimal("35"),
            maj_hs=Decimal("0.25"),
            c_interim=Decimal("45"),
            effective_from=date(2026, 1, 1),
        )
        assert cp.c_int == Decimal("35")


# ── CoverageAlertAcknowledge ────────────────────────────────────


class TestCoverageAlertAcknowledgeSchema:
    def test_rejects_status(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CoverageAlertAcknowledge(status="resolved")

    def test_rejects_acknowledged_at(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CoverageAlertAcknowledge(acknowledged_at="2026-01-01T00:00:00Z")

    def test_empty_accepted(self) -> None:
        ack = CoverageAlertAcknowledge()
        assert ack is not None


# ── CoverageAlertResolve ────────────────────────────────────────


class TestCoverageAlertResolveSchema:
    def test_rejects_status(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CoverageAlertResolve(status="open")

    def test_rejects_resolved_at(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            CoverageAlertResolve(resolved_at="2026-01-01T00:00:00Z")

    def test_empty_accepted(self) -> None:
        resolve = CoverageAlertResolve()
        assert resolve is not None


# ── OperationalDecisionCreate ───────────────────────────────────


class TestOperationalDecisionCreateSchema:
    def test_rejects_decided_by(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionCreate(
                coverage_alert_id=uuid.uuid4(),
                decided_by=uuid.uuid4(),
            )

    def test_rejects_organization_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionCreate(
                coverage_alert_id=uuid.uuid4(),
                organization_id=str(uuid.uuid4()),
            )

    def test_rejects_cout_observe(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionCreate(
                coverage_alert_id=uuid.uuid4(),
                cout_observe_eur=Decimal("100"),
            )

    def test_rejects_service_observe(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionCreate(
                coverage_alert_id=uuid.uuid4(),
                service_observe_pct=Decimal("0.95"),
            )

    def test_rejects_site_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionCreate(
                coverage_alert_id=uuid.uuid4(),
                site_id="site-paris",
            )

    def test_valid_accepted(self) -> None:
        dec = OperationalDecisionCreate(
            coverage_alert_id=uuid.uuid4(),
        )
        assert dec.is_override is False


# ── OperationalDecisionUpdate ───────────────────────────────────


class TestOperationalDecisionUpdateSchema:
    def test_rejects_decided_by(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionUpdate(
                decided_by=uuid.uuid4(),
            )

    def test_rejects_organization_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionUpdate(
                organization_id=str(uuid.uuid4()),
            )

    def test_rejects_coverage_alert_id(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            OperationalDecisionUpdate(
                coverage_alert_id=uuid.uuid4(),
            )

    def test_rejects_negative_cost(self) -> None:
        with pytest.raises(ValidationError):
            OperationalDecisionUpdate(
                cout_observe_eur=Decimal("-100"),
            )

    def test_rejects_service_above_one(self) -> None:
        with pytest.raises(ValidationError):
            OperationalDecisionUpdate(
                service_observe_pct=Decimal("1.5"),
            )

    def test_valid_accepted(self) -> None:
        upd = OperationalDecisionUpdate(
            cout_observe_eur=Decimal("450"),
            service_observe_pct=Decimal("0.95"),
        )
        assert upd.cout_observe_eur == Decimal("450")


# ── MockForecastTriggerRequest ──────────────────────────────────


class TestMockForecastTriggerSchema:
    def test_rejects_extra_field(self) -> None:
        with pytest.raises(ValidationError, match="extra"):
            MockForecastTriggerRequest(
                days_lookback=30,
                organization_id=str(uuid.uuid4()),
            )

    def test_rejects_zero_lookback(self) -> None:
        with pytest.raises(ValidationError):
            MockForecastTriggerRequest(days_lookback=0)

    def test_rejects_too_large_lookback(self) -> None:
        with pytest.raises(ValidationError):
            MockForecastTriggerRequest(days_lookback=366)

    def test_valid_accepted(self) -> None:
        req = MockForecastTriggerRequest(days_lookback=30)
        assert req.days_lookback == 30
