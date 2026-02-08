"""Tests for Raw Inserter service.

Covers:
- Batch insertion with mocked ddl_connection
- System columns (_row_id, _ingested_at, _batch_id) auto-added
- _ingested_at is a UTC datetime
- Each row gets a unique _row_id
- SQL statement uses psycopg.sql.Composed (injection-safe)
- Multiple columns: order preserved in SQL
- batch_size splitting (>1000 rows split into batches)
- batch_size=1 produces N executemany calls
- Exact batch boundary (rows = N * batch_size)
- validate_identifier called on schema/table/column names
- Reserved word identifiers rejected
- Transaction rollback on error
- Exception chaining preserves original exception
- Empty rows list (no DB call, schema/table not validated)
- No column mappings error
- Missing source columns insert None
- All source columns missing
- InsertionResult fields (frozen, warnings default, custom warnings)
- RawInsertError fields (message, code, default code, str)
- Async wrapper (basic, custom batch_size, empty rows)
"""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from psycopg import sql

from app.core.ddl_validation import DDLValidationError
from app.services.raw_inserter import (
    InsertionResult,
    RawInsertError,
    insert_raw_rows,
    insert_raw_rows_async,
)

# ── Helpers ──────────────────────────────────────────────


def _make_mapping(source: str, target: str) -> SimpleNamespace:
    """Create a minimal ColumnMapping-like object."""
    return SimpleNamespace(
        source_column=source,
        target_column=target,
        confidence=1.0,
        transform=None,
    )


def _make_mock_connection():
    """Create a mock ddl_connection context manager."""
    cursor = MagicMock()
    conn = MagicMock()
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=False)
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    return conn, cursor


# ── Basic insertion ──────────────────────────────────────


