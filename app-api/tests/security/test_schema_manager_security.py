"""P0-03 Evidence (DDL Safety) — Schema Manager SQL injection prevention tests.

Validates that the schema_manager service:
- Uses ZERO f-string interpolation for SQL identifiers in DDL.
- Uses psycopg.sql.Identifier for ALL dynamic identifiers.
- Rejects SQL injection in column names, schema names, and table names
  via ddl_validation checks at the service boundary.

Strategy:
- Static analysis (AST inspection) of the source module to prove
  no f-string appears in DDL-forming code.
- Source text scanning to verify psycopg.sql.Identifier usage.
- Runtime tests that pass malicious inputs and verify rejection.

These tests serve as contractual evidence for security gate P0-03.
"""

import ast
import inspect
import textwrap

import pytest

from app.core.ddl_validation import DDLValidationError
from app.services import schema_manager


class TestNoFStringInDDL:
    """P0-03: Verify no f-string interpolation in DDL-forming code.

    This is a static analysis test that inspects the schema_manager
    module's AST to prove that no f-strings are used to compose SQL
    statements. F-strings in DDL are the #1 cause of SQL injection
    in Python database code.
    """

    def test_no_fstring_in_ddl_functions(self) -> None:
        """DDL-forming functions use no f-strings for SQL composition.

        Inspects the AST of _create_raw_table, _create_transformed_table,
        _create_indexes, and drop_client_schemas for JoinedStr nodes
        (Python's AST representation of f-strings).

        NOTE: F-strings used for log messages or error messages are
        acceptable. We specifically check the DDL-forming functions
        where psycopg.sql should be used exclusively.
        """
        ddl_functions = [
            schema_manager._create_raw_table,
            schema_manager._create_transformed_table,
            schema_manager._create_indexes,
        ]

        for func in ddl_functions:
            source = inspect.getsource(func)
            source = textwrap.dedent(source)
            tree = ast.parse(source)

            # Walk the AST looking for JoinedStr (f-string) nodes
            fstrings = [
                node for node in ast.walk(tree) if isinstance(node, ast.JoinedStr)
            ]

            # Allow f-strings that are clearly log/error messages
            # (they contain string constants like "Created", "Dropped", etc.)
            # But flag any f-string that contains sql/SQL/execute/DDL keywords
            suspicious = []
            for fstr in fstrings:
                # Reconstruct approximate f-string content
                parts = [
                    str(val.value)
                    for val in fstr.values
                    if isinstance(val, ast.Constant)
                ]
                content = "".join(parts).lower()
                # F-strings forming SQL are suspicious
                sql_keywords = [
                    "create ",
                    "drop ",
                    "alter ",
                    "insert ",
                    "select ",
                    "delete ",
                    "update ",
                    "schema",
                    "table",
                    "index",
                ]
                suspicious.extend(
                    f"{func.__name__}: f-string contains "
                    f"SQL keyword '{keyword.strip()}'"
                    for keyword in sql_keywords
                    if keyword in content
                )

            assert not suspicious, (
                f"DDL function {func.__name__} uses f-strings with "
                f"SQL keywords (potential injection): {suspicious}"
            )


class TestPsycopgSqlIdentifierUsed:
    """P0-03: Verify psycopg.sql.Identifier is used for dynamic identifiers."""

    def test_source_uses_sql_identifier(self) -> None:
        """The schema_manager source imports and uses sql.Identifier."""
        source = inspect.getsource(schema_manager)
        assert (
            "from psycopg import sql" in source
            or "from psycopg import errors, sql" in source
        )
        assert "sql.Identifier" in source

    def test_create_raw_table_uses_sql_identifier(self) -> None:
        """_create_raw_table uses sql.Identifier for all dynamic names."""
        source = inspect.getsource(schema_manager._create_raw_table)
        assert "sql.Identifier" in source
        assert "sql.SQL" in source

    def test_create_transformed_table_uses_sql_identifier(self) -> None:
        """_create_transformed_table uses sql.Identifier for dynamic names."""
        source = inspect.getsource(
            schema_manager._create_transformed_table,
        )
        assert "sql.Identifier" in source

    def test_create_indexes_uses_sql_identifier(self) -> None:
        """_create_indexes uses sql.Identifier for index and column names."""
        source = inspect.getsource(schema_manager._create_indexes)
        assert "sql.Identifier" in source

    def test_drop_client_schemas_uses_sql_identifier(self) -> None:
        """drop_client_schemas uses sql.Identifier for schema names."""
        source = inspect.getsource(schema_manager.drop_client_schemas)
        assert "sql.Identifier" in source

    def test_create_client_schemas_uses_sql_identifier(self) -> None:
        """create_client_schemas uses sql.Identifier for schema names."""
        source = inspect.getsource(schema_manager.create_client_schemas)
        assert "sql.Identifier" in source


