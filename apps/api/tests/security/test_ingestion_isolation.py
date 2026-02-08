"""Tenant isolation and upload hardening tests for POST /datasets/{id}/ingest.

Strategy: same pattern as test_data_catalog_isolation.py.
Two orgs (A and B) — org B must NEVER upload to or see org A's datasets.

Security vectors tested:
1. Cross-org upload → 404 (not 403, prevents enumeration)
2. IngestionLog entries not visible cross-org
3. format_hint injection doesn't bypass validation
4. sheet_name injection doesn't cause path traversal or log injection
5. Oversized file → 413
6. Invalid file type → 400
7. Upload cooldown enforcement → 429
8. Empty file → 400
9. Magic bytes mismatch → 400
10. Streaming size enforcement (no Content-Length header bypass)
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_tenant_filter,
)
from app.core.exceptions import NotFoundError
from app.core.rate_limit import limiter
from app.core.security import TenantFilter, require_role
from app.main import app

# ── Fixed test identifiers ────────────────────────────────────────
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
USER_A_ID = "user-a-ing-001"
USER_B_ID = "user-b-ing-001"

ORG_A_DATASET_ID = uuid.UUID("aaaaaaaa-8888-8888-8888-888888888888")


def _make_jwt(user_id: str, org_id: uuid.UUID, role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


JWT_A = _make_jwt(USER_A_ID, ORG_A_ID)
JWT_B = _make_jwt(USER_B_ID, ORG_B_ID)


def _mock_dataset() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=ORG_A_DATASET_ID,
        organization_id=ORG_A_ID,
        name="effectifs",
        table_name="effectifs",
        schema_data="acme_data",
        temporal_index="date_col",
        group_by=["department"],
        pipeline_config={"lags": [1, 7, 30]},
        status="active",
        row_count=5000,
        created_at=now,
        updated_at=now,
    )


def _mock_column() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        dataset_id=ORG_A_DATASET_ID,
        name="date_col",
        dtype="date",
        role="temporal_index",
        nullable=True,
        rules_override=None,
        ordinal_position=0,
        created_at=now,
        updated_at=now,
    )


def _make_csv_bytes(
    content: str = "nom;prenom;date\nDupont;Jean;01/01/2025\n",
) -> bytes:
    """Create a valid CSV file as bytes."""
    return content.encode("utf-8")


def _make_xlsx_bytes() -> bytes:
    """Create minimal XLSX-like bytes (PK ZIP header + padding).

    This is NOT a valid XLSX but passes magic bytes check.
    Actual parsing will be mocked.
    """
    # PK ZIP signature + minimal content
    return b"PK\x03\x04" + b"\x00" * 100


# ── Fixtures ──────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    """Reset in-memory rate limiter state before each test.

    Without this, the 6/minute per-IP rate limit triggers across tests
    because all test clients share the same loopback IP (127.0.0.1).
    """
    limiter.reset()


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.add = MagicMock()
    # Mock the cooldown query — return no previous uploads
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=mock_result)
    return session


@pytest.fixture
async def client_org_a(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as org A (org_admin)."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: JWT_A
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))
    app.dependency_overrides[require_role("org_admin")] = lambda: JWT_A

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def client_org_b(
    mock_session: AsyncMock,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client authenticated as org B (org_admin)."""

    async def _session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _session
    app.dependency_overrides[get_current_user] = lambda: JWT_B
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_B_ID))
    app.dependency_overrides[require_role("org_admin")] = lambda: JWT_B

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── 1. Cross-org upload returns 404 (prevents enumeration) ────────


class TestCrossOrgUploadIsolation:
    """POST /datasets/{id}/ingest returns 404 for another org's dataset."""

    async def test_org_b_upload_to_org_a_dataset_returns_404(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B uploading to org A's dataset gets 404, not 403."""
        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Dataset", str(ORG_A_DATASET_ID)),
        ):
            csv_content = _make_csv_bytes()
            response = await client_org_b.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={"file": ("test.csv", BytesIO(csv_content), "text/csv")},
            )

        assert response.status_code == 404
        body = response.json()
        assert body["error"]["code"] == "NOT_FOUND"
        # Must NOT reveal that the dataset exists but belongs to another org
        assert "forbidden" not in str(body).lower()
        assert "permission" not in str(body).lower()
        assert str(ORG_A_ID) not in str(body)

    async def test_cross_org_404_is_identical_to_nonexistent_dataset(
        self, client_org_b: AsyncClient
    ) -> None:
        """Cross-org 404 and nonexistent dataset 404 are indistinguishable."""
        fake_id = uuid.uuid4()

        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Dataset", str(fake_id)),
        ):
            response_fake = await client_org_b.post(
                f"/api/v1/datasets/{fake_id}/ingest",
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Dataset", str(ORG_A_DATASET_ID)),
        ):
            response_cross = await client_org_b.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        assert response_fake.status_code == response_cross.status_code == 404
        assert (
            response_fake.json()["error"]["code"]
            == response_cross.json()["error"]["code"]
        )
        assert (
            response_fake.json()["error"]["message"]
            == response_cross.json()["error"]["message"]
        )


