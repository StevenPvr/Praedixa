"""Integration tests for scripts/ingest_file.py CLI.

Covers:
- _parse_args: --file mode, --directory mode, --format flag, --sheet-name
- _parse_args: missing --dataset-id → SystemExit
- _parse_args: --file and --directory are mutually exclusive
- _ingest_single_file: successful CSV ingestion
- _ingest_single_file: file read error → False
- _ingest_single_file: empty file → False
- _ingest_single_file: parse error → False + log FAILED
- main: --file with non-existent path → sys.exit(1)
- main: --directory with no matching files → sys.exit(1)

Strategy:
  We mock the DB session factory, parse_file, map_columns, insert_raw_rows
  to test the CLI orchestration logic without a database. The service layer
  is already 100% covered by unit tests.
"""

import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.column_mapper import ColumnMapping, MappingResult
from app.services.file_parser import ParseResult
from app.services.raw_inserter import InsertionResult

# Fixed test IDs
DATASET_ID = uuid.UUID("dddddddd-0000-0000-0000-000000000001")
ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")


# ── Helpers ──────────────────────────────────────────────


def _make_dataset() -> SimpleNamespace:
    return SimpleNamespace(
        id=DATASET_ID,
        organization_id=ORG_ID,
        name="effectifs",
        schema_raw="acme_raw",
        schema_transformed="acme_transformed",
        table_name="effectifs",
    )


def _make_columns() -> list[SimpleNamespace]:
    return [
        SimpleNamespace(
            name="nom",
            dtype="text",
            role="feature",
            ordinal_position=0,
        ),
    ]


def _make_parse_result() -> ParseResult:
    return ParseResult(
        rows=[{"nom": "Dupont"}],
        source_columns=["nom"],
        detected_format="csv",
        detected_encoding="utf-8",
        warnings=[],
        row_count=1,
    )


def _make_mapping_result() -> MappingResult:
    return MappingResult(
        mappings=[
            ColumnMapping(
                source_column="nom",
                target_column="nom",
                confidence=1.0,
            ),
        ],
        unmapped_source=[],
        unmapped_target=[],
        warnings=[],
    )


def _make_insertion_result() -> InsertionResult:
    return InsertionResult(
        rows_inserted=1,
        batch_id=uuid.uuid4(),
        schema_name="acme_raw",
        table_name="effectifs",
        warnings=[],
    )


# ── _parse_args tests ───────────────────────────────────


class TestParseArgs:
    def test_file_mode(self) -> None:
        from scripts.ingest_file import _parse_args

        with patch(
            "sys.argv",
            ["ingest_file", "--dataset-id", str(DATASET_ID), "--file", "data.csv"],
        ):
            args = _parse_args()

        assert args.dataset_id == DATASET_ID
        assert args.file == Path("data.csv")
        assert args.directory is None
        assert args.format is None

    def test_directory_mode(self) -> None:
        from scripts.ingest_file import _parse_args

        with patch(
            "sys.argv",
            [
                "ingest_file",
                "--dataset-id",
                str(DATASET_ID),
                "--directory",
                "/tmp/data",  # noqa: S108  # nosec B108
            ],
        ):
            args = _parse_args()

        assert args.directory == Path("/tmp/data")  # noqa: S108  # nosec B108
        assert args.file is None

    def test_format_flag(self) -> None:
        from scripts.ingest_file import _parse_args

        with patch(
            "sys.argv",
            [
                "ingest_file",
                "--dataset-id",
                str(DATASET_ID),
                "--file",
                "data.csv",
                "--format",
                "lucca",
            ],
        ):
            args = _parse_args()

        assert args.format == "lucca"

    def test_sheet_name_flag(self) -> None:
        from scripts.ingest_file import _parse_args

        with patch(
            "sys.argv",
            [
                "ingest_file",
                "--dataset-id",
                str(DATASET_ID),
                "--file",
                "data.xlsx",
                "--sheet-name",
                "Feuille1",
            ],
        ):
            args = _parse_args()

        assert args.sheet_name == "Feuille1"

    def test_missing_dataset_id_exits(self) -> None:
        from scripts.ingest_file import _parse_args

        with (
            patch("sys.argv", ["ingest_file", "--file", "data.csv"]),
            pytest.raises(SystemExit),
        ):
            _parse_args()

    def test_file_and_directory_mutually_exclusive(self) -> None:
        from scripts.ingest_file import _parse_args

        with (
            patch(
                "sys.argv",
                [
                    "ingest_file",
                    "--dataset-id",
                    str(DATASET_ID),
                    "--file",
                    "a.csv",
                    "--directory",
                    "/tmp",  # noqa: S108  # nosec B108
                ],
            ),
            pytest.raises(SystemExit),
        ):
            _parse_args()