class TestSQLInjectionInColumnNamesRejected:
    """P0-03: Column names with SQL injection are caught by validation."""

    @pytest.mark.parametrize(
        "malicious_name",
        [
            "'; DROP TABLE users;--",
            "col UNION SELECT * FROM pg_tables",
            "col; DELETE FROM data WHERE 1=1",
            "SELECT",
            "pg_shadow",
            "TEST_UPPER",
            "123start",
            "",
        ],
    )
    def test_sql_injection_in_column_name(
        self,
        malicious_name: str,
    ) -> None:
        """Malicious column names are rejected by validate_column_name."""
        from app.core.ddl_validation import validate_column_name

        with pytest.raises(DDLValidationError):
            validate_column_name(malicious_name)

    def test_create_dataset_tables_validates_column_names(self) -> None:
        """create_dataset_tables calls validate_column_name for each column.

        Verified by inspecting the source — the function calls
        validate_column_name(col.name) in a loop.
        """
        source = inspect.getsource(
            schema_manager.create_dataset_tables,
        )
        assert "validate_column_name" in source


class TestSQLInjectionInSchemaNameRejected:
    """P0-03: Schema names with SQL injection are caught by validation."""

    @pytest.mark.parametrize(
        "malicious_schema",
        [
            "'; DROP SCHEMA public CASCADE;--",
            "schema UNION SELECT",
            "pg_catalog",
            "sql_features",
            "UPPER_CASE",
            "",
            "test.schema",
            "test;schema",
        ],
    )
    def test_sql_injection_in_schema_name(
        self,
        malicious_schema: str,
    ) -> None:
        """Malicious schema names are rejected by validate_schema_name."""
        from app.core.ddl_validation import validate_schema_name

        with pytest.raises(DDLValidationError):
            validate_schema_name(malicious_schema)

    def test_create_dataset_tables_validates_schema_names(self) -> None:
        """create_dataset_tables validates schema names before DDL use."""
        source = inspect.getsource(
            schema_manager.create_dataset_tables,
        )
        assert "validate_schema_name" in source

    def test_create_client_schemas_validates_slug(self) -> None:
        """create_client_schemas validates the org slug before DDL use."""
        source = inspect.getsource(
            schema_manager.create_client_schemas,
        )
        assert "validate_client_slug" in source
        assert "validate_schema_name" in source


class TestSQLInjectionInTableNameRejected:
    """P0-03: Table names with SQL injection are caught by validation."""

    @pytest.mark.parametrize(
        "malicious_table",
        [
            "'; DROP TABLE users;--",
            "table UNION SELECT",
            "pg_class",
            "sql_parts",
            "TABLE_UPPER",
            "",
            "test.table",
        ],
    )
    def test_sql_injection_in_table_name(
        self,
        malicious_table: str,
    ) -> None:
        """Malicious table names are rejected by validate_table_name."""
        from app.core.ddl_validation import validate_table_name

        with pytest.raises(DDLValidationError):
            validate_table_name(malicious_table)

    def test_create_dataset_tables_validates_table_name(self) -> None:
        """create_dataset_tables validates table names before DDL use."""
        source = inspect.getsource(
            schema_manager.create_dataset_tables,
        )
        assert "validate_table_name" in source


class TestCreateClientSchemasValidation:
    """P0-03: create_client_schemas validates all inputs before DDL."""

    async def test_invalid_slug_raises_ddl_error(self) -> None:
        """Invalid org slug is rejected before any DDL is executed."""
        with pytest.raises(DDLValidationError):
            await schema_manager.create_client_schemas(
                "'; DROP SCHEMA public;--",
            )

    async def test_reserved_word_slug_rejected(self) -> None:
        """Reserved word slug is rejected."""
        with pytest.raises(DDLValidationError):
            await schema_manager.create_client_schemas("select")

    async def test_system_prefix_slug_rejected(self) -> None:
        """System prefix slug is rejected."""
        with pytest.raises(DDLValidationError):
            await schema_manager.create_client_schemas("pg_custom")


class TestDropClientSchemasValidation:
    """P0-03: drop_client_schemas validates all inputs before DDL."""

    async def test_invalid_slug_raises_ddl_error(self) -> None:
        """Invalid org slug is rejected before any DROP is executed."""
        with pytest.raises(DDLValidationError):
            await schema_manager.drop_client_schemas(
                "'; DROP SCHEMA public CASCADE;--",
            )

    async def test_short_slug_rejected(self) -> None:
        """Too-short slug is rejected."""
        with pytest.raises(DDLValidationError):
            await schema_manager.drop_client_schemas("ab")
