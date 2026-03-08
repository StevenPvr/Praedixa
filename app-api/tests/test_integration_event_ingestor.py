from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import TYPE_CHECKING, cast

import pytest

from app.core.config import settings
from app.core.ddl_validation import DDLValidationError
from app.services.integration_event_ingestor import (
    LocalConnectorPayloadLoader,
    extract_json_path,
    load_rows_from_raw_events,
    parse_dataset_plan,
)

if TYPE_CHECKING:
    from app.models.integration import IntegrationRawEvent


def test_extract_json_path_returns_nested_values_and_none_for_missing() -> None:
    payload = {
        "account": {
            "id": "001",
            "owner": {"name": "Alice"},
        }
    }

    assert extract_json_path(payload, "account.id") == "001"
    assert extract_json_path(payload, "account.owner.name") == "Alice"
    assert extract_json_path(payload, "account.owner.email") is None


def test_parse_dataset_plan_requires_explicit_mapping_contract() -> None:
    plan = parse_dataset_plan(
        {
            "dataset": {
                "name": "salesforce_accounts",
                "table_name": "salesforce_accounts",
                "temporal_index": "updated_at",
                "group_by": ["record_id"],
                "pipeline_config": {},
            },
            "fields": [
                {
                    "source_field": "account.id",
                    "target_column": "record_id",
                    "dtype": "text",
                    "role": "id",
                    "nullable": False,
                },
                {
                    "source_field": "account.updated_at",
                    "target_column": "updated_at",
                    "dtype": "date",
                    "role": "temporal_index",
                },
            ],
        }
    )

    assert plan.dataset_name == "salesforce_accounts"
    assert plan.table_name == "salesforce_accounts"
    assert plan.temporal_index == "updated_at"
    assert [field.target_column for field in plan.fields] == [
        "record_id",
        "updated_at",
    ]


def test_parse_dataset_plan_rejects_string_group_by() -> None:
    with pytest.raises(TypeError, match="group_by must be a list"):
        parse_dataset_plan(
            {
                "dataset": {
                    "name": "salesforce_accounts",
                    "table_name": "salesforce_accounts",
                    "temporal_index": "updated_at",
                    "group_by": "record_id",
                    "pipeline_config": {},
                },
                "fields": [
                    {
                        "source_field": "account.id",
                        "target_column": "record_id",
                        "dtype": "text",
                        "role": "id",
                    }
                ],
            }
        )


def test_parse_dataset_plan_requires_boolean_nullable() -> None:
    with pytest.raises(ValueError, match="nullable must be a boolean"):
        parse_dataset_plan(
            {
                "dataset": {
                    "name": "salesforce_accounts",
                    "table_name": "salesforce_accounts",
                    "temporal_index": "updated_at",
                    "pipeline_config": {},
                },
                "fields": [
                    {
                        "source_field": "account.id",
                        "target_column": "record_id",
                        "dtype": "text",
                        "role": "id",
                        "nullable": "false",
                    }
                ],
            }
        )


def test_parse_dataset_plan_rejects_invalid_table_name() -> None:
    with pytest.raises(DDLValidationError, match="lowercase letter"):
        parse_dataset_plan(
            {
                "dataset": {
                    "name": "salesforce_accounts",
                    "table_name": "salesforce-accounts",
                    "temporal_index": "updated_at",
                    "pipeline_config": {},
                },
                "fields": [
                    {
                        "source_field": "account.id",
                        "target_column": "record_id",
                        "dtype": "text",
                        "role": "id",
                    }
                ],
            }
        )


def test_parse_dataset_plan_rejects_excessive_field_mappings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "MAX_COLUMNS_PER_TABLE", 1)

    with pytest.raises(ValueError, match="maximum allowed field mapping count"):
        parse_dataset_plan(
            {
                "dataset": {
                    "name": "salesforce_accounts",
                    "table_name": "salesforce_accounts",
                    "temporal_index": "updated_at",
                    "pipeline_config": {},
                },
                "fields": [
                    {
                        "source_field": "account.id",
                        "target_column": "record_id",
                        "dtype": "text",
                        "role": "id",
                    },
                    {
                        "source_field": "account.updated_at",
                        "target_column": "updated_at",
                        "dtype": "date",
                        "role": "temporal_index",
                    },
                ],
            }
        )


async def test_load_rows_from_raw_events_reads_object_store_payloads(
    tmp_path: Path,
) -> None:
    root = tmp_path / "connector-store"
    payload_path = root / "org-1" / "conn-1" / "evt-1.json"
    payload_path.parent.mkdir(parents=True, exist_ok=True)
    payload_path.write_text(
        json.dumps(
            {
                "account": {
                    "id": "001",
                    "updated_at": "2026-03-06T10:00:00Z",
                    "name": "Acme",
                }
            }
        ),
        encoding="utf-8",
    )

    loader = LocalConnectorPayloadLoader(root)
    plan = parse_dataset_plan(
        {
            "dataset": {
                "name": "salesforce_accounts",
                "table_name": "salesforce_accounts",
                "temporal_index": "updated_at",
                "group_by": ["record_id"],
                "pipeline_config": {},
            },
            "fields": [
                {
                    "source_field": "account.id",
                    "target_column": "record_id",
                    "dtype": "text",
                    "role": "id",
                    "nullable": False,
                },
                {
                    "source_field": "account.updated_at",
                    "target_column": "updated_at",
                    "dtype": "date",
                    "role": "temporal_index",
                },
                {
                    "source_field": "account.name",
                    "target_column": "account_name",
                    "dtype": "text",
                    "role": "feature",
                },
            ],
        }
    )

    raw_events = [
        cast(
            "IntegrationRawEvent",
            SimpleNamespace(
                object_store_key="org-1/conn-1/evt-1.json",
            ),
        )
    ]

    rows = await load_rows_from_raw_events(raw_events, loader, plan)

    assert rows == [
        {
            "account.id": "001",
            "account.updated_at": "2026-03-06T10:00:00Z",
            "account.name": "Acme",
        }
    ]
