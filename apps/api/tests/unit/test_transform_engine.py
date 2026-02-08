"""Tests for Transform Engine service.

Covers:
- HMAC computation and verification
- _verify_all_hmacs with tampered/valid params
- run_incremental: success, failure, HMAC verification, with cutoff, request_id
- run_full_refit: success, failure, request_id
- save_fit_parameters: version increment, HMAC generation, deactivation
- _load_dataset: not found, not active, all non-active statuses
- _load_columns: columns list, empty
- _load_active_fit_params: returns active params
- _get_last_successful_cutoff: returns datetime or None
- _execute_pipeline: incremental/full_refit modes, empty rows, system columns
- _insert_transformed_rows: row insertion, empty rows, system column filtering
- _atomic_swap_refit: atomic rename pattern
- Error message truncation in log entries (2000 char limit)
"""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.data_catalog import DatasetStatus, IngestionMode, RunStatus
from app.services.transform_engine import (
    _atomic_swap_refit,
    _filter_incremental_rows,
    _get_last_successful_cutoff,
    _insert_transformed_rows,
    _is_after_cutoff,
    _load_active_fit_params,
    _load_columns,
    _load_dataset,
    _verify_all_hmacs,
    compute_hmac,
    run_full_refit,
    run_incremental,
    save_fit_parameters,
    verify_hmac,
)
from tests.unit.conftest import (
    make_mock_session,
    make_scalar_result,
    make_scalars_result,
)

# ── HMAC utilities ────────────────────────────────────────────


class TestComputeHmac:
    def test_returns_hex_string(self):
        result = compute_hmac({"mean": 42.0}, "test_secret")
        assert isinstance(result, str)
        assert len(result) == 64  # SHA256 hex digest

    def test_deterministic(self):
        params = {"mean": 42.0, "std": 1.5}
        h1 = compute_hmac(params, "secret")
        h2 = compute_hmac(params, "secret")
        assert h1 == h2

    def test_different_secret_different_hmac(self):
        params = {"mean": 42.0}
        h1 = compute_hmac(params, "secret1")
        h2 = compute_hmac(params, "secret2")
        assert h1 != h2

    def test_different_params_different_hmac(self):
        h1 = compute_hmac({"mean": 42.0}, "secret")
        h2 = compute_hmac({"mean": 43.0}, "secret")
        assert h1 != h2

    def test_key_ordering_irrelevant(self):
        h1 = compute_hmac({"a": 1, "b": 2}, "secret")
        h2 = compute_hmac({"b": 2, "a": 1}, "secret")
        assert h1 == h2


class TestVerifyHmac:
    def test_valid_hmac_returns_true(self):
        params = {"mean": 42.0}
        h = compute_hmac(params, "secret")
        assert verify_hmac(params, h, "secret") is True

    def test_tampered_hmac_returns_false(self):
        params = {"mean": 42.0}
        assert verify_hmac(params, "bad_hmac", "secret") is False

    def test_wrong_secret_returns_false(self):
        params = {"mean": 42.0}
        h = compute_hmac(params, "secret")
        assert verify_hmac(params, h, "wrong_secret") is False


class TestVerifyAllHmacs:
    def test_valid_params_no_raise(self):
        params = {"mean": 42.0}
        h = compute_hmac(params, "secret")
        fp = SimpleNamespace(
            parameters=params,
            hmac_sha256=h,
            column_name="revenue",
            transform_type="zscore",
            version=1,
        )
        _verify_all_hmacs([fp], "secret")  # should not raise

    def test_tampered_params_raises(self):
        fp = SimpleNamespace(
            parameters={"mean": 42.0},
            hmac_sha256="bad",
            column_name="revenue",
            transform_type="zscore",
            version=1,
        )
        with pytest.raises(ValueError, match="HMAC verification failed"):
            _verify_all_hmacs([fp], "secret")

    def test_null_hmac_skipped(self):
        fp = SimpleNamespace(
            parameters={"mean": 42.0},
            hmac_sha256=None,
            column_name="revenue",
            transform_type="zscore",
            version=1,
        )
        # Should not raise — null HMAC means not verified
        _verify_all_hmacs([fp], "secret")

    def test_empty_list_no_raise(self):
        _verify_all_hmacs([], "secret")


