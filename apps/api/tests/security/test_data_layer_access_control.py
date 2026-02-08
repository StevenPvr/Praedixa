"""Security tests: data layer access control — 2-DB isolation enforcement.

Verifies that the 2-DB architecture (schema_raw / schema_transformed)
correctly isolates data between client users and super_admin:

- schema_raw (DB1): cleaned data, accessible by both webapp users and admin
- schema_transformed (DB2): DS features, accessible by super_admin ONLY

Gaps tested:
- G1: Admin features endpoint exists and works for super_admin
- G2: ClientDatasetRead does NOT expose schema_raw / schema_transformed
- G3: VIEW_FEATURES audit action exists and is logged
- G4: Webapp get_dataset_data() reads from schema_raw, never schema_transformed
- G6: Regular users cannot access /admin/.../features (403)
"""

import uuid
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session
from app.main import app
from app.models.admin import AdminAuditAction
from app.schemas.data_catalog import AdminDatasetRead, ClientDatasetRead

# ── Fixed test identifiers ─────────────────────────────────────
SUPER_ADMIN_USER_ID = "sa-data-001"
SUPER_ADMIN_ORG_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
REGULAR_USER_ID = "user-data-001"
REGULAR_ORG_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
TARGET_ORG_ID = uuid.UUID("cccccccc-2222-2222-2222-222222222222")
DATASET_ID = uuid.UUID("dddddddd-3333-3333-3333-333333333333")


def _make_jwt(
    role: str = "super_admin",
    user_id: str = SUPER_ADMIN_USER_ID,
    org_id: uuid.UUID = SUPER_ADMIN_ORG_ID,
) -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


def _mock_db_session():
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    return session


@pytest.fixture
async def client_super_admin() -> AsyncGenerator[AsyncClient, None]:
    """ASGI client authenticated as super_admin."""
    session = _mock_db_session()
    app.dependency_overrides[get_current_user] = lambda: _make_jwt("super_admin")
    app.dependency_overrides[get_db_session] = lambda: session
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def client_org_admin() -> AsyncGenerator[AsyncClient, None]:
    """ASGI client authenticated as org_admin (non-super_admin)."""
    session = _mock_db_session()
    app.dependency_overrides[get_current_user] = lambda: _make_jwt(
        "org_admin", REGULAR_USER_ID, REGULAR_ORG_ID
    )
    app.dependency_overrides[get_db_session] = lambda: session
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ══════════════════════════════════════════════════════════════════
# G2: ClientDatasetRead does NOT expose internal schema names
# ══════════════════════════════════════════════════════════════════