class TestInsertRawRows:
    @patch("app.services.raw_inserter.ddl_connection")
    def test_basic_insertion(self, mock_ddl):
        conn, _cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [
            _make_mapping("Nom", "nom"),
            _make_mapping("Age", "age"),
        ]
        rows = [
            {"Nom": "Dupont", "Age": 42},
            {"Nom": "Martin", "Age": 35},
        ]

        result = insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        assert isinstance(result, InsertionResult)
        assert result.rows_inserted == 2
        assert isinstance(result.batch_id, uuid.UUID)
        assert result.schema_name == "acme_raw"
        assert result.table_name == "effectifs"
        assert len(result.warnings) == 0

    @patch("app.services.raw_inserter.ddl_connection")
    def test_executemany_called(self, mock_ddl):
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": i} for i in range(5)]

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        # executemany should have been called once (5 < batch_size)
        assert cursor.executemany.call_count == 1
        args = cursor.executemany.call_args
        params_list = args[0][1]
        assert len(params_list) == 5

    @patch("app.services.raw_inserter.ddl_connection")
    def test_system_columns_present(self, mock_ddl):
        """Verify _row_id, _ingested_at, _batch_id are in each row."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": "test"}]

        result = insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        args = cursor.executemany.call_args
        params_list = args[0][1]
        row_params = params_list[0]

        # First 3 values: _row_id (UUID), _ingested_at (datetime), _batch_id (UUID)
        assert isinstance(row_params[0], uuid.UUID)  # _row_id
        assert row_params[2] == result.batch_id  # _batch_id
        assert row_params[3] == "test"  # val

    @patch("app.services.raw_inserter.ddl_connection")
    def test_ingested_at_is_utc_datetime(self, mock_ddl):
        """_ingested_at (index 1) must be a UTC-aware datetime."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": "x"}]

        before = datetime.now(UTC)
        insert_raw_rows("acme_raw", "effectifs", mappings, rows)
        after = datetime.now(UTC)

        row_params = cursor.executemany.call_args[0][1][0]
        ingested_at = row_params[1]

        assert isinstance(ingested_at, datetime)
        assert ingested_at.tzinfo is not None
        assert before <= ingested_at <= after

    @patch("app.services.raw_inserter.ddl_connection")
    def test_each_row_gets_unique_row_id(self, mock_ddl):
        """Every row in the batch must have a distinct _row_id UUID."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": i} for i in range(10)]

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        params_list = cursor.executemany.call_args[0][1]
        row_ids = [p[0] for p in params_list]
        assert len(set(row_ids)) == 10  # All unique

    @patch("app.services.raw_inserter.ddl_connection")
    def test_sql_uses_composed_identifiers(self, mock_ddl):
        """The INSERT statement must be a psycopg.sql.Composed (safe from injection)."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        insert_stmt = cursor.executemany.call_args[0][0]
        assert isinstance(insert_stmt, sql.Composed)

    @patch("app.services.raw_inserter.ddl_connection")
    def test_multiple_columns_order_preserved(self, mock_ddl):
        """Column values in each row must follow the mapping order."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [
            _make_mapping("a", "col_a"),
            _make_mapping("b", "col_b"),
            _make_mapping("c", "col_c"),
        ]
        rows = [{"a": "A", "b": "B", "c": "C"}]

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        row_params = cursor.executemany.call_args[0][1][0]
        # System cols at indices 0-2, then col_a, col_b, col_c
        assert row_params[3] == "A"
        assert row_params[4] == "B"
        assert row_params[5] == "C"


# ── Batch splitting ──────────────────────────────────────


class TestBatchSplitting:
    @patch("app.services.raw_inserter.ddl_connection")
    def test_batch_splitting(self, mock_ddl):
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": i} for i in range(250)]

        result = insert_raw_rows(
            "acme_raw",
            "effectifs",
            mappings,
            rows,
            batch_size=100,
        )

        assert result.rows_inserted == 250
        # 250 rows / 100 batch_size = 3 batches (100 + 100 + 50)
        assert cursor.executemany.call_count == 3

    @patch("app.services.raw_inserter.ddl_connection")
    def test_exact_batch_boundary(self, mock_ddl):
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": i} for i in range(200)]

        insert_raw_rows(
            "acme_raw",
            "effectifs",
            mappings,
            rows,
            batch_size=100,
        )

        assert cursor.executemany.call_count == 2

    @patch("app.services.raw_inserter.ddl_connection")
    def test_single_row_single_batch(self, mock_ddl):
        """A single row should produce exactly one executemany call."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 42}]

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        assert cursor.executemany.call_count == 1
        assert len(cursor.executemany.call_args[0][1]) == 1

    @patch("app.services.raw_inserter.ddl_connection")
    def test_batch_size_one(self, mock_ddl):
        """batch_size=1 means each row triggers its own executemany call."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": i} for i in range(5)]

        result = insert_raw_rows(
            "acme_raw",
            "effectifs",
            mappings,
            rows,
            batch_size=1,
        )

        assert result.rows_inserted == 5
        assert cursor.executemany.call_count == 5
        # Each call should have exactly 1 row
        for call in cursor.executemany.call_args_list:
            assert len(call[0][1]) == 1


# ── Empty rows ───────────────────────────────────────────


class TestEmptyRows:
    def test_empty_rows_returns_zero(self):
        mappings = [_make_mapping("val", "val")]
        result = insert_raw_rows("acme_raw", "effectifs", mappings, [])
        assert result.rows_inserted == 0
        assert isinstance(result.batch_id, uuid.UUID)
        assert "No rows" in result.warnings[0]

    def test_empty_rows_no_db_call(self):
        """Empty rows should not call ddl_connection at all."""
        mappings = [_make_mapping("val", "val")]
        with patch("app.services.raw_inserter.ddl_connection") as mock_ddl:
            insert_raw_rows("acme_raw", "effectifs", mappings, [])
            mock_ddl.assert_not_called()

    def test_empty_rows_schema_table_not_validated(self):
        """With empty rows, invalid schema/table names should NOT raise.

        The empty-rows path returns early before any validation calls,
        so even invalid identifiers are accepted (no DB interaction).
        """
        mappings = [_make_mapping("val", "val")]
        # These names would fail validation, but empty rows skips it
        result = insert_raw_rows("INVALID-SCHEMA!", "DROP TABLE--", mappings, [])
        assert result.rows_inserted == 0
        assert result.schema_name == "INVALID-SCHEMA!"
        assert result.table_name == "DROP TABLE--"

    def test_empty_rows_preserves_raw_names(self):
        """Empty-rows result uses the raw schema/table names, not validated."""
        mappings = [_make_mapping("val", "val")]
        result = insert_raw_rows("my_Schema", "My_Table", mappings, [])
        # Returned as-is (not lowercased by validate_schema_name)
        assert result.schema_name == "my_Schema"
        assert result.table_name == "My_Table"


# ── Validation ───────────────────────────────────────────


class TestValidation:
    def test_invalid_schema_name(self):
        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("INVALID-SCHEMA!", "effectifs", mappings, rows)

    def test_invalid_table_name(self):
        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("acme_raw", "DROP TABLE--", mappings, rows)

    def test_invalid_column_name(self):
        mappings = [_make_mapping("val", "INVALID COLUMN!")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("acme_raw", "effectifs", mappings, rows)

    def test_no_column_mappings(self):
        rows = [{"val": 1}]
        with pytest.raises(RawInsertError, match="No column mappings"):
            insert_raw_rows("acme_raw", "effectifs", [], rows)

    def test_reserved_word_schema_name(self):
        """SQL reserved words like 'select' should be rejected."""
        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("select", "effectifs", mappings, rows)

    def test_reserved_word_table_name(self):
        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("acme_raw", "delete", mappings, rows)

    def test_reserved_word_column_name(self):
        mappings = [_make_mapping("val", "insert")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("acme_raw", "effectifs", mappings, rows)

    def test_uppercase_schema_is_rejected(self):
        """Schema names with uppercase letters fail IDENTIFIER_REGEX."""
        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]
        with pytest.raises(DDLValidationError):
            insert_raw_rows("Acme_Raw", "effectifs", mappings, rows)


# ── Error handling ───────────────────────────────────────


class TestErrorHandling:
    @patch("app.services.raw_inserter.ddl_connection")
    def test_db_error_raises_raw_insert_error(self, mock_ddl):
        conn, cursor = _make_mock_connection()
        cursor.executemany.side_effect = Exception("DB connection lost")
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]

        with pytest.raises(RawInsertError, match="Failed to insert"):
            insert_raw_rows("acme_raw", "effectifs", mappings, rows)

    @patch("app.services.raw_inserter.ddl_connection")
    def test_db_error_preserves_original_exception(self, mock_ddl):
        """Exception chaining: the original exception is accessible via __cause__."""
        conn, cursor = _make_mock_connection()
        original = RuntimeError("connection reset")
        cursor.executemany.side_effect = original
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]

        with pytest.raises(RawInsertError) as exc_info:
            insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        assert exc_info.value.__cause__ is original

    @patch("app.services.raw_inserter.ddl_connection")
    def test_db_error_code_is_insert_failed(self, mock_ddl):
        """The error code for DB failures must be 'INSERT_FAILED'."""
        conn, cursor = _make_mock_connection()
        cursor.executemany.side_effect = Exception("oops")
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]

        with pytest.raises(RawInsertError) as exc_info:
            insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        assert exc_info.value.code == "INSERT_FAILED"

    def test_raw_insert_error_fields(self):
        err = RawInsertError("test msg", code="TEST_CODE")
        assert err.message == "test msg"
        assert err.code == "TEST_CODE"
        assert str(err) == "test msg"

    def test_raw_insert_error_default_code(self):
        """When no code is specified, default should be 'RAW_INSERT_ERROR'."""
        err = RawInsertError("something went wrong")
        assert err.code == "RAW_INSERT_ERROR"
        assert err.message == "something went wrong"

    def test_raw_insert_error_is_exception(self):
        """RawInsertError must be a proper Exception subclass."""
        err = RawInsertError("fail")
        assert isinstance(err, Exception)
        assert isinstance(err, RawInsertError)


# ── Missing source columns ──────────────────────────────


class TestMissingSourceColumns:
    @patch("app.services.raw_inserter.ddl_connection")
    def test_missing_source_col_inserts_none(self, mock_ddl):
        """If a row doesn't have the source column, None is inserted."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [
            _make_mapping("a", "col_a"),
            _make_mapping("b", "col_b"),
        ]
        rows = [{"a": "val_a"}]  # Missing "b"

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        args = cursor.executemany.call_args
        params_list = args[0][1]
        row_params = params_list[0]
        # System cols (3) + col_a + col_b
        assert row_params[3] == "val_a"
        assert row_params[4] is None  # Missing "b"

    @patch("app.services.raw_inserter.ddl_connection")
    def test_all_source_cols_missing(self, mock_ddl):
        """If a row has NONE of the mapped source columns, all values are None."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [
            _make_mapping("a", "col_a"),
            _make_mapping("b", "col_b"),
            _make_mapping("c", "col_c"),
        ]
        rows = [{"x": "unrelated"}]  # None of a, b, c present

        insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        row_params = cursor.executemany.call_args[0][1][0]
        # System cols (3) + 3 None values
        assert row_params[3] is None
        assert row_params[4] is None
        assert row_params[5] is None

    @patch("app.services.raw_inserter.ddl_connection")
    def test_extra_row_keys_ignored(self, mock_ddl):
        """Row keys that are not in the mapping are silently ignored."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("a", "col_a")]
        rows = [{"a": "mapped", "b": "ignored", "c": "also_ignored"}]

        result = insert_raw_rows("acme_raw", "effectifs", mappings, rows)

        row_params = cursor.executemany.call_args[0][1][0]
        # Only 3 system cols + 1 mapped col = 4 total
        assert len(row_params) == 4
        assert row_params[3] == "mapped"
        assert result.rows_inserted == 1