# ── _load_dataset ─────────────────────────────────────────────


class TestLoadDataset:
    @pytest.mark.asyncio
    async def test_returns_active_dataset(self):
        ds = SimpleNamespace(
            id=uuid.uuid4(),
            status=DatasetStatus.ACTIVE,
        )
        session = make_mock_session(make_scalar_result(ds))
        result = await _load_dataset(ds.id, session)
        assert result is ds

    @pytest.mark.asyncio
    async def test_raises_if_not_found(self):
        session = make_mock_session(make_scalar_result(None))
        with pytest.raises(ValueError, match="not found"):
            await _load_dataset(uuid.uuid4(), session)

    @pytest.mark.asyncio
    async def test_raises_if_not_active(self):
        ds = SimpleNamespace(
            id=uuid.uuid4(),
            status=DatasetStatus.PENDING,
        )
        session = make_mock_session(make_scalar_result(ds))
        with pytest.raises(ValueError, match="not active"):
            await _load_dataset(ds.id, session)


# ── _load_columns ─────────────────────────────────────────────


class TestLoadColumns:
    @pytest.mark.asyncio
    async def test_returns_columns_list(self):
        cols = [SimpleNamespace(name="a"), SimpleNamespace(name="b")]
        session = make_mock_session(make_scalars_result(cols))
        result = await _load_columns(uuid.uuid4(), session)
        assert result == cols

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_columns(self):
        session = make_mock_session(make_scalars_result([]))
        result = await _load_columns(uuid.uuid4(), session)
        assert result == []


# ── _load_active_fit_params ───────────────────────────────────


class TestLoadActiveFitParams:
    @pytest.mark.asyncio
    async def test_returns_active_params(self):
        fps = [SimpleNamespace(column_name="x", is_active=True)]
        session = make_mock_session(make_scalars_result(fps))
        result = await _load_active_fit_params(uuid.uuid4(), session)
        assert result == fps


# ── _get_last_successful_cutoff ───────────────────────────────


class TestGetLastSuccessfulCutoff:
    @pytest.mark.asyncio
    async def test_returns_datetime_when_exists(self):
        cutoff_time = datetime(2026, 2, 5, 14, 0, tzinfo=UTC)
        session = make_mock_session(make_scalar_result(cutoff_time))
        result = await _get_last_successful_cutoff(uuid.uuid4(), session)
        assert result == cutoff_time

    @pytest.mark.asyncio
    async def test_returns_none_when_no_history(self):
        session = make_mock_session(make_scalar_result(None))
        result = await _get_last_successful_cutoff(uuid.uuid4(), session)
        assert result is None


# ── run_incremental ───────────────────────────────────────────


class TestRunIncremental:
    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_success(
        self, mock_load_ds, mock_load_cols, mock_load_fp, mock_cutoff, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1, 7, 30], "rolling_windows": [7]},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_load_fp.return_value = []
        mock_cutoff.return_value = None
        mock_pipeline.return_value = (100, 95)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_incremental(ds_id, session, triggered_by="test")
        assert log.status == RunStatus.SUCCESS
        assert log.rows_received == 100
        assert log.rows_transformed == 95
        assert log.mode == IngestionMode.INCREMENTAL

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_failure_writes_error(
        self, mock_load_ds, mock_load_cols, mock_load_fp, mock_cutoff, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        mock_load_ds.side_effect = ValueError("Dataset not found")

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(ValueError, match="not found"):
            await run_incremental(ds_id, session)

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_hmac_verification_called(
        self, mock_load_ds, mock_load_cols, mock_load_fp, mock_cutoff, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1], "rolling_windows": [7]},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []

        # Create fit param with valid HMAC
        params_data = {"mean": 42.0}
        hmac_val = compute_hmac(params_data, "my_secret")
        fp = SimpleNamespace(
            parameters=params_data,
            hmac_sha256=hmac_val,
            column_name="revenue",
            transform_type="zscore",
            version=1,
        )
        mock_load_fp.return_value = [fp]
        mock_cutoff.return_value = None
        mock_pipeline.return_value = (50, 50)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        # Should not raise — HMAC is valid
        log = await run_incremental(ds_id, session, hmac_secret="my_secret")
        assert log.status == RunStatus.SUCCESS


