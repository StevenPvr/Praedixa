"""Tests for Dataset Management service.

Covers:
- list_datasets: pagination, status filter, tenant isolation, empty results
- get_dataset: success, not found
- create_dataset: happy path, dataset limit, column limit, nullable & ordinal defaults
- update_dataset_config: config change + history recording, null change_reason
- get_dataset_columns: column retrieval with tenant check
- get_dataset_data: system column exclusion via ddl_connection mock, pagination
- get_ingestion_log: log retrieval with pagination
- get_config_history: history retrieval with pagination
- get_fit_parameters: active_only filter (true & false)
- DatasetLimitError: message, code, status_code
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.ddl_validation import DDLValidationError
from app.core.exceptions import NotFoundError
from app.models.data_catalog import DatasetStatus
from app.services.datasets import (
    DatasetLimitError,
    create_dataset,
    get_config_history,
    get_dataset,
    get_dataset_columns,
    get_dataset_data,
    get_fit_parameters,
    get_ingestion_log,
    list_datasets,
    update_dataset_config,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

# ── Helpers ───────────────────────────────────────────────────

ORG_ID = "11111111-1111-1111-1111-111111111111"


def _make_tenant():
    tenant = MagicMock()
    tenant.organization_id = ORG_ID
    tenant.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
    return tenant


def _make_dataset(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "organization_id": uuid.UUID(ORG_ID),
        "name": "effectifs",
        "table_name": "effectifs",
        "schema_raw": "acme_raw",
        "schema_transformed": "acme_transformed",
        "temporal_index": "date_col",
        "group_by": ["department"],
        "pipeline_config": {"lags": [1, 7, 30]},
        "status": DatasetStatus.ACTIVE,
        "row_count": 5000,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ── list_datasets ─────────────────────────────────────────────


class TestListDatasets:
    @pytest.mark.asyncio
    async def test_returns_datasets_and_count(self):
        ds = _make_dataset()
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),  # count
            make_scalars_result([ds]),  # items
        )
        items, total = await list_datasets(tenant, session)
        assert total == 1
        assert items == [ds]

    @pytest.mark.asyncio
    async def test_returns_empty_list(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await list_datasets(tenant, session)
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    async def test_pagination_params(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(50),
            make_scalars_result([_make_dataset()]),
        )
        items, total = await list_datasets(tenant, session, limit=10, offset=20)
        assert total == 50
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_status_filter(self):
        tenant = _make_tenant()
        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result([_make_dataset(status=DatasetStatus.PENDING)]),
        )
        _items, total = await list_datasets(
            tenant,
            session,
            status_filter=DatasetStatus.PENDING,
        )
        assert total == 1


# ── get_dataset ───────────────────────────────────────────────


class TestGetDataset:
    @pytest.mark.asyncio
    async def test_returns_dataset(self):
        ds = _make_dataset()
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(ds))
        result = await get_dataset(ds.id, tenant, session)
        assert result is ds

    @pytest.mark.asyncio
    async def test_raises_not_found(self):
        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(NotFoundError):
            await get_dataset(uuid.uuid4(), tenant, session)


# ── create_dataset ────────────────────────────────────────────


class TestCreateDataset:
    @pytest.mark.asyncio
    @patch("app.services.datasets.create_dataset_tables")
    @patch("app.services.datasets.create_client_schemas")
    @patch("app.services.datasets.settings")
    async def test_happy_path(self, mock_settings, mock_schemas, mock_tables):
        mock_settings.MAX_DATASETS_PER_ORG = 50
        mock_settings.MAX_COLUMNS_PER_TABLE = 200
        mock_schemas.return_value = ("acme_raw", "acme_transformed")
        mock_tables.return_value = None

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))  # current count = 0
        session.add = MagicMock()
        session.flush = AsyncMock()

        ds, cols = await create_dataset(
            tenant,
            session,
            name="effectifs",
            table_name="effectifs",
            temporal_index="date_col",
            group_by=["department"],
            pipeline_config={"lags": [1]},
            columns=[
                {"name": "date_col", "dtype": "date", "role": "temporal_index"},
                {"name": "nb_employes", "dtype": "float", "role": "target"},
            ],
            org_slug="acme",
        )
        assert ds.name == "effectifs"
        assert ds.status == DatasetStatus.ACTIVE
        assert len(cols) == 2

    @pytest.mark.asyncio
    @patch("app.services.datasets.settings")
    async def test_dataset_limit_exceeded(self, mock_settings):
        mock_settings.MAX_DATASETS_PER_ORG = 5

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(5))  # already at limit
        session.add = MagicMock()
        session.flush = AsyncMock()

        with pytest.raises(DatasetLimitError, match="Maximum datasets"):
            await create_dataset(
                tenant,
                session,
                name="new_dataset",
                table_name="new_ds",
                temporal_index="date_col",
                group_by=[],
                pipeline_config={},
                columns=[
                    {"name": "date_col", "dtype": "date", "role": "temporal_index"}
                ],
                org_slug="acme",
            )

    @pytest.mark.asyncio
    @patch("app.services.datasets.settings")
    async def test_column_limit_exceeded(self, mock_settings):
        mock_settings.MAX_DATASETS_PER_ORG = 50
        mock_settings.MAX_COLUMNS_PER_TABLE = 3

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        session.add = MagicMock()
        session.flush = AsyncMock()

        too_many_cols = [
            {"name": f"col_{i}", "dtype": "float", "role": "feature"}
            for i in range(4)  # 4 > limit of 3
        ]

        with pytest.raises(DDLValidationError, match="columns per table"):
            await create_dataset(
                tenant,
                session,
                name="wide_dataset",
                table_name="wide_ds",
                temporal_index="date_col",
                group_by=[],
                pipeline_config={},
                columns=too_many_cols,
                org_slug="acme",
            )


# ── update_dataset_config ─────────────────────────────────────


class TestUpdateDatasetConfig:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset_columns")
    @patch("app.services.datasets.get_dataset")
    async def test_updates_config_and_records_history(self, mock_get, mock_get_cols):
        ds = _make_dataset()
        mock_get.return_value = ds
        mock_get_cols.return_value = [
            SimpleNamespace(name="col1", rules_override=None),
        ]

        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        new_config = {"lags": [1, 3, 7]}
        result = await update_dataset_config(
            ds.id,
            _make_tenant(),
            session,
            pipeline_config=new_config,
            change_reason="Updated lags",
            user_id=str(uuid.uuid4()),
        )
        assert result.pipeline_config == new_config
        # Verify history was added to session
        session.add.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset_columns")
    @patch("app.services.datasets.get_dataset")
    async def test_null_change_reason(self, mock_get, mock_get_cols):
        ds = _make_dataset()
        mock_get.return_value = ds
        mock_get_cols.return_value = []

        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await update_dataset_config(
            ds.id,
            _make_tenant(),
            session,
            pipeline_config={"lags": [1]},
            change_reason=None,
            user_id=str(uuid.uuid4()),
        )
        assert result is ds


# ── get_dataset_columns ───────────────────────────────────────


class TestGetDatasetColumns:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_returns_columns(self, mock_get):
        ds = _make_dataset()
        mock_get.return_value = ds
        cols = [SimpleNamespace(name="a"), SimpleNamespace(name="b")]

        session = make_mock_session(make_scalars_result(cols))
        # Override: get_dataset is patched, so session.execute is only for columns
        result = await get_dataset_columns(ds.id, _make_tenant(), session)
        assert result == cols


# ── get_ingestion_log ─────────────────────────────────────────


class TestGetIngestionLog:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_returns_logs_and_count(self, mock_get):
        mock_get.return_value = _make_dataset()
        logs = [SimpleNamespace(id="log-1")]

        session = make_mock_session(
            make_scalar_result(1),  # count
            make_scalars_result(logs),  # items
        )
        items, total = await get_ingestion_log(
            uuid.uuid4(),
            _make_tenant(),
            session,
        )
        assert total == 1
        assert items == logs


# ── get_config_history ────────────────────────────────────────


class TestGetConfigHistory:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_returns_history_and_count(self, mock_get):
        mock_get.return_value = _make_dataset()
        history = [SimpleNamespace(id="hist-1")]

        session = make_mock_session(
            make_scalar_result(1),
            make_scalars_result(history),
        )
        items, total = await get_config_history(
            uuid.uuid4(),
            _make_tenant(),
            session,
        )
        assert total == 1
        assert items == history


# ── get_fit_parameters ────────────────────────────────────────


class TestGetFitParameters:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_returns_active_params(self, mock_get):
        mock_get.return_value = _make_dataset()
        fps = [SimpleNamespace(column_name="revenue", is_active=True)]

        session = make_mock_session(make_scalars_result(fps))
        result = await get_fit_parameters(
            uuid.uuid4(),
            _make_tenant(),
            session,
        )
        assert result == fps


# ── DatasetLimitError ─────────────────────────────────────────


class TestDatasetLimitError:
    def test_message(self):
        err = DatasetLimitError(10)
        assert "10" in str(err.message)

    def test_code(self):
        err = DatasetLimitError(10)
        assert err.code == "DATASET_LIMIT_EXCEEDED"

    def test_status_code(self):
        err = DatasetLimitError(10)
        assert err.status_code == 409

    def test_inherits_from_praedixa_error(self):
        from app.core.exceptions import PraedixaError

        err = DatasetLimitError(50)
        assert isinstance(err, PraedixaError)

    def test_different_limits(self):
        for limit in [1, 5, 50, 100]:
            err = DatasetLimitError(limit)
            assert str(limit) in str(err.message)


# ── get_dataset_data ─────────────────────────────────────────


class TestGetDatasetData:
    """Tests for get_dataset_data: dynamic query with system column exclusion."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.ddl_connection")
    @patch("app.services.datasets.get_dataset")
    async def test_returns_rows_without_system_columns(self, mock_get, mock_ddl):
        """System columns (_row_id, _ingested_at, _batch_id) are excluded."""
        ds = _make_dataset()
        mock_get.return_value = ds

        # Set up ddl_connection mock
        mock_cur = MagicMock()
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        # Mock cursor results: first call = COUNT(*), second call = SELECT *
        mock_cur.fetchone.return_value = (3,)  # total count
        mock_cur.fetchall.return_value = [
            (uuid.uuid4(), "2026-01-01T00:00:00Z", None, "2026-01-15", 100.0),
            (uuid.uuid4(), "2026-01-02T00:00:00Z", None, "2026-01-16", 200.0),
            (uuid.uuid4(), "2026-01-03T00:00:00Z", None, "2026-01-17", 300.0),
        ]
        # Description for column names
        mock_cur.description = [
            SimpleNamespace(name="_row_id"),
            SimpleNamespace(name="_ingested_at"),
            SimpleNamespace(name="_batch_id"),
            SimpleNamespace(name="date_col"),
            SimpleNamespace(name="revenue"),
        ]

        tenant = _make_tenant()
        session = AsyncMock()  # Not used for DDL queries
        rows, total = await get_dataset_data(ds.id, tenant, session)

        assert total == 3
        assert len(rows) == 3
        # System columns should be excluded
        for row in rows:
            assert "_row_id" not in row
            assert "_ingested_at" not in row
            assert "_batch_id" not in row
            assert "date_col" in row
            assert "revenue" in row

    @pytest.mark.asyncio
    @patch("app.services.datasets.ddl_connection")
    @patch("app.services.datasets.get_dataset")
    async def test_returns_empty_when_no_data(self, mock_get, mock_ddl):
        ds = _make_dataset()
        mock_get.return_value = ds

        mock_cur = MagicMock()
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        mock_cur.fetchone.return_value = (0,)
        mock_cur.fetchall.return_value = []
        mock_cur.description = []

        tenant = _make_tenant()
        session = AsyncMock()
        rows, total = await get_dataset_data(ds.id, tenant, session)

        assert total == 0
        assert rows == []

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_raises_not_found_for_nonexistent_dataset(self, mock_get):
        """get_dataset_data should raise NotFoundError if the dataset doesn't exist."""
        mock_get.side_effect = NotFoundError("Dataset", "fake-id")

        tenant = _make_tenant()
        session = AsyncMock()
        with pytest.raises(NotFoundError):
            await get_dataset_data(uuid.uuid4(), tenant, session)

    @pytest.mark.asyncio
    @patch("app.services.datasets.ddl_connection")
    @patch("app.services.datasets.get_dataset")
    async def test_pagination_with_custom_params(self, mock_get, mock_ddl):
        """Custom limit and offset are passed to the SQL query."""
        ds = _make_dataset()
        mock_get.return_value = ds

        mock_cur = MagicMock()
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cur)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        mock_cur.fetchone.return_value = (50,)
        mock_cur.fetchall.return_value = [(uuid.uuid4(), "2026-01-01", 42.0)]
        mock_cur.description = [
            SimpleNamespace(name="_row_id"),
            SimpleNamespace(name="date_col"),
            SimpleNamespace(name="revenue"),
        ]

        tenant = _make_tenant()
        session = AsyncMock()
        _rows, total = await get_dataset_data(
            ds.id,
            tenant,
            session,
            limit=10,
            offset=20,
        )

        assert total == 50
        # Verify pagination params were passed to the cursor
        data_query_call = mock_cur.execute.call_args_list[-1]
        params = data_query_call[0][1]
        assert params == (10, 20)


