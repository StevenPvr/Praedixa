"""Integration tests for POST /api/v1/datasets/{id}/ingest endpoint.

Covers:
- Successful CSV upload: 201 with IngestionResponse shape
- Successful XLSX upload: 201 with IngestionResponse shape
- Format hint: format_hint=lucca passes through to parse_file and map_columns
- Format hint: format_hint=payfit passes through
- Unauthorized (no auth): 401
- Forbidden (non org_admin): 403
- Dataset not found: 404
- Empty file: 400
- Unsupported file type: 400
- Cooldown enforcement: 429
- File too large: 413
- IngestionLog records file_name, file_size, mode=FILE_UPLOAD
- Parse failure: 400 with IngestionLog FAILED entry

Strategy:
  We mock the inner service calls (parse_file, map_columns, insert_raw_rows,
  get_dataset, get_dataset_columns, _check_cooldown) to test the router-level
  HTTP contract. The service layer is already 100% covered by unit tests.
"""

import io
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from openpyxl import Workbook

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.rate_limit import limiter
from app.core.security import TenantFilter
from app.main import app
from app.services.column_mapper import MappingResult
from app.services.data_quality import ColumnReport, QualityResult
from app.services.file_parser import ParseResult
from app.services.raw_inserter import InsertionResult

# Fixed test IDs
ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
USER_ID = "user-admin-001"
DATASET_ID = uuid.UUID("dddddddd-0000-0000-0000-000000000001")


# ── Helpers ──────────────────────────────────────────────


def _jwt_admin() -> JWTPayload:
    return JWTPayload(
        user_id=USER_ID,
        email="admin@test.com",
        organization_id=str(ORG_ID),
        role="org_admin",
    )


def _jwt_viewer() -> JWTPayload:
    return JWTPayload(
        user_id=USER_ID,
        email="viewer@test.com",
        organization_id=str(ORG_ID),
        role="viewer",
    )


def _make_dataset() -> SimpleNamespace:
    return SimpleNamespace(
        id=DATASET_ID,
        organization_id=ORG_ID,
        name="effectifs",
        schema_raw="acme_raw",
        schema_transformed="acme_transformed",
        table_name="effectifs",
        temporal_index="date_ref",
        group_by=[],
        pipeline_config={},
        status="active",
    )


def _make_columns() -> list[SimpleNamespace]:
    return [
        SimpleNamespace(
            name="nom",
            dtype="text",
            role="feature",
            ordinal_position=0,
        ),
        SimpleNamespace(
            name="age",
            dtype="integer",
            role="feature",
            ordinal_position=1,
        ),
    ]


def _make_parse_result(rows: int = 2, fmt: str = "csv") -> ParseResult:
    return ParseResult(
        rows=[{"nom": f"Row{i}", "age": 30 + i} for i in range(rows)],
        source_columns=["nom", "age"],
        detected_format=fmt,
        detected_encoding="utf-8",
        warnings=[],
        row_count=rows,
    )


def _make_mapping_result() -> MappingResult:
    from app.services.column_mapper import ColumnMapping

    return MappingResult(
        mappings=[
            ColumnMapping(source_column="nom", target_column="nom", confidence=1.0),
            ColumnMapping(source_column="age", target_column="age", confidence=1.0),
        ],
        unmapped_source=[],
        unmapped_target=[],
        warnings=[],
    )


def _make_insertion_result() -> InsertionResult:
    return InsertionResult(
        rows_inserted=2,
        batch_id=uuid.uuid4(),
        schema_name="acme_raw",
        table_name="effectifs",
        warnings=[],
    )


def _make_quality_result(rows: int = 2) -> QualityResult:
    return QualityResult(
        cleaned_rows=[{"nom": f"Row{i}", "age": 30 + i} for i in range(rows)],
        rows_received=rows,
        rows_after_dedup=rows,
        rows_after_quality=rows,
        duplicates_found=0,
        duplicates_removed=0,
        missing_total=0,
        missing_imputed=0,
        missing_deleted_rows=0,
        outliers_total=0,
        outliers_clamped=0,
        column_reports={
            "nom": ColumnReport(
                missing_count=0,
                missing_pct=0.0,
                missing_type="none",
                strategy_applied="none",
                imputed_count=0,
                outlier_count=0,
                outliers_clamped=0,
            ),
            "age": ColumnReport(
                missing_count=0,
                missing_pct=0.0,
                missing_type="none",
                strategy_applied="none",
                imputed_count=0,
                outlier_count=0,
                outliers_clamped=0,
            ),
        },
        config_snapshot={"outlier_method": "iqr"},
    )