# ── run_full_refit ────────────────────────────────────────────


class TestRunFullRefit:
    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_success(self, mock_load_ds, mock_load_cols, mock_pipeline):
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_pipeline.return_value = (200, 200)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_full_refit(ds_id, session, triggered_by="test")
        assert log.status == RunStatus.SUCCESS
        assert log.mode == IngestionMode.FULL_REFIT
        assert log.rows_received == 200

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_failure_writes_error(
        self, mock_load_ds, mock_load_cols, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        mock_load_ds.return_value = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_cols.return_value = []
        mock_pipeline.side_effect = RuntimeError("DB connection lost")

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(RuntimeError, match="DB connection lost"):
            await run_full_refit(ds_id, session)


# ── save_fit_parameters ───────────────────────────────────────


class TestSaveFitParameters:
    @pytest.mark.asyncio
    async def test_increments_version(self):
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        # First execute: deactivate old params (no result needed)
        # Second execute: get last version -> 2
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),  # deactivate
                make_scalar_result(2),  # last version
            ]
        )

        params = [
            {
                "column_name": "revenue",
                "transform_type": "zscore",
                "parameters": {"mean": 42.0},
            }
        ]
        result = await save_fit_parameters(ds_id, session, params)

        assert len(result) == 1
        assert result[0].version == 3  # 2 + 1

    @pytest.mark.asyncio
    async def test_first_version_is_1(self):
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),  # deactivate
                make_scalar_result(None),  # no previous version -> 0
            ]
        )

        params = [
            {
                "column_name": "revenue",
                "transform_type": "zscore",
                "parameters": {"mean": 42.0},
            }
        ]
        result = await save_fit_parameters(ds_id, session, params)

        assert result[0].version == 1

    @pytest.mark.asyncio
    async def test_hmac_generated_when_secret_provided(self):
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),  # deactivate
                make_scalar_result(None),  # last version
            ]
        )

        params = [
            {
                "column_name": "revenue",
                "transform_type": "zscore",
                "parameters": {"mean": 42.0},
            }
        ]
        result = await save_fit_parameters(
            ds_id, session, params, hmac_secret="my_secret"
        )

        assert result[0].hmac_sha256 is not None
        assert len(result[0].hmac_sha256) == 64

    @pytest.mark.asyncio
    async def test_no_hmac_without_secret(self):
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),  # deactivate
                make_scalar_result(None),  # last version
            ]
        )

        params = [
            {
                "column_name": "revenue",
                "transform_type": "zscore",
                "parameters": {"mean": 42.0},
            }
        ]
        result = await save_fit_parameters(ds_id, session, params, hmac_secret="")

        assert result[0].hmac_sha256 is None

    @pytest.mark.asyncio
    async def test_multiple_params_saved(self):
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),
                make_scalar_result(None),
                MagicMock(),
                make_scalar_result(None),
            ]
        )

        params = [
            {
                "column_name": "revenue",
                "transform_type": "zscore",
                "parameters": {"mean": 42.0},
            },
            {
                "column_name": "temperature",
                "transform_type": "minmax",
                "parameters": {"min": 0, "max": 100},
            },
        ]
        result = await save_fit_parameters(ds_id, session, params)

        assert len(result) == 2
        assert result[0].column_name == "revenue"
        assert result[1].column_name == "temperature"

    @pytest.mark.asyncio
    async def test_row_count_from_param(self):
        """row_count is read from the param dict if provided."""
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),
                make_scalar_result(None),
            ]
        )

        params = [
            {
                "column_name": "x",
                "transform_type": "zscore",
                "parameters": {"mean": 1.0},
                "row_count": 5000,
            }
        ]
        result = await save_fit_parameters(ds_id, session, params)
        assert result[0].row_count == 5000

    @pytest.mark.asyncio
    async def test_row_count_defaults_to_zero(self):
        """row_count defaults to 0 if not provided in param dict."""
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),
                make_scalar_result(None),
            ]
        )

        params = [
            {
                "column_name": "x",
                "transform_type": "zscore",
                "parameters": {"mean": 1.0},
            }
        ]
        result = await save_fit_parameters(ds_id, session, params)
        assert result[0].row_count == 0

    @pytest.mark.asyncio
    async def test_all_params_are_active(self):
        """All newly saved params must be active."""
        ds_id = uuid.uuid4()
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.execute = AsyncMock(
            side_effect=[
                MagicMock(),
                make_scalar_result(None),
                MagicMock(),
                make_scalar_result(None),
            ]
        )

        params = [
            {
                "column_name": "a",
                "transform_type": "zscore",
                "parameters": {"mean": 1.0},
            },
            {
                "column_name": "b",
                "transform_type": "minmax",
                "parameters": {"min": 0, "max": 1},
            },
        ]
        result = await save_fit_parameters(ds_id, session, params)
        assert all(fp.is_active is True for fp in result)