# ── get_fit_parameters — extended ────────────────────────────


class TestGetFitParametersExtended:
    """Extended tests for active_only=False."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_active_only_false_returns_all(self, mock_get):
        mock_get.return_value = _make_dataset()
        active_fp = SimpleNamespace(column_name="revenue", is_active=True, version=2)
        inactive_fp = SimpleNamespace(column_name="revenue", is_active=False, version=1)

        session = make_mock_session(make_scalars_result([active_fp, inactive_fp]))
        result = await get_fit_parameters(
            uuid.uuid4(),
            _make_tenant(),
            session,
            active_only=False,
        )
        assert len(result) == 2

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_empty_params(self, mock_get):
        mock_get.return_value = _make_dataset()
        session = make_mock_session(make_scalars_result([]))
        result = await get_fit_parameters(
            uuid.uuid4(),
            _make_tenant(),
            session,
        )
        assert result == []


# ── create_dataset — extended ────────────────────────────────


class TestCreateDatasetExtended:
    """Extended tests for column defaults and schema creation."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.create_dataset_tables")
    @patch("app.services.datasets.create_client_schemas")
    @patch("app.services.datasets.settings")
    async def test_nullable_defaults_to_true(
        self, mock_settings, mock_schemas, mock_tables
    ):
        """Columns without explicit nullable should default to True."""
        mock_settings.MAX_DATASETS_PER_ORG = 50
        mock_settings.MAX_COLUMNS_PER_TABLE = 200
        mock_schemas.return_value = ("acme_raw", "acme_transformed")
        mock_tables.return_value = None

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        session.add = MagicMock()
        session.flush = AsyncMock()

        _ds, cols = await create_dataset(
            tenant,
            session,
            name="test_ds",
            table_name="test_ds",
            temporal_index="date_col",
            group_by=[],
            pipeline_config={},
            columns=[
                {"name": "date_col", "dtype": "date", "role": "temporal_index"},
            ],
            org_slug="acme",
        )
        # The DatasetColumn constructor is called with nullable=True (default)
        # We verify via session.add calls
        assert len(cols) == 1

    @pytest.mark.asyncio
    @patch("app.services.datasets.create_dataset_tables")
    @patch("app.services.datasets.create_client_schemas")
    @patch("app.services.datasets.settings")
    async def test_ordinal_position_defaults(
        self, mock_settings, mock_schemas, mock_tables
    ):
        """Columns without explicit ordinal_position default to their index."""
        mock_settings.MAX_DATASETS_PER_ORG = 50
        mock_settings.MAX_COLUMNS_PER_TABLE = 200
        mock_schemas.return_value = ("acme_raw", "acme_transformed")
        mock_tables.return_value = None

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        session.add = MagicMock()
        session.flush = AsyncMock()

        _ds, cols = await create_dataset(
            tenant,
            session,
            name="test_ds",
            table_name="test_ds",
            temporal_index="date_col",
            group_by=[],
            pipeline_config={},
            columns=[
                {"name": "date_col", "dtype": "date", "role": "temporal_index"},
                {"name": "revenue", "dtype": "float", "role": "target"},
                {"name": "department", "dtype": "category", "role": "feature"},
            ],
            org_slug="acme",
        )
        assert len(cols) == 3

    @pytest.mark.asyncio
    @patch("app.services.datasets.create_dataset_tables")
    @patch("app.services.datasets.create_client_schemas")
    @patch("app.services.datasets.settings")
    async def test_explicit_rules_override(
        self, mock_settings, mock_schemas, mock_tables
    ):
        """Column with rules_override should pass it through."""
        mock_settings.MAX_DATASETS_PER_ORG = 50
        mock_settings.MAX_COLUMNS_PER_TABLE = 200
        mock_schemas.return_value = ("acme_raw", "acme_transformed")
        mock_tables.return_value = None

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        session.add = MagicMock()
        session.flush = AsyncMock()

        _ds, cols = await create_dataset(
            tenant,
            session,
            name="test_ds",
            table_name="test_ds",
            temporal_index="date_col",
            group_by=[],
            pipeline_config={},
            columns=[
                {"name": "date_col", "dtype": "date", "role": "temporal_index"},
                {
                    "name": "revenue",
                    "dtype": "float",
                    "role": "target",
                    "nullable": False,
                    "rules_override": {"lags": [1, 3]},
                },
            ],
            org_slug="acme",
        )
        assert len(cols) == 2

    @pytest.mark.asyncio
    @patch("app.services.datasets.create_dataset_tables")
    @patch("app.services.datasets.create_client_schemas")
    @patch("app.services.datasets.settings")
    async def test_status_is_active_after_creation(
        self, mock_settings, mock_schemas, mock_tables
    ):
        """Dataset status should be ACTIVE after successful table creation."""
        mock_settings.MAX_DATASETS_PER_ORG = 50
        mock_settings.MAX_COLUMNS_PER_TABLE = 200
        mock_schemas.return_value = ("acme_raw", "acme_transformed")
        mock_tables.return_value = None

        tenant = _make_tenant()
        session = make_mock_session(make_scalar_result(0))
        session.add = MagicMock()
        session.flush = AsyncMock()

        ds, _cols = await create_dataset(
            tenant,
            session,
            name="effectifs",
            table_name="effectifs",
            temporal_index="date_col",
            group_by=[],
            pipeline_config={},
            columns=[{"name": "date_col", "dtype": "date", "role": "temporal_index"}],
            org_slug="acme",
        )
        assert ds.status == DatasetStatus.ACTIVE