class TestClientDatasetReadSchemaExposure:
    """Verify that ClientDatasetRead schema hides internal schema names."""

    def test_schema_raw_not_in_fields(self) -> None:
        fields = set(ClientDatasetRead.model_fields.keys())
        assert "schema_raw" not in fields
        assert "schema_transformed" not in fields

    def test_admin_dataset_read_has_schema_fields(self) -> None:
        fields = set(AdminDatasetRead.model_fields.keys())
        assert "schema_raw" in fields
        assert "schema_transformed" in fields

    def test_client_read_serialization_excludes_schemas(self) -> None:
        """When model_validate from ORM, schema fields are dropped."""
        orm_obj = SimpleNamespace(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            name="test_dataset",
            schema_raw="org_raw",
            schema_transformed="org_transformed",
            table_name="effectifs",
            temporal_index="date_col",
            group_by=["dept"],
            pipeline_config={"lags": [1]},
            status="active",
            metadata_hash=None,
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        data = ClientDatasetRead.model_validate(orm_obj)
        dumped = data.model_dump()
        assert "schema_raw" not in dumped
        assert "schema_transformed" not in dumped

    def test_admin_read_serialization_includes_schemas(self) -> None:
        """AdminDatasetRead exposes schema names for admin back-office."""
        orm_obj = SimpleNamespace(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            name="test_dataset",
            schema_raw="org_raw",
            schema_transformed="org_transformed",
            table_name="effectifs",
            temporal_index="date_col",
            group_by=["dept"],
            pipeline_config={"lags": [1]},
            status="active",
            metadata_hash=None,
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        data = AdminDatasetRead.model_validate(orm_obj)
        dumped = data.model_dump()
        assert dumped["schema_raw"] == "org_raw"
        assert dumped["schema_transformed"] == "org_transformed"


# ══════════════════════════════════════════════════════════════════
# G3: VIEW_FEATURES exists in AdminAuditAction enum
# ══════════════════════════════════════════════════════════════════


class TestViewFeaturesAuditAction:
    def test_view_features_enum_exists(self) -> None:
        assert hasattr(AdminAuditAction, "VIEW_FEATURES")
        assert AdminAuditAction.VIEW_FEATURES.value == "view_features"

    def test_view_features_is_valid_action(self) -> None:
        action = AdminAuditAction("view_features")
        assert action == AdminAuditAction.VIEW_FEATURES


# ══════════════════════════════════════════════════════════════════
# G4: get_dataset_data reads from schema_raw, never schema_transformed
# ══════════════════════════════════════════════════════════════════


class TestDatasetDataReadsSchemaRaw:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    @patch("app.services.datasets.ddl_connection")
    async def test_get_dataset_data_uses_schema_raw(
        self, mock_ddl, mock_get_ds
    ) -> None:
        """get_dataset_data() must query schema_raw (DB1), not schema_transformed."""
        from psycopg import sql as psql

        from app.services.datasets import get_dataset_data

        ds = SimpleNamespace(
            id=DATASET_ID,
            organization_id=TARGET_ORG_ID,
            schema_raw="org_raw",
            schema_transformed="org_transformed",
            table_name="effectifs",
            temporal_index="date_col",
        )
        mock_get_ds.return_value = ds

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (0,)
        mock_cursor.fetchall.return_value = []
        mock_cursor.description = []
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        tenant = MagicMock()
        tenant.organization_id = str(TARGET_ORG_ID)
        tenant.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
        session = AsyncMock()

        _rows, _total, _columns = await get_dataset_data(DATASET_ID, tenant, session)

        # Extract all Identifier objects from the SQL calls
        all_calls = mock_cursor.execute.call_args_list
        identifiers_used = set()
        for call in all_calls:
            composed = call[0][0]
            for part in composed._obj:
                if isinstance(part, psql.Identifier):
                    identifiers_used.update(part._obj)

        assert "org_raw" in identifiers_used
        assert "org_transformed" not in identifiers_used

    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    @patch("app.services.datasets.ddl_connection")
    async def test_get_features_data_uses_schema_transformed(
        self, mock_ddl, mock_get_ds
    ) -> None:
        """get_features_data() must query schema_transformed (DB2)."""
        from psycopg import sql as psql

        from app.services.datasets import get_features_data

        ds = SimpleNamespace(
            id=DATASET_ID,
            organization_id=TARGET_ORG_ID,
            schema_raw="org_raw",
            schema_transformed="org_transformed",
            table_name="effectifs",
            temporal_index="date_col",
        )
        mock_get_ds.return_value = ds

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (0,)
        mock_cursor.fetchall.return_value = []
        mock_cursor.description = []
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        tenant = MagicMock()
        tenant.organization_id = str(TARGET_ORG_ID)
        tenant.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
        session = AsyncMock()

        _rows, _total, _columns = await get_features_data(DATASET_ID, tenant, session)

        all_calls = mock_cursor.execute.call_args_list
        identifiers_used = set()
        for call in all_calls:
            composed = call[0][0]
            for part in composed._obj:
                if isinstance(part, psql.Identifier):
                    identifiers_used.update(part._obj)

        assert "org_transformed" in identifiers_used
        assert "org_raw" not in identifiers_used


# ══════════════════════════════════════════════════════════════════
# G6: Non-super_admin users CANNOT access features endpoint (403)
# ══════════════════════════════════════════════════════════════════


_NON_ADMIN_ROLES = ["org_admin", "hr_manager", "manager", "employee", "viewer"]


class TestFeaturesEndpointRoleEnforcement:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("role", _NON_ADMIN_ROLES)
    async def test_non_admin_gets_403_on_features(self, role: str) -> None:
        """Non-super_admin roles must get 403 on features endpoint."""
        session = _mock_db_session()
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role, REGULAR_USER_ID, REGULAR_ORG_ID
        )
        app.dependency_overrides[get_db_session] = lambda: session
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                resp = await client.get(
                    f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
                    f"/datasets/{DATASET_ID}/features"
                )
                assert resp.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("role", _NON_ADMIN_ROLES)
    async def test_non_admin_gets_403_on_admin_data(self, role: str) -> None:
        """Non-super_admin roles must get 403 on admin data endpoint."""
        session = _mock_db_session()
        app.dependency_overrides[get_current_user] = lambda: _make_jwt(
            role, REGULAR_USER_ID, REGULAR_ORG_ID
        )
        app.dependency_overrides[get_db_session] = lambda: session
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                resp = await client.get(
                    f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
                    f"/datasets/{DATASET_ID}/data"
                )
                assert resp.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_unauthenticated_gets_401_on_features(self) -> None:
        """No auth token should give 401."""
        app.dependency_overrides.clear()
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            resp = await client.get(
                f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
                f"/datasets/{DATASET_ID}/features"
            )
            assert resp.status_code == 401


# ══════════════════════════════════════════════════════════════════
# G1: Admin features + data endpoints work for super_admin
# ══════════════════════════════════════════════════════════════════


class TestAdminFeaturesEndpoint:
    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_features_data", new_callable=AsyncMock)
    async def test_super_admin_can_access_features(
        self, mock_features, mock_audit, client_super_admin
    ) -> None:
        """Super_admin should get 200 on features endpoint."""
        mock_features.return_value = (
            [{"date_col": "2026-01-01", "value_lag_1": 42.0}],
            1,
            ["date_col", "value_lag_1"],
        )

        resp = await client_super_admin.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
            f"/datasets/{DATASET_ID}/features"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]["rows"]) == 1

    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_features_data", new_callable=AsyncMock)
    async def test_features_endpoint_logs_view_features_action(
        self, mock_features, mock_audit, client_super_admin
    ) -> None:
        """Features endpoint must log VIEW_FEATURES audit action."""
        mock_features.return_value = ([], 0, [])

        await client_super_admin.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
            f"/datasets/{DATASET_ID}/features"
        )
        mock_audit.assert_called_once()
        call_kwargs = mock_audit.call_args
        assert call_kwargs.kwargs["action"] == AdminAuditAction.VIEW_FEATURES
        assert call_kwargs.kwargs["resource_type"] == "DatasetFeatures"
        assert call_kwargs.kwargs["resource_id"] == DATASET_ID

    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_features_data", new_callable=AsyncMock)
    async def test_features_empty_returns_empty_rows(
        self, mock_features, mock_audit, client_super_admin
    ) -> None:
        """Empty features table should return empty rows, not 404."""
        mock_features.return_value = ([], 0, [])

        resp = await client_super_admin.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
            f"/datasets/{DATASET_ID}/features"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["rows"] == []
        assert body["data"]["pagination"]["total"] == 0

    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_features_data", new_callable=AsyncMock)
    async def test_features_pagination(
        self, mock_features, mock_audit, client_super_admin
    ) -> None:
        """Features endpoint supports pagination params."""
        mock_features.return_value = (
            [{"date_col": f"2026-01-{i:02d}"} for i in range(1, 11)],
            50,
            ["date_col"],
        )

        resp = await client_super_admin.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}"
            f"/datasets/{DATASET_ID}/features?page=2&page_size=10"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["pagination"]["page"] == 2
        assert body["data"]["pagination"]["page_size"] == 10
        assert body["data"]["pagination"]["has_next_page"] is True