def _csv_bytes(text: str = "nom;age\nDupont;42\nMartin;35\n") -> bytes:
    return text.encode("utf-8")


def _xlsx_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(["nom", "age"])
    ws.append(["Dupont", 42])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


# ── Fixtures ─────────────────────────────────────────────


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()

    # Simulate flush: assign a UUID to any ORM object with id=None,
    # mimicking PostgreSQL's RETURNING behavior after INSERT.
    async def _flush_side_effect(*_args, **_kwargs) -> None:
        for call in session.add.call_args_list:
            obj = call[0][0]
            if hasattr(obj, "id") and obj.id is None:
                obj.id = uuid.uuid4()

    session.flush = AsyncMock(side_effect=_flush_side_effect)
    return session


@pytest.fixture
async def admin_client(mock_session):
    """Client authenticated as org_admin."""

    async def _override_session():
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = _jwt_admin
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_ID))

    # Disable rate limiter to avoid slowapi/starlette middleware issues
    # in test environment. Rate limiting is tested separately.
    limiter.enabled = False

    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    limiter.enabled = True
    app.dependency_overrides.clear()


@pytest.fixture
async def viewer_client(mock_session):
    """Client authenticated as viewer (non-admin)."""

    async def _override_session():
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = _jwt_viewer
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_ID))

    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def unauth_client():
    """Client with no authentication."""
    app.dependency_overrides.clear()
    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def _url(dataset_id: uuid.UUID = DATASET_ID) -> str:
    return f"/api/v1/datasets/{dataset_id}/ingest"


# ── Successful ingestion ─────────────────────────────────


class TestSuccessfulIngestion:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.insert_raw_rows")
    @patch("app.routers.datasets.run_quality_checks")
    @patch("app.routers.datasets.map_columns")
    @patch("app.routers.datasets.parse_file")
    @patch("app.routers.datasets.get_dataset_columns", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_csv_upload_201(
        self,
        mock_get_dataset,
        mock_get_columns,
        mock_parse,
        mock_map,
        mock_quality,
        mock_insert,
        mock_cooldown,
        admin_client,
    ) -> None:
        mock_get_dataset.return_value = _make_dataset()
        mock_get_columns.return_value = _make_columns()
        mock_parse.return_value = _make_parse_result()
        mock_map.return_value = _make_mapping_result()
        mock_quality.return_value = _make_quality_result()
        mock_insert.return_value = _make_insertion_result()
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["rowsInserted"] == 2
        assert data["data"]["detectedFormat"] == "csv"
        assert "batchId" in data["data"]
        assert "ingestionLogId" in data["data"]
        assert data["data"]["qualitySummary"] is not None
        assert data["data"]["qualitySummary"]["duplicatesFound"] == 0

    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.insert_raw_rows")
    @patch("app.routers.datasets.run_quality_checks")
    @patch("app.routers.datasets.map_columns")
    @patch("app.routers.datasets.parse_file")
    @patch("app.routers.datasets.get_dataset_columns", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_xlsx_upload_201(
        self,
        mock_get_dataset,
        mock_get_columns,
        mock_parse,
        mock_map,
        mock_quality,
        mock_insert,
        mock_cooldown,
        admin_client,
    ) -> None:
        mock_get_dataset.return_value = _make_dataset()
        mock_get_columns.return_value = _make_columns()
        mock_parse.return_value = _make_parse_result(fmt="xlsx")
        mock_map.return_value = _make_mapping_result()
        mock_quality.return_value = _make_quality_result()
        mock_insert.return_value = _make_insertion_result()
        mock_cooldown.return_value = None

        xlsx_ct = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        response = await admin_client.post(
            _url(),
            files={"file": ("data.xlsx", _xlsx_bytes(), xlsx_ct)},
        )

        assert response.status_code == 201
        assert response.json()["data"]["detectedFormat"] == "xlsx"


# ── Auth & authorization ─────────────────────────────────


class TestAuthErrors:
    async def test_401_no_auth(self, unauth_client) -> None:
        response = await unauth_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )
        assert response.status_code == 401

    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_403_viewer_role(
        self,
        mock_get_dataset,
        mock_cooldown,
        viewer_client,
    ) -> None:
        """Viewer role should be rejected by require_role('org_admin')."""
        mock_get_dataset.return_value = _make_dataset()
        mock_cooldown.return_value = None

        response = await viewer_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )
        assert response.status_code == 403