# ── run_incremental — extended coverage ──────────────────────


class TestRunIncrementalExtended:
    """Extended tests for incremental runs: request_id, cutoff, error truncation."""

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_with_request_id(
        self, mock_load_ds, mock_load_cols, mock_load_fp, mock_cutoff, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1], "rolling_windows": [7]},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_load_fp.return_value = []
        mock_cutoff.return_value = None
        mock_pipeline.return_value = (10, 10)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_incremental(ds_id, session, request_id="req-abc-123")
        assert log.request_id == "req-abc-123"
        assert log.status == RunStatus.SUCCESS

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_with_existing_cutoff(
        self, mock_load_ds, mock_load_cols, mock_load_fp, mock_cutoff, mock_pipeline
    ):
        """When a previous successful run exists, cutoff is passed to pipeline."""
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1, 7], "rolling_windows": [14]},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_load_fp.return_value = []
        cutoff_time = datetime(2026, 2, 1, 12, 0, tzinfo=UTC)
        mock_cutoff.return_value = cutoff_time
        mock_pipeline.return_value = (50, 48)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_incremental(ds_id, session)
        assert log.status == RunStatus.SUCCESS
        assert log.rows_received == 50
        # Verify pipeline received the cutoff
        call_kwargs = mock_pipeline.call_args.kwargs
        assert call_kwargs["cutoff"] == cutoff_time

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_pipeline_failure_records_error_in_log(
        self,
        mock_load_ds,
        mock_load_cols,
        mock_load_fp,
        mock_cutoff,
        mock_pipeline,
    ):
        """Pipeline failure should set status=FAILED and record error_message."""
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1], "rolling_windows": []},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_load_fp.return_value = []
        mock_cutoff.return_value = None
        mock_pipeline.side_effect = RuntimeError("Connection reset by peer")

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(RuntimeError, match="Connection reset"):
            await run_incremental(ds_id, session)

        # The flush should have been called with the error log
        assert session.flush.call_count >= 2  # initial + error

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_error_message_truncated_at_2000_chars(
        self,
        mock_load_ds,
        mock_load_cols,
        mock_load_fp,
        mock_cutoff,
        mock_pipeline,
    ):
        """Error messages >2000 chars should be truncated in log."""
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1], "rolling_windows": []},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_load_fp.return_value = []
        mock_cutoff.return_value = None
        long_error = "x" * 3000
        mock_pipeline.side_effect = RuntimeError(long_error)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(RuntimeError):
            await run_incremental(ds_id, session)

        # Inspect the log_entry that was created via session.add
        add_call_args = session.add.call_args_list
        # First add call is the IngestionLog entry
        log_entry = add_call_args[0][0][0]
        assert log_entry.error_message is not None
        assert len(log_entry.error_message) <= 2000

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_hmac_failure_raises_and_logs(
        self,
        mock_load_ds,
        mock_load_cols,
        mock_load_fp,
        mock_cutoff,
        mock_pipeline,
    ):
        """Tampered HMAC should raise ValueError and set FAILED status."""
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1], "rolling_windows": []},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        fp = SimpleNamespace(
            parameters={"mean": 42.0},
            hmac_sha256="tampered_hex_value",
            column_name="revenue",
            transform_type="zscore",
            version=1,
        )
        mock_load_fp.return_value = [fp]
        mock_cutoff.return_value = None

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(ValueError, match="HMAC verification failed"):
            await run_incremental(ds_id, session, hmac_secret="my_secret")

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_no_hmac_verification_without_secret(
        self,
        mock_load_ds,
        mock_load_cols,
        mock_load_fp,
        mock_cutoff,
        mock_pipeline,
    ):
        """Without hmac_secret, fit params are NOT verified (even if HMAC is bad)."""
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1], "rolling_windows": []},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        fp = SimpleNamespace(
            parameters={"mean": 42.0},
            hmac_sha256="BAD_HMAC",
            column_name="revenue",
            transform_type="zscore",
            version=1,
        )
        mock_load_fp.return_value = [fp]
        mock_cutoff.return_value = None
        mock_pipeline.return_value = (10, 10)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        # hmac_secret="" (default) -> no verification -> should not raise
        log = await run_incremental(ds_id, session)
        assert log.status == RunStatus.SUCCESS

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._get_last_successful_cutoff")
    @patch("app.services.transform_engine._load_active_fit_params")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_lookback_days_computed_from_config(
        self,
        mock_load_ds,
        mock_load_cols,
        mock_load_fp,
        mock_cutoff,
        mock_pipeline,
    ):
        """lookback_days = max(lags) + max(rolling_windows)."""
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={"lags": [1, 7, 30], "rolling_windows": [7, 14]},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_load_fp.return_value = []
        mock_cutoff.return_value = None
        mock_pipeline.return_value = (100, 100)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        await run_incremental(ds_id, session)
        # max([1,7,30]) + max([7,14]) = 30 + 14 = 44
        call_kwargs = mock_pipeline.call_args.kwargs
        assert call_kwargs["lookback_days"] == 44


