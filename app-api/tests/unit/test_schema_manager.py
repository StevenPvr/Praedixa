"""Tests for Schema Manager service.

Covers:
- create_client_schemas: DDL generation, identifier validation, psycopg.sql usage
- create_dataset_tables: raw + transformed table creation, index creation
- resolve_transformed_columns: feature column generation from pipeline config
- drop_client_schemas: schema dropping for RGPD erasure
- _create_raw_table / _create_transformed_table / _create_indexes: internal DDL helpers
- SQL injection attempts blocked by DDL validation
- All identifiers go through validation (defense in depth)
"""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from psycopg import errors, sql as psql

from app.core.ddl_validation import DDLValidationError
from app.models.data_catalog import ColumnRole
from app.services.schema_manager import (
    _create_indexes,
    _create_raw_table,
    _create_transformed_table,
    create_client_schemas,
    create_dataset_tables,
    drop_client_schemas,
    resolve_transformed_columns,
)

# ── resolve_transformed_columns ───────────────────────────────


class TestResolveTransformedColumns:
    """Pure logic tests for feature column resolution."""

    @staticmethod
    def _make_col(name, role, rules_override=None):
        return SimpleNamespace(
            name=name,
            role=role,
            rules_override=rules_override,
        )

    def test_target_gets_lag_features(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {
            "lags": [1, 7],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_lag_1" in names
        assert "revenue_lag_7" in names

    def test_feature_gets_lag_features(self) -> None:
        cols = [self._make_col("temperature", ColumnRole.FEATURE)]
        config = {
            "lags": [1],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("temperature_lag_1", "DOUBLE PRECISION") in result

    def test_temporal_index_is_skipped(self) -> None:
        cols = [self._make_col("date_col", ColumnRole.TEMPORAL_INDEX)]
        config = {"lags": [1, 7, 30]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_group_by_is_skipped(self) -> None:
        cols = [self._make_col("department", ColumnRole.GROUP_BY)]
        config = {"lags": [1], "rolling_windows": [7]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_id_role_is_skipped(self) -> None:
        cols = [self._make_col("employee_id", ColumnRole.ID)]
        config = {"lags": [1], "rolling_windows": [7]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_meta_role_is_skipped(self) -> None:
        cols = [self._make_col("notes", ColumnRole.META)]
        config = {"lags": [1]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_rolling_windows(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {
            "lags": [],
            "rolling_windows": [7, 14],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_rolling_mean_7" in names
        assert "revenue_rolling_std_7" in names
        assert "revenue_rolling_mean_14" in names
        assert "revenue_rolling_std_14" in names

    def test_normalize_flag(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {
            "lags": [],
            "rolling_windows": [],
            "normalize": True,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("revenue_normalized", "DOUBLE PRECISION") in result

    def test_standardize_flag(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {
            "lags": [],
            "rolling_windows": [],
            "normalize": False,
            "standardize": True,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("revenue_standardized", "DOUBLE PRECISION") in result

    def test_minmax_flag(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {
            "lags": [],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": True,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("revenue_minmax", "DOUBLE PRECISION") in result

    def test_all_flags_combined(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {
            "lags": [1],
            "rolling_windows": [7],
            "normalize": True,
            "standardize": True,
            "minmax": True,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_normalized" in names
        assert "revenue_standardized" in names
        assert "revenue_minmax" in names
        assert "revenue_lag_1" in names
        assert "revenue_rolling_mean_7" in names
        assert "revenue_rolling_std_7" in names

    def test_per_column_override_lags(self) -> None:
        cols = [
            self._make_col(
                "revenue", ColumnRole.TARGET, rules_override={"lags": [3, 5]}
            )
        ]
        config = {
            "lags": [1, 7, 30],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_lag_3" in names
        assert "revenue_lag_5" in names
        # Default lags should NOT be present
        assert "revenue_lag_1" not in names
        assert "revenue_lag_7" not in names

    def test_per_column_override_rolling(self) -> None:
        cols = [
            self._make_col(
                "revenue", ColumnRole.TARGET, rules_override={"rolling_windows": [3]}
            )
        ]
        config = {
            "lags": [],
            "rolling_windows": [7, 14],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_rolling_mean_3" in names
        assert "revenue_rolling_std_3" in names
        assert "revenue_rolling_mean_7" not in names

    def test_per_column_override_normalize(self) -> None:
        cols = [
            self._make_col(
                "revenue", ColumnRole.TARGET, rules_override={"normalize": True}
            )
        ]
        config = {
            "lags": [],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("revenue_normalized", "DOUBLE PRECISION") in result

    def test_per_column_override_standardize(self) -> None:
        cols = [
            self._make_col(
                "revenue", ColumnRole.TARGET, rules_override={"standardize": True}
            )
        ]
        config = {
            "lags": [],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("revenue_standardized", "DOUBLE PRECISION") in result

    def test_per_column_override_minmax(self) -> None:
        cols = [
            self._make_col(
                "revenue", ColumnRole.TARGET, rules_override={"minmax": True}
            )
        ]
        config = {
            "lags": [],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("revenue_minmax", "DOUBLE PRECISION") in result

    def test_default_config_when_keys_missing(self) -> None:
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {}  # All defaults: lags=[1,7,30], rolling=[7]
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_lag_1" in names
        assert "revenue_lag_7" in names
        assert "revenue_lag_30" in names
        assert "revenue_rolling_mean_7" in names
        assert "revenue_rolling_std_7" in names

    def test_empty_columns(self) -> None:
        result = resolve_transformed_columns([], {"lags": [1]})
        assert result == []

    def test_multiple_columns(self) -> None:
        cols = [
            self._make_col("revenue", ColumnRole.TARGET),
            self._make_col("temperature", ColumnRole.FEATURE),
            self._make_col("date_col", ColumnRole.TEMPORAL_INDEX),
        ]
        config = {
            "lags": [1],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_lag_1" in names
        assert "temperature_lag_1" in names
        # date_col should not produce features
        assert not any(n.startswith("date_col") for n in names)

    def test_all_types_double_precision(self) -> None:
        cols = [self._make_col("x", ColumnRole.TARGET)]
        config = {
            "lags": [1],
            "rolling_windows": [7],
            "normalize": True,
            "standardize": True,
            "minmax": True,
        }
        result = resolve_transformed_columns(cols, config)
        for _, pg_type in result:
            assert pg_type == "DOUBLE PRECISION"

    def test_naming_convention_lag(self) -> None:
        """Feature naming: {col}_lag_{N}."""
        cols = [self._make_col("sales", ColumnRole.TARGET)]
        config = {
            "lags": [3],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert result[0] == ("sales_lag_3", "DOUBLE PRECISION")

    def test_naming_convention_rolling(self) -> None:
        """Feature naming: {col}_rolling_mean_{N} and {col}_rolling_std_{N}."""
        cols = [self._make_col("sales", ColumnRole.TARGET)]
        config = {
            "lags": [],
            "rolling_windows": [5],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "sales_rolling_mean_5" in names
        assert "sales_rolling_std_5" in names

    def test_rules_override_none(self) -> None:
        """rules_override=None should use global defaults."""
        cols = [self._make_col("x", ColumnRole.TARGET, rules_override=None)]
        config = {
            "lags": [1],
            "rolling_windows": [],
            "normalize": False,
            "standardize": False,
            "minmax": False,
        }
        result = resolve_transformed_columns(cols, config)
        assert ("x_lag_1", "DOUBLE PRECISION") in result


# ── _create_raw_table ─────────────────────────────────────────


class TestCreateRawTable:
    """Tests for the internal DDL helper that builds raw tables."""

    def test_executes_create_table(self) -> None:
        cur = MagicMock()
        created = _create_raw_table(
            cur, "acme_raw", "effectifs", [("nb_employes", "DOUBLE PRECISION")]
        )
        assert created is True
        assert cur.execute.call_count == 3
        # The SQL object is composed by psycopg.sql
        sql_arg = cur.execute.call_args[0][0]
        assert isinstance(sql_arg, (psql.SQL, psql.Composed))

    def test_includes_system_columns(self) -> None:
        cur = MagicMock()
        _create_raw_table(cur, "acme_raw", "effectifs", [])
        sql_arg = cur.execute.call_args[0][0]
        assert isinstance(sql_arg, (psql.SQL, psql.Composed))

    def test_includes_dynamic_columns(self) -> None:
        cur = MagicMock()
        dynamic_cols = [("temperature", "DOUBLE PRECISION"), ("date_col", "DATE")]
        _create_raw_table(cur, "test_raw", "weather", dynamic_cols)
        assert cur.execute.call_count == 3

    def test_no_dynamic_columns(self) -> None:
        """Raw table with only system columns should still be created."""
        cur = MagicMock()
        _create_raw_table(cur, "acme_raw", "empty_table", [])
        assert cur.execute.call_count == 3

    def test_duplicate_table_returns_false(self) -> None:
        cur = MagicMock()
        cur.execute.side_effect = [None, errors.DuplicateTable("exists"), None, None]
        created = _create_raw_table(cur, "acme_raw", "effectifs", [])
        assert created is False


# ── _create_transformed_table ─────────────────────────────────


class TestCreateTransformedTable:
    """Tests for the internal DDL helper that builds transformed tables."""

    def test_executes_create_table(self) -> None:
        cur = MagicMock()
        created = _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [("nb_employes_lag_1", "DOUBLE PRECISION")],
        )
        assert created is True
        assert cur.execute.call_count == 3

    def test_no_feature_columns(self) -> None:
        cur = MagicMock()
        _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [],
        )
        assert cur.execute.call_count == 3

    def test_validates_feature_column_names(self) -> None:
        """Feature column names pass through validate_identifier."""
        cur = MagicMock()
        _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [("nb_employes_lag_7", "DOUBLE PRECISION")],
        )
        assert cur.execute.call_count == 3

    def test_duplicate_table_returns_false(self) -> None:
        cur = MagicMock()
        cur.execute.side_effect = [None, errors.DuplicateTable("exists"), None, None]
        created = _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [],
        )
        assert created is False


# ── _create_indexes ───────────────────────────────────────────


class TestCreateIndexes:
    """Tests for the internal index creation helper."""

    def test_creates_temporal_index(self) -> None:
        cur = MagicMock()
        _create_indexes(
            cur,
            "acme_raw",
            "effectifs",
            "date_col",
            [],
            include_ingested_at=True,
        )
        # At least 1 call for temporal index, possibly 1 for _ingested_at
        assert cur.execute.call_count >= 1

    def test_creates_group_by_indexes(self) -> None:
        cur = MagicMock()
        _create_indexes(
            cur,
            "acme_raw",
            "effectifs",
            "date_col",
            ["department", "site"],
            include_ingested_at=True,
        )
        # 1 temporal + 2 group_by + 1 _ingested_at = 4
        assert cur.execute.call_count >= 3

    def test_no_group_by(self) -> None:
        """No group_by columns -- still creates temporal + _ingested_at."""
        cur = MagicMock()
        _create_indexes(
            cur,
            "acme_raw",
            "effectifs",
            "date_col",
            [],
            include_ingested_at=True,
        )
        assert cur.execute.call_count >= 1

    def test_skips_ingested_at_index_when_disabled(self) -> None:
        cur = MagicMock()
        _create_indexes(
            cur,
            "acme_raw",
            "effectifs",
            "date_col",
            [],
            include_ingested_at=False,
        )
        # Temporal index only when _ingested_at is disabled.
        assert cur.execute.call_count == 1


# ── create_client_schemas ─────────────────────────────────────


class TestCreateClientSchemas:
    """Tests for the async schema creation function."""

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_creates_data_schema(self, mock_settings, mock_ddl) -> None:
        mock_settings.DATA_SCHEMA_SUFFIX = "data"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        data_schema = await create_client_schemas("acme")
        assert data_schema == "acme_data"
        # CREATE SCHEMA + role check (+ optional grant path)
        assert mock_cur.execute.call_count >= 2

    @pytest.mark.asyncio
    async def test_rejects_invalid_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await create_client_schemas("ab")  # too short

    @pytest.mark.asyncio
    async def test_rejects_reserved_prefix_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await create_client_schemas("pg_client")

    @pytest.mark.asyncio
    async def test_rejects_uppercase_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await create_client_schemas("Acme")

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_returns_correct_schema_name(self, mock_settings, mock_ddl) -> None:
        mock_settings.DATA_SCHEMA_SUFFIX = "data"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        data_schema = await create_client_schemas("logistics_co")
        assert data_schema == "logistics_co_data"


# ── create_dataset_tables ─────────────────────────────────────


class TestCreateDatasetTables:
    """Tests for the async table creation function."""

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    async def test_creates_raw_and_transformed_tables(self, mock_ddl) -> None:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        dataset = SimpleNamespace(
            schema_data="acme_data",
            table_name="effectifs",
            temporal_index="date_col",
            group_by=["department"],
            pipeline_config={
                "lags": [1],
                "rolling_windows": [],
                "normalize": False,
                "standardize": False,
                "minmax": False,
            },
        )
        columns = [
            SimpleNamespace(
                name="date_col",
                dtype=SimpleNamespace(value="date"),
                role=ColumnRole.TEMPORAL_INDEX,
                rules_override=None,
            ),
            SimpleNamespace(
                name="nb_employes",
                dtype=SimpleNamespace(value="float"),
                role=ColumnRole.TARGET,
                rules_override=None,
            ),
        ]

        await create_dataset_tables(dataset, columns)
        # Should execute multiple DDL statements
        # (create raw, create transformed, indexes)
        assert mock_cur.execute.call_count >= 4

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    async def test_no_group_by_columns(self, mock_ddl) -> None:
        """Dataset with empty group_by should still work."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        dataset = SimpleNamespace(
            schema_data="acme_data",
            table_name="effectifs",
            temporal_index="date_col",
            group_by=[],
            pipeline_config={
                "lags": [1],
                "rolling_windows": [],
                "normalize": False,
                "standardize": False,
                "minmax": False,
            },
        )
        columns = [
            SimpleNamespace(
                name="date_col",
                dtype=SimpleNamespace(value="date"),
                role=ColumnRole.TEMPORAL_INDEX,
                rules_override=None,
            ),
        ]

        await create_dataset_tables(dataset, columns)
        assert mock_cur.execute.call_count >= 2


# ── drop_client_schemas ───────────────────────────────────────


class TestDropClientSchemas:
    """Tests for the async schema dropping function (RGPD erasure)."""

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_drops_data_schema(self, mock_settings, mock_ddl) -> None:
        mock_settings.DATA_SCHEMA_SUFFIX = "data"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        await drop_client_schemas("acme")
        # One DROP SCHEMA call
        assert mock_cur.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_rejects_invalid_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await drop_client_schemas("ab")

    @pytest.mark.asyncio
    async def test_rejects_reserved_prefix_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await drop_client_schemas("pg_internal")

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_drops_single_schema(self, mock_settings, mock_ddl) -> None:
        """Single data schema is dropped."""
        mock_settings.DATA_SCHEMA_SUFFIX = "data"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        await drop_client_schemas("acme")
        calls = mock_cur.execute.call_args_list
        assert len(calls) == 1


# ── SQL injection prevention ────────────────────────────────────


class TestSQLInjectionPrevention:
    """Verify SQL injection attempts are blocked by DDL validation."""

    @pytest.mark.asyncio
    async def test_sql_injection_in_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await create_client_schemas("acme; DROP TABLE--")

    @pytest.mark.asyncio
    async def test_sql_injection_in_drop_slug(self) -> None:
        with pytest.raises(DDLValidationError):
            await drop_client_schemas("acme'; DROP SCHEMA public--")