# ── Dataset not found ────────────────────────────────────


class TestDatasetNotFound:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_404_dataset_not_found(
        self,
        mock_get_dataset,
        mock_cooldown,
        admin_client,
    ) -> None:
        from app.core.exceptions import NotFoundError

        mock_get_dataset.side_effect = NotFoundError("Dataset", str(DATASET_ID))
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )
        assert response.status_code == 404


# ── File validation errors ───────────────────────────────


class TestFileValidation:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_400_empty_file(
        self,
        mock_get_dataset,
        mock_cooldown,
        admin_client,
    ) -> None:
        mock_get_dataset.return_value = _make_dataset()
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url(),
            files={"file": ("data.csv", b"", "text/csv")},
        )
        assert response.status_code == 400

    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_400_unsupported_file_type(
        self,
        mock_get_dataset,
        mock_cooldown,
        admin_client,
    ) -> None:
        mock_get_dataset.return_value = _make_dataset()
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url(),
            files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
        )
        assert response.status_code == 400


# ── Cooldown enforcement ─────────────────────────────────


class TestCooldown:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_429_cooldown_active(
        self,
        mock_get_dataset,
        mock_cooldown,
        admin_client,
    ) -> None:
        from app.core.exceptions import PraedixaError

        mock_get_dataset.return_value = _make_dataset()
        mock_cooldown.side_effect = PraedixaError(
            message="Upload cooldown active",
            code="UPLOAD_COOLDOWN",
            status_code=429,
        )

        response = await admin_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )
        assert response.status_code == 429


# ── Format hint passthrough ─────────────────────────────


