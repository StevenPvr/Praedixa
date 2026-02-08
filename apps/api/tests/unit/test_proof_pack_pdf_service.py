"""Tests for proof_pack_pdf_service — PDF generation.

Covers:
- generate_proof_pack_pdf: returns bytes, basic structure
- Empty data handling
- Formatting helpers
"""

from decimal import Decimal

import pytest

from app.services.proof_pack_pdf_service import (
    _fmt_eur,
    _fmt_pct,
    generate_proof_pack_pdf,
)


# ── _fmt_eur ────────────────────────────────────────────────────


class TestFmtEur:
    def test_formats_number(self):
        result = _fmt_eur(1234.56)
        assert "1,234.56" in result or "1234.56" in result

    def test_none_returns_na(self):
        assert _fmt_eur(None) == "N/A"

    def test_zero(self):
        result = _fmt_eur(0)
        assert "0.00" in result

    def test_string_value(self):
        result = _fmt_eur("1000.50")
        assert "1,000.50" in result or "1000.50" in result

    def test_negative(self):
        result = _fmt_eur(-500.0)
        assert "-500.00" in result


# ── _fmt_pct ────────────────────────────────────────────────────


class TestFmtPct:
    def test_decimal_to_percent(self):
        result = _fmt_pct(0.85)
        assert "85.0%" == result

    def test_none_returns_na(self):
        assert _fmt_pct(None) == "N/A"

    def test_zero(self):
        assert _fmt_pct(0) == "0.0%"

    def test_already_percent(self):
        result = _fmt_pct(85)
        assert "85.0%" == result

    def test_string_value(self):
        result = _fmt_pct("0.95")
        assert "95.0%" == result

    def test_one_hundred_percent(self):
        result = _fmt_pct(1.0)
        assert "100.0%" == result


# ── generate_proof_pack_pdf ─────────────────────────────────────


class TestGenerateProofPackPdf:
    def test_returns_bytes(self):
        result = generate_proof_pack_pdf(
            org_name="Acme Corp",
            site_id="site-paris",
            month="2026-01",
            proof_record={
                "gain_net_eur": 2300,
                "adoption_pct": 0.9,
                "service_reel_pct": 0.85,
                "alertes_emises": 10,
                "alertes_traitees": 9,
                "cout_bau_eur": 4800,
                "cout_100_eur": 2100,
                "cout_reel_eur": 2500,
                "service_bau_pct": 0.6,
            },
            decisions=[
                {
                    "decision_date": "2026-01-15",
                    "shift": "am",
                    "gap_h": "12.00",
                    "cout_observe_eur": 450,
                    "is_override": False,
                },
            ],
        )
        assert isinstance(result, bytes)
        assert len(result) > 0
        assert result[:4] == b"%PDF"

    def test_empty_decisions(self):
        result = generate_proof_pack_pdf(
            org_name="Acme Corp",
            site_id="site-paris",
            month="2026-01",
            proof_record={
                "gain_net_eur": 0,
                "adoption_pct": None,
                "service_reel_pct": None,
                "alertes_emises": 0,
                "alertes_traitees": 0,
                "cout_bau_eur": 0,
                "cout_100_eur": 0,
                "cout_reel_eur": 0,
                "service_bau_pct": 0.6,
            },
            decisions=[],
        )
        assert isinstance(result, bytes)
        assert result[:4] == b"%PDF"

    def test_many_decisions_truncated_to_10(self):
        decisions = [
            {
                "decision_date": f"2026-01-{i+1:02d}",
                "shift": "am",
                "gap_h": "8.00",
                "cout_observe_eur": 100 * i,
                "is_override": i % 3 == 0,
            }
            for i in range(20)
        ]
        result = generate_proof_pack_pdf(
            org_name="Acme Corp",
            site_id="site-paris",
            month="2026-01",
            proof_record={
                "gain_net_eur": 5000,
                "adoption_pct": 0.85,
                "service_reel_pct": 0.9,
                "alertes_emises": 20,
                "alertes_traitees": 18,
                "cout_bau_eur": 8000,
                "cout_100_eur": 3000,
                "cout_reel_eur": 3500,
                "service_bau_pct": 0.6,
            },
            decisions=decisions,
        )
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_zero_values_in_proof_record(self):
        """Proof pack PDF handles zero/minimal values correctly."""
        result = generate_proof_pack_pdf(
            org_name="Test Org",
            site_id="site-1",
            month="2026-02",
            proof_record={
                "gain_net_eur": 0,
                "adoption_pct": 0,
                "service_reel_pct": 0,
                "alertes_emises": 0,
                "alertes_traitees": 0,
                "cout_bau_eur": 0,
                "cout_100_eur": 0,
                "cout_reel_eur": 0,
                "service_bau_pct": 0,
            },
            decisions=[],
        )
        assert isinstance(result, bytes)

    def test_missing_keys_use_defaults(self):
        """Proof pack PDF uses defaults when keys are absent from dict."""
        result = generate_proof_pack_pdf(
            org_name="Test Org",
            site_id="site-1",
            month="2026-02",
            proof_record={},
            decisions=[],
        )
        assert isinstance(result, bytes)

    def test_override_decisions_shown(self):
        result = generate_proof_pack_pdf(
            org_name="Acme Corp",
            site_id="site-paris",
            month="2026-01",
            proof_record={
                "gain_net_eur": 1000,
                "adoption_pct": 0.8,
                "service_reel_pct": 0.75,
                "alertes_emises": 5,
                "alertes_traitees": 4,
                "cout_bau_eur": 3000,
                "cout_100_eur": 1500,
                "cout_reel_eur": 2000,
                "service_bau_pct": 0.6,
            },
            decisions=[
                {
                    "decision_date": "2026-01-10",
                    "shift": "pm",
                    "gap_h": "6.00",
                    "cout_observe_eur": 300,
                    "is_override": True,
                },
            ],
        )
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_different_org_names(self):
        for name in ["ACME", "Groupe Hospitalier", "Test & Co"]:
            result = generate_proof_pack_pdf(
                org_name=name,
                site_id="site-1",
                month="2026-01",
                proof_record={
                    "gain_net_eur": 100,
                    "alertes_emises": 1,
                    "alertes_traitees": 1,
                    "cout_bau_eur": 200,
                    "cout_100_eur": 100,
                    "cout_reel_eur": 150,
                    "service_bau_pct": 0.6,
                },
                decisions=[],
            )
            assert isinstance(result, bytes)
