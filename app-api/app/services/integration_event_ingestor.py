"""Connector raw-event ingestor for dataset/raw-table pipeline.

This service is the first Python bridge between connector raw events and the
existing dataset ingestion stack. It intentionally starts with strict explicit
field mappings and a local object-store reader so we can reuse the dataset/raw
table/transform pipeline without introducing fuzzy mapping behavior.
"""

from __future__ import annotations

import json
from collections import defaultdict
from collections.abc import Mapping, Sequence
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
        ...


class ConnectorRawEventLike(Protocol):
    """Minimal raw-event contract consumed by the connector ingestor."""

    object_store_key: str
    source_object: str | None


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

    dataset_id: UUID | None
    dataset_name: str | None
    rows_prepared: int
    rows_inserted: int
    batch_id: UUID | None
    dataset_ids: tuple[UUID, ...] = ()
    dataset_names: tuple[str, ...] = ()


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

    current: object = payload
    segments = dotted_path.split(".")
    for index, segment in enumerate(segments):
        if not isinstance(current, Mapping):
            return None
        current_mapping = cast("Mapping[str, Any]", current)
        if segment not in current_mapping:
            return None
        next_value = current_mapping[segment]
        if index == len(segments) - 1:
            return next_value
        current = next_value
    return None


def _require_object(value: Any, *, field: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise TypeError(f"{field} must be an object")
    return dict(cast("Mapping[str, Any]", value))


def _require_list(value: Any, *, field: str) -> list[Any]:
    if not isinstance(value, list):
        raise TypeError(f"{field} must be a list")
    return list(cast("Sequence[Any]", value))


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
    group_values = _require_list(value, field="fields_json.dataset.group_by")
    group_by = [str(item).strip() for item in group_values if str(item).strip()]
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
    fields = _require_list(fields_json.get("fields"), field="fields_json.fields")
    if len(fields) == 0:
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
        pipeline_config=dict(cast("Mapping[str, Any]", pipeline_config)),
        fields=[_parse_field_mapping(field) for field in fields],
    )


async def load_rows_from_raw_events(
    raw_events: list[ConnectorRawEventLike],
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
        if existing.table_name != plan.table_name:
            raise ValueError(
                "Existing dataset table_name does not match connector mapping"
            )
        if existing.temporal_index != plan.temporal_index:
            raise ValueError(
                "Existing dataset temporal_index does not match connector mapping"
            )
        if list(existing.group_by) != list(plan.group_by):
            raise ValueError(
                "Existing dataset group_by does not match connector mapping"
            )
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


def _get_raw_event_source_object(raw_event: ConnectorRawEventLike) -> str | None:
    value = getattr(raw_event, "source_object", None)
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _resolve_fields_json_by_source_object(
    config: dict[str, Any],
    raw_events: list[ConnectorRawEventLike],
) -> dict[str | None, dict[str, Any]]:
    raw_dataset_mappings = config.get("datasetMappings")
    if raw_dataset_mappings is not None:
        mappings = _require_object(
            raw_dataset_mappings,
            field="connection.config.datasetMappings",
        )

        resolved: dict[str | None, dict[str, Any]] = {}
        for raw_event in raw_events:
            source_object = _get_raw_event_source_object(raw_event)
            if source_object is None:
                raise TypeError(
                    "raw event sourceObject must be present when "
                    "datasetMappings is configured"
                )
            fields_json = mappings.get(source_object)
            if not isinstance(fields_json, dict):
                raise TypeError(
                    "connection.config.datasetMappings"
                    f'["{source_object}"] must be configured'
                )
            resolved[source_object] = cast("dict[str, Any]", fields_json)
        return resolved

    fields_json = config.get("datasetMapping")
    if not isinstance(fields_json, dict):
        raise TypeError(
            "connection.config.datasetMapping or datasetMappings must be configured"
        )

    configured_source_objects = config.get("sourceObjects")
    if configured_source_objects is not None:
        configured_source_objects = _require_list(
            configured_source_objects,
            field="connection.sourceObjects",
        )
        normalized_source_objects = {
            str(item).strip() for item in configured_source_objects if str(item).strip()
        }
        if len(normalized_source_objects) > 1:
            raise ValueError(
                "connection.config.datasetMappings must be configured "
                "for multi-source connections"
            )

    claimed_source_objects = {
        source_object
        for raw_event in raw_events
        if (source_object := _get_raw_event_source_object(raw_event)) is not None
    }
    if len(claimed_source_objects) > 1:
        raise ValueError(
            "connection.config.datasetMappings must be configured when "
            "a claimed batch spans multiple sourceObject values"
        )

    source_object = next(iter(claimed_source_objects), None)
    return {source_object: cast("dict[str, Any]", fields_json)}


async def ingest_raw_events_to_dataset(
    tenant: TenantFilter,
    session: AsyncSession,
    raw_events: list[IntegrationRawEvent],
    config: dict[str, Any],
    payload_loader: ConnectorPayloadLoader,
) -> ConnectorIngestionResult | None:
    """Insert a batch of connector raw events into the dataset/raw-table pipeline."""

    if not raw_events:
        return None

    grouped_events: dict[str | None, list[ConnectorRawEventLike]] = defaultdict(list)
    for raw_event in raw_events:
        typed_raw_event = cast("ConnectorRawEventLike", raw_event)
        grouped_events[_get_raw_event_source_object(typed_raw_event)].append(
            typed_raw_event
        )

    fields_json_by_source = _resolve_fields_json_by_source_object(
        config,
        [raw_event for grouped in grouped_events.values() for raw_event in grouped],
    )

    rows_prepared = 0
    rows_inserted = 0
    batch_id: UUID | None = None
    datasets_by_id: dict[UUID, ClientDataset] = {}
    for source_object, source_raw_events in grouped_events.items():
        fields_json = fields_json_by_source.get(source_object)
        if fields_json is None:
            source_label = source_object or "default"
            raise ValueError(
                "No dataset mapping was configured for connector "
                f'sourceObject "{source_label}"'
            )
        plan = parse_dataset_plan(fields_json)
        dataset = await get_or_create_dataset_for_plan(tenant, session, plan)
        rows = await load_rows_from_raw_events(source_raw_events, payload_loader, plan)
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
        rows_prepared += len(rows)
        rows_inserted += insertion.rows_inserted
        batch_id = insertion.batch_id
        datasets_by_id[dataset.id] = dataset

    await session.flush()
    for dataset_id in datasets_by_id:
        await run_incremental(
            dataset_id,
            session,
            triggered_by="integration_connector",
        )

    dataset_ids = tuple(datasets_by_id.keys())
    dataset_names = tuple(dataset.name for dataset in datasets_by_id.values())
    return ConnectorIngestionResult(
        dataset_id=dataset_ids[0] if len(dataset_ids) == 1 else None,
        dataset_name=dataset_names[0] if len(dataset_names) == 1 else None,
        rows_prepared=rows_prepared,
        rows_inserted=rows_inserted,
        batch_id=batch_id,
        dataset_ids=dataset_ids,
        dataset_names=dataset_names,
    )
