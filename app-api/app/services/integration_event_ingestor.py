"""Connector raw-event ingestor for dataset/raw-table pipeline.

This service is the first Python bridge between connector raw events and the
existing dataset ingestion stack. It intentionally starts with strict explicit
field mappings and a local object-store reader so we can reuse the dataset/raw
table/transform pipeline without introducing fuzzy mapping behavior.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, Protocol, cast
from uuid import UUID

from sqlalchemy import select

from app.core.config import settings
from app.core.ddl_validation import validate_identifier
from app.models.data_catalog import ClientDataset, ColumnDtype, ColumnRole
from app.services.datasets import create_dataset
from app.services.raw_inserter import insert_raw_rows_in_session
from app.services.transform_engine import run_incremental

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import TenantFilter
    from app.models.integration import IntegrationRawEvent


class ConnectorPayloadLoader(Protocol):
    """Loads connector payload JSON from object storage."""

    async def load_json(self, object_store_key: str) -> dict[str, Any]:
        """Return the JSON payload stored at ``object_store_key``."""


@dataclass(frozen=True)
class ConnectorFieldMapping:
    """Strict mapping from connector payload field to dataset raw column."""

    source_field: str
    target_column: str
    dtype: ColumnDtype
    role: ColumnRole
    nullable: bool = True


@dataclass(frozen=True)
class ConnectorDatasetPlan:
    """Dataset provisioning plan derived from IntegrationFieldMapping.fields_json."""

    dataset_name: str
    table_name: str
    temporal_index: str
    group_by: list[str]
    pipeline_config: dict[str, Any]
    fields: list[ConnectorFieldMapping]


@dataclass(frozen=True)
class ConnectorIngestionResult:
    """Result of inserting a batch of connector events into the dataset pipeline."""

    dataset_id: UUID
    dataset_name: str
    rows_prepared: int
    rows_inserted: int
    batch_id: UUID


class LocalConnectorPayloadLoader:
    """Reads JSON payloads from the local connector object-store root."""

    def __init__(self, root_dir: str | Path) -> None:
        self.root_dir = Path(root_dir)

    def _resolve_path(self, object_store_key: str) -> Path:
        safe_parts = [segment for segment in object_store_key.split("/") if segment]
        if not safe_parts:
            raise ValueError("object_store_key must not be empty")
        if any(part in {".", ".."} for part in safe_parts):
            raise ValueError(
                "object_store_key contains forbidden path traversal segments"
            )

        absolute_path = self.root_dir.joinpath(*safe_parts)
        resolved_path = absolute_path.resolve()
        resolved_root = self.root_dir.resolve()
        if (
            resolved_root not in resolved_path.parents
            and resolved_path != resolved_root
        ):
            raise ValueError("object_store_key resolves outside of the configured root")
        return resolved_path

    async def load_json(self, object_store_key: str) -> dict[str, Any]:
        payload = json.loads(
            self._resolve_path(object_store_key).read_text(encoding="utf-8")
        )
        if not isinstance(payload, dict):
            raise TypeError("stored connector payload must be a JSON object")
        return cast("dict[str, Any]", payload)


def extract_json_path(payload: dict[str, Any], dotted_path: str) -> Any:
    """Resolve dotted field paths (``account.id``) from connector payload objects."""

    current: Any = payload
    for segment in dotted_path.split("."):
        if not isinstance(current, dict) or segment not in current:
            return None
        current = current[segment]
    return current


def _require_object(value: Any, *, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise TypeError(f"{field} must be an object")
    return value


def _require_non_empty_string(value: Any, *, field: str) -> str:
    normalized = str(value).strip()
    if not normalized:
        raise ValueError(f"{field} must be a non-empty string")
    return normalized


def _require_identifier(value: Any, *, field: str) -> str:
    identifier = _require_non_empty_string(value, field=field)
    return validate_identifier(identifier, field=field)


def _parse_group_by(value: Any) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise TypeError("fields_json.dataset.group_by must be a list")
    group_by = [str(item).strip() for item in value if str(item).strip()]
    return [
        validate_identifier(item, field="fields_json.dataset.group_by")
        for item in group_by
    ]


def _parse_nullable(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, bool):
        return value
    raise ValueError("each mapping field.nullable must be a boolean")


def _parse_field_mapping(value: Any) -> ConnectorFieldMapping:
    field = _require_object(value, field="each mapping field")
    return ConnectorFieldMapping(
        source_field=_require_non_empty_string(
            field.get("source_field"),
            field="each mapping field.source_field",
        ),
        target_column=_require_identifier(
            field.get("target_column"),
            field="each mapping field.target_column",
        ),
        dtype=ColumnDtype(
            _require_non_empty_string(
                field.get("dtype"),
                field="each mapping field.dtype",
            )
        ),
        role=ColumnRole(
            _require_non_empty_string(
                field.get("role"),
                field="each mapping field.role",
            )
        ),
        nullable=_parse_nullable(field.get("nullable")),
    )


def parse_dataset_plan(fields_json: dict[str, Any]) -> ConnectorDatasetPlan:
    """Parse the explicit connector mapping document into a dataset plan."""

    dataset_config = _require_object(
        fields_json.get("dataset"),
        field="fields_json.dataset",
    )
    fields = fields_json.get("fields")
    if not isinstance(fields, list) or len(fields) == 0:
        raise ValueError("fields_json.fields must contain at least one field mapping")
    if len(fields) > settings.MAX_COLUMNS_PER_TABLE:
        raise ValueError(
            "fields_json.fields exceeds the maximum allowed field mapping count"
        )

    dataset_name = _require_non_empty_string(
        dataset_config.get("name"),
        field="fields_json.dataset.name",
    )
    table_name = _require_identifier(
        dataset_config.get("table_name"),
        field="fields_json.dataset.table_name",
    )
    temporal_index = _require_identifier(
        dataset_config.get("temporal_index"),
        field="fields_json.dataset.temporal_index",
    )
    group_by = _parse_group_by(dataset_config.get("group_by"))
    pipeline_config = dataset_config.get("pipeline_config", {})
    if not isinstance(pipeline_config, Mapping):
        raise TypeError("fields_json.dataset.pipeline_config must be an object")

    return ConnectorDatasetPlan(
        dataset_name=dataset_name,
        table_name=table_name,
        temporal_index=temporal_index,
        group_by=group_by,
        pipeline_config=dict(pipeline_config),
        fields=[_parse_field_mapping(field) for field in fields],
    )


async def load_rows_from_raw_events(
    raw_events: list[IntegrationRawEvent],
    payload_loader: ConnectorPayloadLoader,
    plan: ConnectorDatasetPlan,
) -> list[dict[str, Any]]:
    """Load payload objects and project them into dataset raw rows."""

    rows: list[dict[str, Any]] = []
    for raw_event in raw_events:
        payload = await payload_loader.load_json(raw_event.object_store_key)
        rows.append(
            {
                field.source_field: extract_json_path(payload, field.source_field)
                for field in plan.fields
            }
        )
    return rows


async def get_or_create_dataset_for_plan(
    tenant: TenantFilter,
    session: AsyncSession,
    plan: ConnectorDatasetPlan,
) -> ClientDataset:
    """Reuse an existing dataset by name or provision it if missing."""

    result = await session.execute(
        tenant.apply(
            select(ClientDataset).where(ClientDataset.name == plan.dataset_name),
            ClientDataset,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return cast("ClientDataset", existing)

    dataset, _ = await create_dataset(
        tenant,
        session,
        name=plan.dataset_name,
        table_name=plan.table_name,
        temporal_index=plan.temporal_index,
        group_by=plan.group_by,
        pipeline_config=plan.pipeline_config,
        columns=[
            {
                "name": field.target_column,
                "dtype": field.dtype,
                "role": field.role,
                "nullable": field.nullable,
            }
            for field in plan.fields
        ],
    )
    return dataset


async def ingest_raw_events_to_dataset(
    tenant: TenantFilter,
    session: AsyncSession,
    raw_events: list[IntegrationRawEvent],
    fields_json: dict[str, Any],
    payload_loader: ConnectorPayloadLoader,
) -> ConnectorIngestionResult | None:
    """Insert a batch of connector raw events into the dataset/raw-table pipeline."""

    if not raw_events:
        return None

    plan = parse_dataset_plan(fields_json)
    dataset = await get_or_create_dataset_for_plan(tenant, session, plan)
    rows = await load_rows_from_raw_events(raw_events, payload_loader, plan)
    insertion = await insert_raw_rows_in_session(
        session,
        dataset.schema_data,
        dataset.table_name,
        [
            SimpleNamespace(
                source_column=field.source_field,
                target_column=field.target_column,
            )
            for field in plan.fields
        ],
        rows,
    )
    await run_incremental(
        dataset.id,
        session,
        triggered_by="integration_connector",
    )
    return ConnectorIngestionResult(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        rows_prepared=len(rows),
        rows_inserted=insertion.rows_inserted,
        batch_id=insertion.batch_id,
    )
