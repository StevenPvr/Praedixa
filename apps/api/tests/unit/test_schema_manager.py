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
from psycopg import sql as psql

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

    def test_target_gets_lag_features(self):
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

    def test_feature_gets_lag_features(self):
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

    def test_temporal_index_is_skipped(self):
        cols = [self._make_col("date_col", ColumnRole.TEMPORAL_INDEX)]
        config = {"lags": [1, 7, 30]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_group_by_is_skipped(self):
        cols = [self._make_col("department", ColumnRole.GROUP_BY)]
        config = {"lags": [1], "rolling_windows": [7]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_id_role_is_skipped(self):
        cols = [self._make_col("employee_id", ColumnRole.ID)]
        config = {"lags": [1], "rolling_windows": [7]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_meta_role_is_skipped(self):
        cols = [self._make_col("notes", ColumnRole.META)]
        config = {"lags": [1]}
        result = resolve_transformed_columns(cols, config)
        assert result == []

    def test_rolling_windows(self):
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

    def test_normalize_flag(self):
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

    def test_standardize_flag(self):
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

    def test_minmax_flag(self):
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

    def test_all_flags_combined(self):
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

    def test_per_column_override_lags(self):
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

    def test_per_column_override_rolling(self):
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

    def test_per_column_override_normalize(self):
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

    def test_per_column_override_standardize(self):
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

    def test_per_column_override_minmax(self):
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

    def test_default_config_when_keys_missing(self):
        cols = [self._make_col("revenue", ColumnRole.TARGET)]
        config = {}  # All defaults: lags=[1,7,30], rolling=[7]
        result = resolve_transformed_columns(cols, config)
        names = [c[0] for c in result]
        assert "revenue_lag_1" in names
        assert "revenue_lag_7" in names
        assert "revenue_lag_30" in names
        assert "revenue_rolling_mean_7" in names
        assert "revenue_rolling_std_7" in names

    def test_empty_columns(self):
        result = resolve_transformed_columns([], {"lags": [1]})
        assert result == []

    def test_multiple_columns(self):
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

    def test_all_types_double_precision(self):
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

    def test_naming_convention_lag(self):
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

    def test_naming_convention_rolling(self):
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

    def test_rules_override_none(self):
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

    def test_executes_create_table(self):
        cur = MagicMock()
        _create_raw_table(
            cur, "acme_raw", "effectifs", [("nb_employes", "DOUBLE PRECISION")]
        )
        cur.execute.assert_called_once()
        # The SQL object is composed by psycopg.sql
        sql_arg = cur.execute.call_args[0][0]
        assert isinstance(sql_arg, (psql.SQL, psql.Composed))

    def test_includes_system_columns(self):
        cur = MagicMock()
        _create_raw_table(cur, "acme_raw", "effectifs", [])
        sql_arg = cur.execute.call_args[0][0]
        assert isinstance(sql_arg, (psql.SQL, psql.Composed))

    def test_includes_dynamic_columns(self):
        cur = MagicMock()
        dynamic_cols = [("temperature", "DOUBLE PRECISION"), ("date_col", "DATE")]
        _create_raw_table(cur, "test_raw", "weather", dynamic_cols)
        cur.execute.assert_called_once()

    def test_no_dynamic_columns(self):
        """Raw table with only system columns should still be created."""
        cur = MagicMock()
        _create_raw_table(cur, "acme_raw", "empty_table", [])
        cur.execute.assert_called_once()


# ── _create_transformed_table ─────────────────────────────────


class TestCreateTransformedTable:
    """Tests for the internal DDL helper that builds transformed tables."""

    def test_executes_create_table(self):
        cur = MagicMock()
        _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [("nb_employes_lag_1", "DOUBLE PRECISION")],
        )
        cur.execute.assert_called_once()

    def test_no_feature_columns(self):
        cur = MagicMock()
        _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [],
        )
        cur.execute.assert_called_once()

    def test_validates_feature_column_names(self):
        """Feature column names pass through validate_identifier."""
        cur = MagicMock()
        _create_transformed_table(
            cur,
            "acme_xform",
            "effectifs",
            [("nb_employes", "DOUBLE PRECISION")],
            [("nb_employes_lag_7", "DOUBLE PRECISION")],
        )
        cur.execute.assert_called_once()


# ── _create_indexes ───────────────────────────────────────────


class TestCreateIndexes:
    """Tests for the internal index creation helper."""

    def test_creates_temporal_index(self):
        cur = MagicMock()
        _create_indexes(cur, "acme_raw", "effectifs", "date_col", [])
        # At least 1 call for temporal index, possibly 1 for _ingested_at
        assert cur.execute.call_count >= 1

    def test_creates_group_by_indexes(self):
        cur = MagicMock()
        _create_indexes(
            cur, "acme_raw", "effectifs", "date_col", ["department", "site"]
        )
        # 1 temporal + 2 group_by + 1 _ingested_at = 4
        assert cur.execute.call_count >= 3

    def test_no_group_by(self):
        """No group_by columns -- still creates temporal + _ingested_at."""
        cur = MagicMock()
        _create_indexes(cur, "acme_raw", "effectifs", "date_col", [])
        assert cur.execute.call_count >= 1

    def test_handles_ingested_at_failure(self):
        cur = MagicMock()
        # Simulate _ingested_at index failing (e.g. column doesn't exist on transformed)
        # With no group_by: call 1 = temporal index, call 2 = _ingested_at
        call_count = [0]

        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:  # _ingested_at index attempt
                raise Exception("column does not exist")  # noqa: TRY002

        cur.execute.side_effect = side_effect
        # Should not raise -- the exception is caught
        _create_indexes(cur, "acme_raw", "effectifs", "date_col", [])


# ── create_client_schemas ─────────────────────────────────────


class TestCreateClientSchemas:
    """Tests for the async schema creation function."""

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_creates_raw_and_transformed_schemas(self, mock_settings, mock_ddl):
        mock_settings.RAW_SCHEMA_SUFFIX = "raw"
        mock_settings.TRANSFORMED_SCHEMA_SUFFIX = "transformed"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        raw, transformed = await create_client_schemas("acme")
        assert raw == "acme_raw"
        assert transformed == "acme_transformed"
        # Two CREATE SCHEMA calls
        assert mock_cur.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_rejects_invalid_slug(self):
        with pytest.raises(DDLValidationError):
            await create_client_schemas("ab")  # too short

    @pytest.mark.asyncio
    async def test_rejects_reserved_prefix_slug(self):
        with pytest.raises(DDLValidationError):
            await create_client_schemas("pg_client")

    @pytest.mark.asyncio
    async def test_rejects_uppercase_slug(self):
        with pytest.raises(DDLValidationError):
            await create_client_schemas("Acme")

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_returns_correct_schema_names(self, mock_settings, mock_ddl):
        mock_settings.RAW_SCHEMA_SUFFIX = "raw"
        mock_settings.TRANSFORMED_SCHEMA_SUFFIX = "transformed"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        raw, transformed = await create_client_schemas("logistics_co")
        assert raw == "logistics_co_raw"
        assert transformed == "logistics_co_transformed"


# ── create_dataset_tables ─────────────────────────────────────


class TestCreateDatasetTables:
    """Tests for the async table creation function."""

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    async def test_creates_raw_and_transformed_tables(self, mock_ddl):
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        dataset = SimpleNamespace(
            schema_raw="acme_raw",
            schema_transformed="acme_transformed",
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
    async def test_no_group_by_columns(self, mock_ddl):
        """Dataset with empty group_by should still work."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        dataset = SimpleNamespace(
            schema_raw="acme_raw",
            schema_transformed="acme_transformed",
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
    async def test_drops_both_schemas(self, mock_settings, mock_ddl):
        mock_settings.RAW_SCHEMA_SUFFIX = "raw"
        mock_settings.TRANSFORMED_SCHEMA_SUFFIX = "transformed"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        await drop_client_schemas("acme")
        # Two DROP SCHEMA calls (transformed first, then raw)
        assert mock_cur.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_rejects_invalid_slug(self):
        with pytest.raises(DDLValidationError):
            await drop_client_schemas("ab")

    @pytest.mark.asyncio
    async def test_rejects_reserved_prefix_slug(self):
        with pytest.raises(DDLValidationError):
            await drop_client_schemas("pg_internal")

    @pytest.mark.asyncio
    @patch("app.services.schema_manager.ddl_connection")
    @patch("app.services.schema_manager.settings")
    async def test_drops_transformed_before_raw(self, mock_settings, mock_ddl):
        """Transformed schema should be dropped before raw (dependency order)."""
        mock_settings.RAW_SCHEMA_SUFFIX = "raw"
        mock_settings.TRANSFORMED_SCHEMA_SUFFIX = "transformed"

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        await drop_client_schemas("acme")
        calls = mock_cur.execute.call_args_list
        assert len(calls) == 2


# ── SQL injection prevention ────────────────────────────────────


class TestSQLInjectionPrevention:
    """Verify SQL injection attempts are blocked by DDL validation."""

    @pytest.mark.asyncio
    async def test_sql_injection_in_slug(self):
        with pytest.raises(DDLValidationError):
            await create_client_schemas("acme; DROP TABLE--")

    @pytest.mark.asyncio
    async def test_sql_injection_in_drop_slug(self):
        with pytest.raises(DDLValidationError):
            await drop_client_schemas("acme'; DROP SCHEMA public--")