# ── _ingest_single_file tests ───────────────────────────


class TestIngestSingleFile:
    @patch("scripts.ingest_file._log_ingestion", new_callable=AsyncMock)
    @patch("scripts.ingest_file.insert_raw_rows")
    @patch("scripts.ingest_file.map_columns")
    @patch("scripts.ingest_file.parse_file")
    async def test_successful_csv_ingestion(
        self,
        mock_parse,
        mock_map,
        mock_insert,
        mock_log,
        tmp_path,
    ) -> None:
        from scripts.ingest_file import _ingest_single_file

        csv_file = tmp_path / "data.csv"
        csv_file.write_text("nom\nDupont\n")

        mock_parse.return_value = _make_parse_result()
        mock_map.return_value = _make_mapping_result()
        mock_insert.return_value = _make_insertion_result()
        mock_log.return_value = None

        result = await _ingest_single_file(
            file_path=csv_file,
            dataset=_make_dataset(),
            columns=_make_columns(),
            format_hint=None,
            sheet_name=None,
        )

        assert result is True
        mock_parse.assert_called_once()
        mock_insert.assert_called_once()
        # Success log should be called
        mock_log.assert_called_once()

    async def test_file_read_error_returns_false(self, tmp_path) -> None:
        from scripts.ingest_file import _ingest_single_file

        missing_file = tmp_path / "nonexistent.csv"

        result = await _ingest_single_file(
            file_path=missing_file,
            dataset=_make_dataset(),
            columns=_make_columns(),
            format_hint=None,
            sheet_name=None,
        )

        assert result is False

    async def test_empty_file_returns_false(self, tmp_path) -> None:
        from scripts.ingest_file import _ingest_single_file

        empty_file = tmp_path / "empty.csv"
        empty_file.write_bytes(b"")

        result = await _ingest_single_file(
            file_path=empty_file,
            dataset=_make_dataset(),
            columns=_make_columns(),
            format_hint=None,
            sheet_name=None,
        )

        assert result is False

    @patch("scripts.ingest_file._log_ingestion", new_callable=AsyncMock)
    @patch("scripts.ingest_file.parse_file")
    async def test_parse_error_returns_false_and_logs(
        self,
        mock_parse,
        mock_log,
        tmp_path,
    ) -> None:
        from scripts.ingest_file import _ingest_single_file

        csv_file = tmp_path / "bad.csv"
        csv_file.write_text("garbage content")

        mock_parse.side_effect = ValueError("Bad format")
        mock_log.return_value = None

        result = await _ingest_single_file(
            file_path=csv_file,
            dataset=_make_dataset(),
            columns=_make_columns(),
            format_hint=None,
            sheet_name=None,
        )

        assert result is False
        # Failure log should be created
        mock_log.assert_called_once()
        call_kwargs = mock_log.call_args
        # Status should be FAILED
        from app.models.data_catalog import RunStatus

        assert call_kwargs[0][4] == RunStatus.FAILED

    @patch("scripts.ingest_file._log_ingestion", new_callable=AsyncMock)
    @patch("scripts.ingest_file.insert_raw_rows")
    @patch("scripts.ingest_file.map_columns")
    @patch("scripts.ingest_file.parse_file")
    async def test_insert_error_returns_false_and_logs(
        self,
        mock_parse,
        mock_map,
        mock_insert,
        mock_log,
        tmp_path,
    ) -> None:
        from scripts.ingest_file import _ingest_single_file

        csv_file = tmp_path / "data.csv"
        csv_file.write_text("nom\nDupont\n")

        mock_parse.return_value = _make_parse_result()
        mock_map.return_value = _make_mapping_result()
        mock_insert.side_effect = Exception("DB error")
        mock_log.return_value = None

        result = await _ingest_single_file(
            file_path=csv_file,
            dataset=_make_dataset(),
            columns=_make_columns(),
            format_hint=None,
            sheet_name=None,
        )

        assert result is False
        mock_log.assert_called_once()