class TestAdminDataEndpoint:
    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_dataset_data", new_callable=AsyncMock)
    async def test_super_admin_can_access_data(
        self, mock_data, mock_audit, client_super_admin
    ) -> None:
        """Super_admin should get 200 on data endpoint."""
        mock_data.return_value = (
            [{"date_col": "2026-01-01", "headcount": 120}],
            1,
            ["date_col", "headcount"],
        )

        resp = await client_super_admin.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/datasets/{DATASET_ID}/data"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]["rows"]) == 1

    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_dataset_data", new_callable=AsyncMock)
    async def test_data_endpoint_logs_view_data_action(
        self, mock_data, mock_audit, client_super_admin
    ) -> None:
        """Data endpoint must log VIEW_DATA audit action."""
        mock_data.return_value = ([], 0, [])

        await client_super_admin.get(
            f"/api/v1/admin/organizations/{TARGET_ORG_ID}/datasets/{DATASET_ID}/data"
        )
        mock_audit.assert_called_once()
        call_kwargs = mock_audit.call_args
        assert call_kwargs.kwargs["action"] == AdminAuditAction.VIEW_DATA
        assert call_kwargs.kwargs["resource_type"] == "DatasetData"
        assert call_kwargs.kwargs["resource_id"] == DATASET_ID

    @pytest.mark.asyncio
    @patch("app.routers.admin_data.log_admin_action", new_callable=AsyncMock)
    @patch("app.routers.admin_data.get_dataset_data", new_callable=AsyncMock)
    async def test_data_endpoint_cross_org(
        self, mock_data, mock_audit, client_super_admin
    ) -> None:
        """Data endpoint works with any org_id (cross-org admin access)."""
        other_org = uuid.uuid4()
        mock_data.return_value = ([{"value": 1}], 1, ["value"])

        resp = await client_super_admin.get(
            f"/api/v1/admin/organizations/{other_org}/datasets/{DATASET_ID}/data"
        )
        assert resp.status_code == 200