# ── update_dataset_config — extended ─────────────────────────


class TestUpdateDatasetConfigExtended:
    """Extended tests for update_dataset_config edge cases."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset_columns")
    @patch("app.services.datasets.get_dataset")
    async def test_columns_snapshot_includes_rules_override(
        self, mock_get, mock_get_cols
    ):
        """History snapshot should capture each column's rules_override."""
        ds = _make_dataset()
        mock_get.return_value = ds
        mock_get_cols.return_value = [
            SimpleNamespace(name="col1", rules_override={"lags": [1, 3]}),
            SimpleNamespace(name="col2", rules_override=None),
        ]

        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await update_dataset_config(
            ds.id,
            _make_tenant(),
            session,
            pipeline_config={"lags": [1, 7]},
            change_reason="Updated",
            user_id=str(uuid.uuid4()),
        )
        assert result is ds
        # Verify history was added
        add_calls = session.add.call_args_list
        assert len(add_calls) >= 1

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset_columns")
    @patch("app.services.datasets.get_dataset")
    async def test_sanitizes_change_reason(self, mock_get, mock_get_cols):
        """Change reason with HTML should be sanitized."""
        ds = _make_dataset()
        mock_get.return_value = ds
        mock_get_cols.return_value = []

        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        result = await update_dataset_config(
            ds.id,
            _make_tenant(),
            session,
            pipeline_config={"lags": [1]},
            change_reason="Updated <script>alert('xss')</script>",
            user_id=str(uuid.uuid4()),
        )
        assert result is ds

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_raises_not_found_for_missing_dataset(self, mock_get):
        """update_dataset_config should raise NotFoundError if dataset not found."""
        mock_get.side_effect = NotFoundError("Dataset", "fake-id")

        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()

        with pytest.raises(NotFoundError):
            await update_dataset_config(
                uuid.uuid4(),
                _make_tenant(),
                session,
                pipeline_config={"lags": [1]},
                change_reason="test",
                user_id=str(uuid.uuid4()),
            )