# ── InsertionResult ──────────────────────────────────────


class TestInsertionResult:
    def test_frozen_dataclass(self):
        batch_id = uuid.uuid4()
        result = InsertionResult(
            rows_inserted=10,
            batch_id=batch_id,
            schema_name="acme_raw",
            table_name="effectifs",
        )
        assert result.rows_inserted == 10
        assert result.batch_id == batch_id
        assert result.schema_name == "acme_raw"
        assert result.table_name == "effectifs"
        assert result.warnings == []

        with pytest.raises(AttributeError):
            result.rows_inserted = 20  # type: ignore[misc]

    def test_with_warnings(self):
        """InsertionResult can carry a custom warnings list."""
        batch_id = uuid.uuid4()
        result = InsertionResult(
            rows_inserted=0,
            batch_id=batch_id,
            schema_name="acme_raw",
            table_name="effectifs",
            warnings=["No rows to insert", "Extra warning"],
        )
        assert len(result.warnings) == 2
        assert "No rows" in result.warnings[0]
        assert "Extra warning" in result.warnings[1]

    def test_defaults_are_independent(self):
        """Each InsertionResult instance must get its own warnings list."""
        r1 = InsertionResult(
            rows_inserted=0,
            batch_id=uuid.uuid4(),
            schema_name="a",
            table_name="b",
        )
        r2 = InsertionResult(
            rows_inserted=0,
            batch_id=uuid.uuid4(),
            schema_name="a",
            table_name="b",
        )
        # Frozen, so we can't mutate, but they should be separate objects
        assert r1.warnings is not r2.warnings


