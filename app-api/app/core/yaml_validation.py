"""YAML metadata validation using strictyaml.

Security notes:
- strictyaml is used instead of PyYAML because it rejects YAML features
  that are attack vectors: anchors, merge keys, implicit typing, and
  arbitrary Python object deserialization.
- All validation uses explicit schemas with allowlists.
- Numeric bounds are enforced to prevent resource exhaustion
  (e.g., requesting 10000 lag windows).
- Unknown keys are rejected to prevent silent typos and injection.
"""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict, cast

import strictyaml  # type: ignore[import-untyped]
from strictyaml import (
    Bool,
    Enum,
    Int,
    Map,
    MapPattern,
    Optional,
    Seq,
    Str,
)

from app.core.config import settings
from app.core.ddl_validation import (
    DDLValidationError,
    validate_column_name,
    validate_identifier,
)
from app.core.exceptions import PraedixaError


class YAMLValidationError(PraedixaError):
    """Raised when YAML content fails schema validation."""

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="YAML_VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


type RuleOverrideValue = str | int | bool


class DatasetColumnMetadata(TypedDict):
    """Validated YAML column definition."""

    name: str
    dtype: str
    role: str
    nullable: NotRequired[bool]
    rules_override: NotRequired[dict[str, RuleOverrideValue]]


class TransformWindowConfig(TypedDict):
    """Validated YAML transform window definition."""

    type: str
    size: int


class PipelineConfigMetadata(TypedDict):
    """Validated YAML pipeline metadata."""

    missing_values: NotRequired[str]
    outliers: NotRequired[str]
    deduplication: NotRequired[bool]
    normalization: NotRequired[str]
    encoding: NotRequired[str]
    windows: NotRequired[list[TransformWindowConfig]]


class DatasetMetadata(TypedDict):
    """Validated dataset metadata payload."""

    name: str
    temporal_index: str
    columns: list[DatasetColumnMetadata]
    group_by: NotRequired[list[str]]
    pipeline: NotRequired[PipelineConfigMetadata]


# ── Column Schema ────────────────────────────────────

_COLUMN_SCHEMA = Map(
    {
        "name": Str(),
        "dtype": Enum(
            [
                "float",
                "integer",
                "date",
                "category",
                "boolean",
                "text",
            ]
        ),
        "role": Enum(
            [
                "target",
                "feature",
                "temporal_index",
                "group_by",
                "id",
                "meta",
            ]
        ),
        Optional("nullable", default="true"): Bool(),
        Optional("rules_override"): MapPattern(
            Str(),
            Str() | Int() | Bool(),
        ),
    }
)

# ── Transform Window Schema ─────────────────────────

_WINDOW_SCHEMA = Map(
    {
        "type": Enum(["lag", "rolling_mean", "rolling_std"]),
        "size": Int(),
    }
)

# ── Pipeline Config Schema ───────────────────────────

_MISSING_VALUES_OPTS = [
    "drop",
    "fill_mean",
    "fill_median",
    "fill_zero",
    "fill_forward",
]

_PIPELINE_CONFIG_SCHEMA = Map(
    {
        Optional("missing_values", default="drop"): Enum(
            _MISSING_VALUES_OPTS,
        ),
        Optional("outliers", default="none"): Enum(
            ["none", "clip", "remove"],
        ),
        Optional("deduplication", default="false"): Bool(),
        Optional("normalization", default="none"): Enum(
            ["none", "zscore", "minmax", "robust"],
        ),
        Optional("encoding", default="none"): Enum(
            ["none", "onehot", "ordinal", "target"],
        ),
        Optional("windows"): Seq(_WINDOW_SCHEMA),
    }
)

# ── Dataset Metadata Schema ──────────────────────────

DATASET_METADATA_SCHEMA = Map(
    {
        "name": Str(),
        "temporal_index": Str(),
        Optional("group_by"): Seq(Str()),
        "columns": Seq(_COLUMN_SCHEMA),
        Optional("pipeline"): _PIPELINE_CONFIG_SCHEMA,
    }
)