# ══════════════════════════════════════════════════════════════════
# get_features_data unit tests
# ══════════════════════════════════════════════════════════════════


class TestGetFeaturesDataService:
    @pytest.mark.asyncio
    @patch("app.services.datasets.get_dataset")
    @patch("app.services.datasets.ddl_connection")
    async def test_excludes_system_columns(self, mock_ddl, mock_get_ds) -> None:
        """System columns (prefixed with _) must not appear in results."""
        from app.services.datasets import get_features_data

        ds = SimpleNamespace(
            id=DATASET_ID,
            organization_id=TARGET_ORG_ID,
            schema_raw="org_raw",
            schema_transformed="org_transformed",
            table_name="effectifs",
            temporal_index="date_col",
        )
        mock_get_ds.return_value = ds

        # Mock cursor returning rows with system columns
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (1,)
        mock_cursor.fetchall.return_value = [(uuid.uuid4(), "2026-01-01", 1, 42.0, 0.5)]
        mock_cursor.description = [
            SimpleNamespace(name="_row_id"),
            SimpleNamespace(name="date_col"),
            SimpleNamespace(name="_pipeline_version"),
            SimpleNamespace(name="headcount"),
            SimpleNamespace(name="headcount_lag_1"),
        ]
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_ddl.return_value = mock_conn

        tenant = MagicMock()
        tenant.organization_id = str(TARGET_ORG_ID)
        tenant.apply = MagicMock(side_effect=lambda q, *a, **kw: q)
        session = AsyncMock()

        rows, total, columns = await get_features_data(DATASET_ID, tenant, session)
        assert total == 1
        assert len(rows) == 1
        assert columns == ["date_col", "headcount", "headcount_lag_1"]
        row = rows[0]
        assert "_row_id" not in row
        assert "_pipeline_version" not in row
        assert "date_col" in row
        assert "headcount" in row
        assert "headcount_lag_1" in row