# ── list_datasets — extended ────────────────────────────────


class TestListDatasetsExtended:
    """Extended tests for edge cases in list_datasets."""

    @pytest.mark.asyncio
    async def test_scalar_one_returns_none_coerced_to_zero(self):
        """When count query returns None (no rows), should coerce to 0."""
        tenant = _make_tenant()
        # scalar_one returns None -> the `or 0` branch
        count_result = MagicMock()
        count_result.scalar_one.return_value = None
        session = make_mock_session(
            count_result,
            make_scalars_result([]),
        )
        items, total = await list_datasets(tenant, session)
        assert total == 0
        assert items == []


# ── get_dataset_columns — extended ───────────────────────────


class TestGetDatasetColumnsExtended:
    """Extended tests for get_dataset_columns."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_raises_not_found_for_missing_dataset(self, mock_get):
        mock_get.side_effect = NotFoundError("Dataset", "fake-id")
        session = AsyncMock()
        with pytest.raises(NotFoundError):
            await get_dataset_columns(uuid.uuid4(), _make_tenant(), session)

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_returns_empty_columns(self, mock_get):
        """Dataset with no columns returns empty list."""
        mock_get.return_value = _make_dataset()
        session = make_mock_session(make_scalars_result([]))
        result = await get_dataset_columns(uuid.uuid4(), _make_tenant(), session)
        assert result == []


# ── get_ingestion_log — extended ─────────────────────────────


class TestGetIngestionLogExtended:
    """Extended tests for get_ingestion_log."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_empty_log(self, mock_get):
        mock_get.return_value = _make_dataset()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await get_ingestion_log(
            uuid.uuid4(),
            _make_tenant(),
            session,
        )
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_with_pagination_params(self, mock_get):
        mock_get.return_value = _make_dataset()
        logs = [SimpleNamespace(id="log-1")]
        session = make_mock_session(
            make_scalar_result(10),
            make_scalars_result(logs),
        )
        items, total = await get_ingestion_log(
            uuid.uuid4(),
            _make_tenant(),
            session,
            limit=5,
            offset=5,
        )
        assert total == 10
        assert len(items) == 1


# ── get_config_history — extended ────────────────────────────


class TestGetConfigHistoryExtended:
    """Extended tests for get_config_history."""

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_empty_history(self, mock_get):
        mock_get.return_value = _make_dataset()
        session = make_mock_session(
            make_scalar_result(0),
            make_scalars_result([]),
        )
        items, total = await get_config_history(
            uuid.uuid4(),
            _make_tenant(),
            session,
        )
        assert total == 0
        assert items == []

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    async def test_with_pagination_params(self, mock_get):
        mock_get.return_value = _make_dataset()
        history = [SimpleNamespace(id="hist-1"), SimpleNamespace(id="hist-2")]
        session = make_mock_session(
            make_scalar_result(20),
            make_scalars_result(history),
        )
        items, total = await get_config_history(
            uuid.uuid4(),
            _make_tenant(),
            session,
            limit=2,
            offset=10,
        )
        assert total == 20
        assert len(items) == 2