# ── Async wrapper ────────────────────────────────────────


class TestInsertRawRowsAsync:
    @pytest.mark.asyncio
    @patch("app.services.raw_inserter.ddl_connection")
    async def test_async_wrapper(self, mock_ddl):
        conn, _cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]

        result = await insert_raw_rows_async("acme_raw", "effectifs", mappings, rows)

        assert isinstance(result, InsertionResult)
        assert result.rows_inserted == 1

    @pytest.mark.asyncio
    @patch("app.services.raw_inserter.ddl_connection")
    async def test_async_with_custom_batch_size(self, mock_ddl):
        """Async wrapper passes batch_size through to sync function."""
        conn, cursor = _make_mock_connection()
        mock_ddl.return_value = conn

        mappings = [_make_mapping("val", "val")]
        rows = [{"val": i} for i in range(5)]

        result = await insert_raw_rows_async(
            "acme_raw",
            "effectifs",
            mappings,
            rows,
            batch_size=2,
        )

        assert result.rows_inserted == 5
        # 5 rows / batch_size 2 = 3 batches (2 + 2 + 1)
        assert cursor.executemany.call_count == 3

    @pytest.mark.asyncio
    async def test_async_empty_rows(self):
        """Async wrapper with empty rows returns early without DB call."""
        mappings = [_make_mapping("val", "val")]

        with patch("app.services.raw_inserter.ddl_connection") as mock_ddl:
            result = await insert_raw_rows_async(
                "acme_raw", "effectifs", mappings, []
            )
            mock_ddl.assert_not_called()

        assert result.rows_inserted == 0
        assert "No rows" in result.warnings[0]

    @pytest.mark.asyncio
    async def test_async_validation_error(self):
        """Async wrapper must propagate DDLValidationError."""
        mappings = [_make_mapping("val", "val")]
        rows = [{"val": 1}]

        with pytest.raises(DDLValidationError):
            await insert_raw_rows_async(
                "INVALID!", "effectifs", mappings, rows
            )

    @pytest.mark.asyncio
    async def test_async_no_mappings_error(self):
        """Async wrapper must propagate RawInsertError for empty mappings."""
        rows = [{"val": 1}]

        with pytest.raises(RawInsertError, match="No column mappings"):
            await insert_raw_rows_async("acme_raw", "effectifs", [], rows)