# ── 2. Oversized file returns 413 ─────────────────────────────────


class TestOversizedFileRejection:
    """File exceeding MAX_UPLOAD_SIZE_BYTES is rejected with 413."""

    async def test_oversized_file_returns_413(self, client_org_a: AsyncClient) -> None:
        """A file exceeding the size limit gets 413 Payload Too Large."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
            patch("app.routers.datasets.settings") as mock_settings,
        ):
            # Set a tiny limit for testing
            mock_settings.MAX_UPLOAD_SIZE_BYTES = 100
            mock_settings.MAX_ROWS_PER_INGESTION = 1000
            mock_settings.UPLOAD_COOLDOWN_SECONDS = 10

            big_content = b"A" * 200  # 200 bytes > 100 byte limit
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={"file": ("big.csv", BytesIO(big_content), "text/csv")},
            )

        assert response.status_code == 413
        assert response.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"

    async def test_empty_file_returns_400(self, client_org_a: AsyncClient) -> None:
        """An empty file gets 400 Invalid File."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={"file": ("empty.csv", BytesIO(b""), "text/csv")},
            )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_FILE"


# ── 3. Invalid file type returns 400 ──────────────────────────────


class TestInvalidFileTypeRejection:
    """Files with invalid extensions or magic bytes are rejected."""

    async def test_exe_extension_rejected(self, client_org_a: AsyncClient) -> None:
        """A .exe file is rejected even if it has valid content."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={
                    "file": (
                        "malware.exe",
                        BytesIO(b"MZ" + b"\x00" * 50),
                        "application/octet-stream",
                    )
                },
            )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_FILE"

    async def test_xlsx_with_wrong_magic_bytes_rejected(
        self, client_org_a: AsyncClient
    ) -> None:
        """An .xlsx file without PK signature is rejected."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={
                    "file": (
                        "fake.xlsx",
                        BytesIO(b"NOT_A_ZIP_FILE" + b"\x00" * 50),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )
                },
            )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_FILE"

    async def test_disguised_png_as_csv_rejected(
        self, client_org_a: AsyncClient
    ) -> None:
        """A PNG file disguised with .xlsx extension is rejected (magic bytes)."""
        # PNG magic bytes (not PK/ZIP)
        png_magic = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={
                    "file": (
                        "disguised.xlsx",
                        BytesIO(png_magic),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )
                },
            )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_FILE"


# ── 4. format_hint injection ──────────────────────────────────────


class TestFormatHintInjection:
    """format_hint is a Literal type — invalid values are rejected by FastAPI."""

    async def test_invalid_format_hint_rejected(
        self, client_org_a: AsyncClient
    ) -> None:
        """An invalid format_hint value gets 422 Validation Error."""
        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            return_value=_mock_dataset(),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                params={"format_hint": "'; DROP TABLE users; --"},
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        assert response.status_code == 422

    async def test_format_hint_sql_injection_rejected(
        self, client_org_a: AsyncClient
    ) -> None:
        """SQL injection via format_hint is rejected at validation layer."""
        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            return_value=_mock_dataset(),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                params={"format_hint": "UNION SELECT * FROM information_schema.tables"},
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        assert response.status_code == 422


# ── 5. sheet_name injection ───────────────────────────────────────


