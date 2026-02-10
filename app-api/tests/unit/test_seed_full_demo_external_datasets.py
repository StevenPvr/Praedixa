"""Unit tests for external CSV dataset loading in seed_full_demo."""

from __future__ import annotations

import pytest

from app.services.file_parser import ParseResult
from scripts.seed_full_demo import (
    _build_external_dataset_definition,
    _resolve_external_client_slug,
)


class TestResolveExternalClientSlug:
    def test_default_mapping_for_praedixa_demo(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.delenv("PRAEDIXA_DATA_CLIENT_SLUG", raising=False)
        metadata = {"clients": {"acme-logistics": {}, "petit-colis": {}}}

        assert (
            _resolve_external_client_slug("praedixa-demo", metadata) == "acme-logistics"
        )

    def test_unknown_org_slug_without_env_raises(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.delenv("PRAEDIXA_DATA_CLIENT_SLUG", raising=False)
        metadata = {"clients": {"acme-logistics": {}}}

        with pytest.raises(RuntimeError, match="No data client mapping defined"):
            _resolve_external_client_slug("unknown-org", metadata)


class TestBuildExternalDatasetDefinition:
    def test_infers_temporal_groupby_and_numeric_target(self) -> None:
        parse_result = ParseResult(
            rows=[
                {
                    "date": "2024-01-01",
                    "site_code": "LYO",
                    "orders_processed": "18344",
                    "on_time_rate_pct": "97.69",
                },
                {
                    "date": "2024-01-02",
                    "site_code": "LYO",
                    "orders_processed": "19000",
                    "on_time_rate_pct": "98.11",
                },
            ],
            source_columns=[
                "date",
                "site_code",
                "orders_processed",
                "on_time_rate_pct",
            ],
            detected_format="csv",
            detected_encoding="utf-8",
            row_count=2,
        )

        definition = _build_external_dataset_definition(
            "operations_daily",
            parse_result,
        )

        assert definition["temporal_index"] == "date"
        assert definition["group_by"] == ["site_code"]

        columns = {
            name: (dtype.value, role.value)
            for name, dtype, role in definition["columns"]
        }
        assert columns["date"] == ("date", "temporal_index")
        assert columns["site_code"] == ("category", "group_by")
        assert columns["orders_processed"] == ("integer", "target")
        assert columns["on_time_rate_pct"] == ("float", "feature")

    def test_raises_when_no_temporal_column(self) -> None:
        parse_result = ParseResult(
            rows=[
                {"site_code": "LYO", "orders_processed": "18344"},
                {"site_code": "LYO", "orders_processed": "19000"},
            ],
            source_columns=["site_code", "orders_processed"],
            detected_format="csv",
            detected_encoding="utf-8",
            row_count=2,
        )

        with pytest.raises(RuntimeError, match="no temporal index candidate"):
            _build_external_dataset_definition("operations_daily", parse_result)