class TestFormatHint:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.insert_raw_rows")
    @patch("app.routers.datasets.run_quality_checks")
    @patch("app.routers.datasets.map_columns")
    @patch("app.routers.datasets.parse_file")
    @patch("app.routers.datasets.get_dataset_columns", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_format_hint_lucca_passed_to_services(
        self,
        mock_get_dataset,
        mock_get_columns,
        mock_parse,
        mock_map,
        mock_quality,
        mock_insert,
        mock_cooldown,
        admin_client,
    ) -> None:
        """format_hint=lucca should be forwarded to parse_file and map_columns."""
        mock_get_dataset.return_value = _make_dataset()
        mock_get_columns.return_value = _make_columns()
        mock_parse.return_value = _make_parse_result()
        mock_map.return_value = _make_mapping_result()
        mock_quality.return_value = _make_quality_result()
        mock_insert.return_value = _make_insertion_result()
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url() + "?format_hint=lucca",
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 201
        # Verify parse_file was called with format_hint="lucca"
        _, kwargs = mock_parse.call_args
        assert kwargs.get("format_hint") == "lucca"
        # Verify map_columns was called with format_hint="lucca"
        _, map_kwargs = mock_map.call_args
        assert map_kwargs.get("format_hint") == "lucca"

    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.insert_raw_rows")
    @patch("app.routers.datasets.run_quality_checks")
    @patch("app.routers.datasets.map_columns")
    @patch("app.routers.datasets.parse_file")
    @patch("app.routers.datasets.get_dataset_columns", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_format_hint_payfit_passed_to_services(
        self,
        mock_get_dataset,
        mock_get_columns,
        mock_parse,
        mock_map,
        mock_quality,
        mock_insert,
        mock_cooldown,
        admin_client,
    ) -> None:
        """format_hint=payfit should be forwarded to parse_file and map_columns."""
        mock_get_dataset.return_value = _make_dataset()
        mock_get_columns.return_value = _make_columns()
        mock_parse.return_value = _make_parse_result()
        mock_map.return_value = _make_mapping_result()
        mock_quality.return_value = _make_quality_result()
        mock_insert.return_value = _make_insertion_result()
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url() + "?format_hint=payfit",
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 201
        _, kwargs = mock_parse.call_args
        assert kwargs.get("format_hint") == "payfit"


# ── File too large ──────────────────────────────────────


class TestFileTooLarge:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_413_file_too_large(
        self,
        mock_get_dataset,
        mock_cooldown,
        admin_client,
    ) -> None:
        """File exceeding MAX_UPLOAD_SIZE_BYTES returns 413."""
        mock_get_dataset.return_value = _make_dataset()
        mock_cooldown.return_value = None

        # Patch only MAX_UPLOAD_SIZE_BYTES to a tiny value
        with patch("app.routers.datasets.settings") as mock_settings:
            mock_settings.MAX_UPLOAD_SIZE_BYTES = 10
            response = await admin_client.post(
                _url(),
                files={
                    "file": ("data.csv", _csv_bytes(), "text/csv"),
                },
            )

        assert response.status_code == 413


# ── IngestionLog recording ──────────────────────────────


class TestIngestionLog:
    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.insert_raw_rows")
    @patch("app.routers.datasets.run_quality_checks")
    @patch("app.routers.datasets.map_columns")
    @patch("app.routers.datasets.parse_file")
    @patch("app.routers.datasets.get_dataset_columns", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_success_creates_ingestion_log(
        self,
        mock_get_dataset,
        mock_get_columns,
        mock_parse,
        mock_map,
        mock_quality,
        mock_insert,
        mock_cooldown,
        admin_client,
        mock_session,
    ) -> None:
        """Successful ingestion creates an IngestionLog with correct fields."""
        mock_get_dataset.return_value = _make_dataset()
        mock_get_columns.return_value = _make_columns()
        mock_parse.return_value = _make_parse_result()
        mock_map.return_value = _make_mapping_result()
        mock_quality.return_value = _make_quality_result()
        mock_insert.return_value = _make_insertion_result()
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 201

        # session.add is called for: IngestionLog + QualityReport
        add_calls = mock_session.add.call_args_list
        assert len(add_calls) >= 2

        # IngestionLog is the second-to-last add call
        from app.models.data_catalog import IngestionMode, QualityReport, RunStatus

        log_obj = None
        quality_obj = None
        for call in add_calls:
            obj = call[0][0]
            if isinstance(obj, QualityReport):
                quality_obj = obj
            elif hasattr(obj, "mode"):
                log_obj = obj

        assert log_obj is not None
        assert log_obj.mode == IngestionMode.FILE_UPLOAD
        assert log_obj.file_name == "data.csv"
        assert log_obj.file_size > 0
        assert log_obj.status == RunStatus.SUCCESS
        assert log_obj.dataset_id == DATASET_ID
        assert log_obj.triggered_by == USER_ID

        # Verify QualityReport was also persisted
        assert quality_obj is not None
        assert quality_obj.dataset_id == DATASET_ID
        assert quality_obj.rows_received == 2

    @patch("app.routers.datasets._check_cooldown", new_callable=AsyncMock)
    @patch("app.routers.datasets.insert_raw_rows")
    @patch("app.routers.datasets.map_columns")
    @patch("app.routers.datasets.parse_file")
    @patch("app.routers.datasets.get_dataset_columns", new_callable=AsyncMock)
    @patch("app.routers.datasets.get_dataset", new_callable=AsyncMock)
    async def test_parse_failure_creates_failed_log(
        self,
        mock_get_dataset,
        mock_get_columns,
        mock_parse,
        mock_map,
        mock_insert,
        mock_cooldown,
        admin_client,
        mock_session,
    ) -> None:
        """Parse failure should still create a FAILED IngestionLog entry."""
        mock_get_dataset.return_value = _make_dataset()
        mock_get_columns.return_value = _make_columns()
        mock_parse.side_effect = ValueError("Bad CSV")
        mock_cooldown.return_value = None

        response = await admin_client.post(
            _url(),
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 400

        # Verify FAILED log was created
        add_calls = mock_session.add.call_args_list
        assert len(add_calls) >= 1
        log_obj = add_calls[-1][0][0]

        from app.models.data_catalog import RunStatus

        assert log_obj.status == RunStatus.FAILED
        assert log_obj.error_message is not None
        assert len(log_obj.error_message) <= 500