def _validate_columns(
    data: DatasetMetadata,
) -> set[str]:
    """Validate column definitions and return set of names."""
    column_names: set[str] = set()
    for col in data["columns"]:
        column_name = col["name"]
        try:
            validate_column_name(column_name)
        except DDLValidationError as e:
            raise YAMLValidationError(
                f"Invalid column name: {e.message}",
                details={"field": f"columns.{column_name}"},
            ) from e
        if column_name in column_names:
            raise YAMLValidationError(
                f"Duplicate column name: '{column_name}'",
                details={"field": f"columns.{column_name}"},
            )
        column_names.add(column_name)
    return column_names


def _validate_references(
    data: DatasetMetadata,
    column_names: set[str],
) -> None:
    """Validate temporal_index and group_by references."""
    if data["temporal_index"] not in column_names:
        raise YAMLValidationError(
            "temporal_index not found in declared columns",
            details={"field": "temporal_index"},
        )

    group_by = data.get("group_by", [])
    for gb in group_by:
        if gb not in column_names:
            raise YAMLValidationError(
                f"group_by '{gb}' not in declared columns",
                details={"field": "group_by"},
            )


def _validate_windows(data: DatasetMetadata) -> None:
    """Validate pipeline window bounds."""
    if "pipeline" not in data:
        return
    pipeline = data["pipeline"]

    windows = pipeline.get("windows", [])
    max_windows = settings.MAX_WINDOWS_PER_DATASET
    if len(windows) > max_windows:
        raise YAMLValidationError(
            f"Too many windows: {len(windows)} (max {max_windows})",
            details={"field": "pipeline.windows"},
        )
    for i, w in enumerate(windows):
        size = w["size"]
        if w["type"] == "lag":
            min_size = settings.MIN_WINDOW_SIZE
        else:
            # Rolling windows need at least 2 data points
            min_size = max(2, settings.MIN_WINDOW_SIZE)

        max_size = settings.MAX_WINDOW_SIZE
        if size < min_size or size > max_size:
            raise YAMLValidationError(
                f"Window size {size} out of bounds [{min_size}, {max_size}]",
                details={
                    "field": f"pipeline.windows[{i}].size",
                },
            )


def validate_dataset_yaml(
    yaml_content: str,
) -> DatasetMetadata:
    """Parse and validate a dataset metadata YAML string.

    Returns the validated data as a plain Python dict.
    Raises YAMLValidationError on parsing or validation failure.
    """
    try:
        parsed = strictyaml.load(
            yaml_content,
            DATASET_METADATA_SCHEMA,
        )
    except strictyaml.YAMLValidationError as e:
        raise YAMLValidationError(
            "Invalid dataset metadata YAML",
            details={"yaml_error": str(e)},
        ) from e
    except strictyaml.YAMLError as e:
        raise YAMLValidationError(
            "Malformed YAML syntax",
            details={"yaml_error": str(e)},
        ) from e

    data = cast("DatasetMetadata", parsed.data)

    # ── Identifier validation (DDL-safe) ─────────────
    try:
        validate_identifier(data["name"], field="dataset_name")
    except DDLValidationError as e:
        raise YAMLValidationError(
            f"Invalid dataset name: {e.message}",
            details={"field": "name"},
        ) from e

    # ── Column validation ────────────────────────────
    column_names = _validate_columns(data)

    # Enforce max columns per table
    max_cols = settings.MAX_COLUMNS_PER_TABLE
    if len(data["columns"]) > max_cols:
        raise YAMLValidationError(
            f"Too many columns: {len(data['columns'])} (max {max_cols})",
            details={
                "field": "columns",
                "max": max_cols,
            },
        )

    # ── Reference validation ─────────────────────────
    _validate_references(data, column_names)

    # ── Pipeline bounds validation ───────────────────
    _validate_windows(data)

    result: DatasetMetadata = data
    return result