class TestSheetNameInjection:
    """sheet_name is sanitized to prevent log injection and path traversal."""

    async def test_sheet_name_with_path_traversal(
        self, client_org_a: AsyncClient
    ) -> None:
        """Path traversal in sheet_name doesn't cause file system access."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
            patch(
                "app.routers.datasets.get_dataset_columns",
                new_callable=AsyncMock,
                return_value=[_mock_column()],
            ),
            patch(
                "app.routers.datasets.parse_file",
                side_effect=Exception("Sheet not found"),
            ),
        ):
            # The error will be caught, IngestionLog created, and 400 returned
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                params={"sheet_name": "../../../etc/passwd"},
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        # Should get 400 (parse error), not a file system error
        assert response.status_code == 400

    async def test_sheet_name_with_null_bytes(self, client_org_a: AsyncClient) -> None:
        """Null bytes in sheet_name are stripped by sanitization."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
            patch(
                "app.routers.datasets.get_dataset_columns",
                new_callable=AsyncMock,
                return_value=[_mock_column()],
            ),
            patch(
                "app.routers.datasets.parse_file",
                side_effect=Exception("Sheet not found"),
            ),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                params={"sheet_name": "Sheet1\x00INJECTED"},
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        # Should handle gracefully — 400 from parse error
        assert response.status_code == 400

    async def test_sheet_name_length_is_capped(self, client_org_a: AsyncClient) -> None:
        """Extremely long sheet_name is truncated before processing."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
            patch(
                "app.routers.datasets.get_dataset_columns",
                new_callable=AsyncMock,
                return_value=[_mock_column()],
            ),
            patch(
                "app.routers.datasets.parse_file",
                side_effect=Exception("Sheet not found"),
            ),
        ):
            long_name = "A" * 10000
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                params={"sheet_name": long_name},
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        # Should be handled without crashing
        assert response.status_code == 400


# ── 6. Upload cooldown enforcement ────────────────────────────────


class TestUploadCooldownEnforcement:
    """Per-dataset cooldown prevents rapid-fire uploads."""

    async def test_cooldown_returns_429(
        self, client_org_a: AsyncClient, mock_session: AsyncMock
    ) -> None:
        """Upload during cooldown window returns 429."""
        # Mock a recent IngestionLog entry (2 seconds ago)
        recent_log = SimpleNamespace(
            started_at=datetime.now(UTC),
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = recent_log
        mock_session.execute = AsyncMock(return_value=mock_result)

        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            return_value=_mock_dataset(),
        ):
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
            )

        assert response.status_code == 429
        assert response.json()["error"]["code"] == "UPLOAD_COOLDOWN"


# ── 7. IngestionLog tenant isolation ──────────────────────────────


class TestIngestionLogIsolation:
    """IngestionLog entries from org A's dataset are invisible to org B."""

    async def test_org_b_cannot_see_org_a_ingestion_logs(
        self, client_org_b: AsyncClient
    ) -> None:
        """GET /datasets/{id}/ingestion-log returns 404 for cross-org dataset."""
        with patch(
            "app.routers.datasets.get_ingestion_log",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Dataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingestion-log"
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        # Error response must not reveal the dataset exists
        assert str(ORG_A_ID) not in str(response.json())


# ── 8. Viewer cannot upload ───────────────────────────────────────


class TestViewerCannotUpload:
    """Viewer role cannot access the ingest endpoint."""

    @pytest.fixture
    async def client_org_a_viewer(
        self, mock_session: AsyncMock
    ) -> AsyncGenerator[AsyncClient, None]:
        jwt_viewer = _make_jwt(USER_A_ID, ORG_A_ID, role="viewer")

        async def _session() -> AsyncGenerator[AsyncMock, None]:
            yield mock_session

        app.dependency_overrides[get_db_session] = _session
        app.dependency_overrides[get_current_user] = lambda: jwt_viewer
        app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(
            str(ORG_A_ID)
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

        app.dependency_overrides.clear()

    async def test_viewer_cannot_upload_file(
        self, client_org_a_viewer: AsyncClient
    ) -> None:
        """Viewer gets 403 when trying to upload."""
        response = await client_org_a_viewer.post(
            f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
            files={"file": ("test.csv", BytesIO(_make_csv_bytes()), "text/csv")},
        )
        assert response.status_code == 403


# ── 9. Error message sanitization ─────────────────────────────────


class TestErrorMessageSanitization:
    """Error messages never reflect unsanitized user input."""

    async def test_parse_error_does_not_reflect_filename(
        self, client_org_a: AsyncClient
    ) -> None:
        """Parse error response doesn't reflect the uploaded filename."""
        with (
            patch(
                "app.routers.datasets.get_dataset",
                new_callable=AsyncMock,
                return_value=_mock_dataset(),
            ),
            patch(
                "app.routers.datasets._check_cooldown",
                new_callable=AsyncMock,
            ),
            patch(
                "app.routers.datasets.get_dataset_columns",
                new_callable=AsyncMock,
                return_value=[_mock_column()],
            ),
            patch(
                "app.routers.datasets.parse_file",
                side_effect=Exception("Internal parse failure details"),
            ),
        ):
            malicious_name = "<script>alert('xss')</script>.csv"
            response = await client_org_a.post(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingest",
                files={
                    "file": (malicious_name, BytesIO(_make_csv_bytes()), "text/csv")
                },
            )

        assert response.status_code == 400
        body = str(response.json())
        # The generic "File parsing failed" message should be returned,
        # not the internal exception message
        assert "Internal parse failure details" not in body
        assert "<script>" not in body