# ── main() orchestration tests ──────────────────────────


class TestMainOrchestration:
    @patch("scripts.ingest_file._load_dataset", new_callable=AsyncMock)
    async def test_nonexistent_file_exits(self, mock_load) -> None:
        from scripts.ingest_file import main

        mock_load.return_value = (_make_dataset(), _make_columns())

        with (
            patch(
                "sys.argv",
                [
                    "ingest_file",
                    "--dataset-id",
                    str(DATASET_ID),
                    "--file",
                    "/nonexistent/path.csv",
                ],
            ),
            pytest.raises(SystemExit) as exc_info,
        ):
            await main()

        assert exc_info.value.code == 1

    @patch("scripts.ingest_file._load_dataset", new_callable=AsyncMock)
    async def test_empty_directory_exits(self, mock_load, tmp_path) -> None:
        from scripts.ingest_file import main

        mock_load.return_value = (_make_dataset(), _make_columns())

        # Create an empty directory (no CSV/XLSX files)
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()

        with (
            patch(
                "sys.argv",
                [
                    "ingest_file",
                    "--dataset-id",
                    str(DATASET_ID),
                    "--directory",
                    str(empty_dir),
                ],
            ),
            pytest.raises(SystemExit) as exc_info,
        ):
            await main()

        assert exc_info.value.code == 1

    @patch("scripts.ingest_file._ingest_single_file", new_callable=AsyncMock)
    @patch("scripts.ingest_file._load_dataset", new_callable=AsyncMock)
    async def test_directory_mode_finds_csv_files(
        self, mock_load, mock_ingest, tmp_path
    ) -> None:
        from scripts.ingest_file import main

        mock_load.return_value = (_make_dataset(), _make_columns())
        mock_ingest.return_value = True

        # Create CSV files in directory
        data_dir = tmp_path / "files"
        data_dir.mkdir()
        (data_dir / "a.csv").write_text("nom\nA\n")
        (data_dir / "b.csv").write_text("nom\nB\n")
        (data_dir / "readme.txt").write_text("ignore me")

        with patch(
            "sys.argv",
            [
                "ingest_file",
                "--dataset-id",
                str(DATASET_ID),
                "--directory",
                str(data_dir),
            ],
        ):
            await main()

        # Should have ingested 2 CSV files, not the .txt
        assert mock_ingest.call_count == 2

    @patch("scripts.ingest_file._ingest_single_file", new_callable=AsyncMock)
    @patch("scripts.ingest_file._load_dataset", new_callable=AsyncMock)
    async def test_failure_count_causes_exit_1(
        self, mock_load, mock_ingest, tmp_path
    ) -> None:
        from scripts.ingest_file import main

        mock_load.return_value = (_make_dataset(), _make_columns())
        mock_ingest.return_value = False  # All ingestions fail

        csv_file = tmp_path / "data.csv"
        csv_file.write_text("nom\nDupont\n")

        with (
            patch(
                "sys.argv",
                [
                    "ingest_file",
                    "--dataset-id",
                    str(DATASET_ID),
                    "--file",
                    str(csv_file),
                ],
            ),
            pytest.raises(SystemExit) as exc_info,
        ):
            await main()

        assert exc_info.value.code == 1