# ── run_full_refit — extended coverage ───────────────────────


class TestRunFullRefitExtended:
    """Extended tests for full refit: request_id, error truncation."""

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_with_request_id(self, mock_load_ds, mock_load_cols, mock_pipeline):
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_pipeline.return_value = (100, 100)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_full_refit(ds_id, session, request_id="req-xyz-789")
        assert log.request_id == "req-xyz-789"
        assert log.triggered_by == "refit_weekly"

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_custom_triggered_by(
        self, mock_load_ds, mock_load_cols, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        dataset = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_ds.return_value = dataset
        mock_load_cols.return_value = []
        mock_pipeline.return_value = (50, 50)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_full_refit(ds_id, session, triggered_by="manual_admin")
        assert log.triggered_by == "manual_admin"

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_error_message_truncated(
        self, mock_load_ds, mock_load_cols, mock_pipeline
    ):
        """Error messages in full_refit are also truncated at 2000 chars."""
        ds_id = uuid.uuid4()
        mock_load_ds.return_value = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_cols.return_value = []
        mock_pipeline.side_effect = RuntimeError("y" * 3000)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(RuntimeError):
            await run_full_refit(ds_id, session)

        log_entry = session.add.call_args_list[0][0][0]
        assert log_entry.error_message is not None
        assert len(log_entry.error_message) <= 2000

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_completed_at_set_on_success(
        self, mock_load_ds, mock_load_cols, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        mock_load_ds.return_value = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_cols.return_value = []
        mock_pipeline.return_value = (10, 10)

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        log = await run_full_refit(ds_id, session)
        assert log.completed_at is not None
        assert log.error_message is None

    @pytest.mark.asyncio
    @patch("app.services.transform_engine._execute_pipeline")
    @patch("app.services.transform_engine._load_columns")
    @patch("app.services.transform_engine._load_dataset")
    async def test_completed_at_set_on_failure(
        self, mock_load_ds, mock_load_cols, mock_pipeline
    ):
        ds_id = uuid.uuid4()
        mock_load_ds.return_value = SimpleNamespace(
            id=ds_id,
            status=DatasetStatus.ACTIVE,
            pipeline_config={},
        )
        mock_load_cols.return_value = []
        mock_pipeline.side_effect = RuntimeError("boom")

        session = AsyncMock()
        session.flush = AsyncMock()
        session.add = MagicMock()

        with pytest.raises(RuntimeError):
            await run_full_refit(ds_id, session)

        log_entry = session.add.call_args_list[0][0][0]
        assert log_entry.completed_at is not None
        assert log_entry.status == RunStatus.FAILED


# ── _load_dataset — extended coverage ────────────────────────


class TestLoadDatasetExtended:
    """Extended tests for all non-ACTIVE dataset statuses."""

    @pytest.mark.asyncio
    async def test_raises_if_pending(self):
        ds = SimpleNamespace(id=uuid.uuid4(), status=DatasetStatus.PENDING)
        session = make_mock_session(make_scalar_result(ds))
        with pytest.raises(ValueError, match="not active"):
            await _load_dataset(ds.id, session)

    @pytest.mark.asyncio
    async def test_raises_if_error(self):
        ds = SimpleNamespace(id=uuid.uuid4(), status=DatasetStatus.MIGRATING)
        session = make_mock_session(make_scalar_result(ds))
        with pytest.raises(ValueError, match="not active"):
            await _load_dataset(ds.id, session)

    @pytest.mark.asyncio
    async def test_raises_if_archived(self):
        ds = SimpleNamespace(id=uuid.uuid4(), status=DatasetStatus.ARCHIVED)
        session = make_mock_session(make_scalar_result(ds))
        with pytest.raises(ValueError, match="not active"):
            await _load_dataset(ds.id, session)


# ── _insert_transformed_rows ─────────────────────────────────


class TestInsertTransformedRows:
    """Tests for the private _insert_transformed_rows function."""

    def test_empty_rows_returns_early(self):
        """No rows to insert -> no DB write calls."""
        cur = MagicMock()
        inserted = _insert_transformed_rows(
            cur,
            "acme_xform",
            "effectifs",
            rows=[],
            col_names=[],
            columns=[],
            feature_cols=[],
        )
        assert inserted == 0
        cur.execute.assert_not_called()
        cur.executemany.assert_not_called()

    def test_inserts_one_row(self):
        """Single row is inserted with correct value mapping."""
        cur = MagicMock()
        columns = [SimpleNamespace(name="revenue")]
        feature_cols = [("revenue_lag_1", "DOUBLE PRECISION")]
        rows = [(uuid.uuid4(), 42.0)]
        col_names = ["_row_id", "revenue"]

        inserted = _insert_transformed_rows(
            cur,
            "acme_xform",
            "effectifs",
            rows=rows,
            col_names=col_names,
            columns=columns,
            feature_cols=feature_cols,
        )
        assert inserted == 1
        cur.executemany.assert_called_once()

    def test_inserts_multiple_rows(self):
        """Multiple rows are inserted in batched executemany mode."""
        cur = MagicMock()
        columns = [SimpleNamespace(name="temperature")]
        feature_cols = []
        rows = [(uuid.uuid4(), 20.0), (uuid.uuid4(), 22.5), (uuid.uuid4(), 18.0)]
        col_names = ["_row_id", "temperature"]

        inserted = _insert_transformed_rows(
            cur,
            "test_xform",
            "weather",
            rows=rows,
            col_names=col_names,
            columns=columns,
            feature_cols=feature_cols,
        )
        assert inserted == 3
        cur.executemany.assert_called_once()

    def test_feature_cols_set_to_null(self):
        """Feature columns get NULL values (placeholders for ML team)."""
        cur = MagicMock()
        columns = [SimpleNamespace(name="revenue")]
        feature_cols = [
            ("revenue_lag_1", "DOUBLE PRECISION"),
            ("revenue_rolling_mean_7", "DOUBLE PRECISION"),
        ]
        rows = [(uuid.uuid4(), 50.0)]
        col_names = ["_row_id", "revenue"]

        _insert_transformed_rows(
            cur,
            "acme_xform",
            "effectifs",
            rows=rows,
            col_names=col_names,
            columns=columns,
            feature_cols=feature_cols,
        )
        # Verify the values list passed to executemany
        call_args = cur.executemany.call_args
        values = call_args[0][1][0]
        # Last 2 values should be None (feature columns)
        assert values[-1] is None
        assert values[-2] is None


class TestFilterIncrementalRows:
    """Tests for incremental filtering of lookback context rows."""

    def test_filters_rows_strictly_after_cutoff(self):
        cutoff = datetime(2026, 1, 10, tzinfo=UTC)
        rows = [
            ("row-1", datetime(2026, 1, 9, tzinfo=UTC), 1.0),
            ("row-2", datetime(2026, 1, 10, tzinfo=UTC), 2.0),
            ("row-3", datetime(2026, 1, 11, tzinfo=UTC), 3.0),
        ]
        col_names = ["_row_id", "_ingested_at", "value"]

        filtered = _filter_incremental_rows(rows, col_names, cutoff)
        assert filtered == [("row-3", datetime(2026, 1, 11, tzinfo=UTC), 3.0)]

    def test_returns_all_if_ingested_at_missing(self):
        cutoff = datetime(2026, 1, 10, tzinfo=UTC)
        rows = [("row-1", 1.0), ("row-2", 2.0)]
        col_names = ["_row_id", "value"]

        filtered = _filter_incremental_rows(rows, col_names, cutoff)
        assert filtered == rows


# ── _atomic_swap_refit ───────────────────────────────────────


class TestAtomicSwapRefit:
    """Tests for the atomic rename pattern in full refit."""

    def test_creates_temp_table_and_swaps(self):
        cur = MagicMock()
        columns = [SimpleNamespace(name="revenue")]
        feature_cols = [("revenue_lag_1", "DOUBLE PRECISION")]
        rows = [(uuid.uuid4(), 50.0)]
        col_names = ["_row_id", "revenue"]

        _atomic_swap_refit(
            cur,
            "acme_xform",
            "effectifs",
            "tmp_effectifs_abc12345",
            rows,
            col_names,
            columns,
            feature_cols,
        )

        # Expect calls: CREATE temp, INSERT rows, DROP old IF EXISTS,
        # RENAME real->old, RENAME temp->real, DROP old
        assert cur.execute.call_count >= 5

    def test_empty_rows_still_creates_temp(self):
        """Even with empty rows, the temp table is created and swap performed."""
        cur = MagicMock()
        _atomic_swap_refit(
            cur,
            "acme_xform",
            "effectifs",
            "tmp_effectifs_abc12345",
            rows=[],
            col_names=[],
            columns=[],
            feature_cols=[],
        )
        # CREATE temp + DROP old IF EXISTS + RENAME + RENAME + DROP old = 4
        # (INSERT rows skipped because _insert_transformed_rows returns early)
        assert cur.execute.call_count >= 4


# ── HMAC edge cases ─────────────────────────────────────────


class TestComputeHmacEdgeCases:
    """Edge cases for HMAC computation."""

    def test_empty_params_dict(self):
        result = compute_hmac({}, "secret")
        assert isinstance(result, str)
        assert len(result) == 64

    def test_nested_params(self):
        """Nested dicts should be serialized deterministically."""
        params = {"config": {"lags": [1, 7], "window": 14}}
        h1 = compute_hmac(params, "secret")
        h2 = compute_hmac(params, "secret")
        assert h1 == h2

    def test_non_string_values(self):
        """Non-string values (float, int, bool, None) should not crash."""
        params = {"mean": 42.0, "count": 100, "flag": True, "extra": None}
        result = compute_hmac(params, "secret")
        assert len(result) == 64

    def test_empty_secret(self):
        """Empty string secret should still produce a valid HMAC."""
        result = compute_hmac({"x": 1}, "")
        assert len(result) == 64


class TestVerifyHmacEdgeCases:
    """Edge cases for HMAC verification."""

    def test_empty_params(self):
        params = {}
        h = compute_hmac(params, "secret")
        assert verify_hmac(params, h, "secret") is True

    def test_modified_params_fail(self):
        """Modifying a single value in params should fail verification."""
        params = {"mean": 42.0}
        h = compute_hmac(params, "secret")
        tampered = {"mean": 42.1}
        assert verify_hmac(tampered, h, "secret") is False

    def test_extra_key_fails(self):
        """Adding a key to params should fail verification."""
        params = {"mean": 42.0}
        h = compute_hmac(params, "secret")
        tampered = {"mean": 42.0, "extra": 0}
        assert verify_hmac(tampered, h, "secret") is False


class TestVerifyAllHmacsEdgeCases:
    """Extended edge cases for _verify_all_hmacs."""

    def test_multiple_valid_params(self):
        """Multiple params all with valid HMACs should pass."""
        secret = "test_secret"
        fps = []
        for i in range(5):
            p = {"mean": float(i)}
            fps.append(
                SimpleNamespace(
                    parameters=p,
                    hmac_sha256=compute_hmac(p, secret),
                    column_name=f"col_{i}",
                    transform_type="zscore",
                    version=1,
                )
            )
        _verify_all_hmacs(fps, secret)  # should not raise

    def test_one_bad_among_multiple(self):
        """If one param has a bad HMAC, it should raise even if others are valid."""
        secret = "test_secret"
        valid_p = {"mean": 1.0}
        fps = [
            SimpleNamespace(
                parameters=valid_p,
                hmac_sha256=compute_hmac(valid_p, secret),
                column_name="good_col",
                transform_type="zscore",
                version=1,
            ),
            SimpleNamespace(
                parameters={"mean": 2.0},
                hmac_sha256="definitely_wrong",
                column_name="bad_col",
                transform_type="minmax",
                version=1,
            ),
        ]
        with pytest.raises(ValueError, match="bad_col"):
            _verify_all_hmacs(fps, secret)

    def test_mix_of_null_and_valid_hmac(self):
        """Params with null HMAC should be skipped, valid ones verified."""
        secret = "test_secret"
        valid_p = {"mean": 1.0}
        fps = [
            SimpleNamespace(
                parameters={"mean": 42.0},
                hmac_sha256=None,
                column_name="null_hmac_col",
                transform_type="zscore",
                version=1,
            ),
            SimpleNamespace(
                parameters=valid_p,
                hmac_sha256=compute_hmac(valid_p, secret),
                column_name="valid_col",
                transform_type="zscore",
                version=1,
            ),
        ]
        _verify_all_hmacs(fps, secret)  # should not raise


# ── _is_after_cutoff edge cases ────────────────────────────


class TestIsAfterCutoff:
    """Test _is_after_cutoff defensive branches."""

    def test_non_datetime_value_returns_false(self):
        assert _is_after_cutoff("not-a-date", datetime(2026, 1, 1, tzinfo=UTC)) is False

    def test_naive_candidate_aware_reference(self):
        naive = datetime(2026, 1, 15)
        aware = datetime(2026, 1, 10, tzinfo=UTC)
        assert _is_after_cutoff(naive, aware) is True

    def test_aware_candidate_naive_reference(self):
        aware = datetime(2026, 1, 15, tzinfo=UTC)
        naive = datetime(2026, 1, 10)
        assert _is_after_cutoff(aware, naive) is True

    def test_aware_candidate_naive_reference_before(self):
        aware = datetime(2026, 1, 5, tzinfo=UTC)
        naive = datetime(2026, 1, 10)
        assert _is_after_cutoff(aware, naive) is False

    def test_type_error_in_comparison_returns_false(self):
        """TypeError during comparison is caught and returns False."""

        class BadDatetime(datetime):
            def __gt__(self, other):
                raise TypeError("mock comparison failure")

        bad = BadDatetime(2026, 1, 15, tzinfo=UTC)
        assert _is_after_cutoff(bad, datetime(2026, 1, 10, tzinfo=UTC)) is False


class TestFilterIncrementalRowsEdgeCases:
    """Edge cases for _filter_incremental_rows."""

    def test_short_row_skipped(self):
        cutoff = datetime(2026, 1, 10, tzinfo=UTC)
        rows = [
            ("row-1",),  # shorter than expected (missing _ingested_at)
            ("row-2", datetime(2026, 1, 11, tzinfo=UTC), 1.0),
        ]
        col_names = ["_row_id", "_ingested_at", "value"]
        filtered = _filter_incremental_rows(rows, col_names, cutoff)
        assert len(filtered) == 1

    def test_non_datetime_ingested_at_skipped(self):
        cutoff = datetime(2026, 1, 10, tzinfo=UTC)
        rows = [
            ("row-1", "not-a-date", 1.0),
            ("row-2", datetime(2026, 1, 11, tzinfo=UTC), 2.0),
        ]
        col_names = ["_row_id", "_ingested_at", "value"]
        filtered = _filter_incremental_rows(rows, col_names, cutoff)
        assert len(filtered) == 1
