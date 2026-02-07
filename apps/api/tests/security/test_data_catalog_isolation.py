"""Tenant isolation security tests for Data Catalog (datasets) endpoints.

Strategy: same pattern as test_tenant_isolation.py and test_decisions_isolation.py.
Two orgs (A and B) — org B must NEVER see org A's datasets, columns,
ingestion logs, config history, or fit parameters.

Service-level patching ensures Pydantic model_validate works with mock returns.

Endpoints covered:
- GET  /api/v1/datasets              (list datasets)
- GET  /api/v1/datasets/{id}         (get single dataset)
- GET  /api/v1/datasets/{id}/columns (get columns)
- GET  /api/v1/datasets/{id}/data    (get raw data)
- GET  /api/v1/datasets/{id}/ingestion-log  (get logs)
- GET  /api/v1/datasets/{id}/history        (get config history)
- GET  /api/v1/datasets/{id}/fit-parameters (get fit params)
- POST /api/v1/datasets              (create dataset)
- PATCH /api/v1/datasets/{id}        (update config)

Additional security tests:
- Mass assignment prevention (extra=forbid on request schemas)
- Viewer cannot access write endpoints
- Cross-org PATCH returns 404 (not 403)
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import (
    get_current_user,
    get_db_session,
    get_tenant_filter,
)
from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter, require_role
from app.main import app

# ── Fixed test identifiers ────────────────────────────────────────
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
USER_A_ID = "user-a-cat-001"
USER_B_ID = "user-b-cat-001"

# Resources belonging to org A — org B must NOT see these
ORG_A_DATASET_ID = uuid.UUID("aaaaaaaa-7777-7777-7777-777777777777")


def _make_jwt(user_id: str, org_id: uuid.UUID, role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


JWT_A = _make_jwt(USER_A_ID, ORG_A_ID)
JWT_B = _make_jwt(USER_B_ID, ORG_B_ID)


# ── Fixtures ──────────────────────────────────────────────────────


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
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


def _mock_dataset_summary() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=ORG_A_DATASET_ID,
        organization_id=ORG_A_ID,
        name="effectifs",
        table_name="effectifs",
        status="active",
        temporal_index="date_col",
        row_count=5000,
        created_at=now,
        updated_at=now,
    )


def _mock_dataset_read() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=ORG_A_DATASET_ID,
        organization_id=ORG_A_ID,
        name="effectifs",
        table_name="effectifs",
        schema_raw="acme_raw",
        schema_transformed="acme_transformed",
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


def _mock_ingestion_log() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        dataset_id=ORG_A_DATASET_ID,
        mode="incremental",
        status="success",
        rows_received=100,
        rows_transformed=95,
        error_message=None,
        triggered_by="scheduler",
        request_id=None,
        started_at=now,
        completed_at=now,
        created_at=now,
        updated_at=now,
    )


def _mock_config_history() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        dataset_id=ORG_A_DATASET_ID,
        config_snapshot={"lags": [1, 7]},
        columns_snapshot={},
        change_reason="Updated lags",
        changed_by=uuid.uuid4(),
        created_at=now,
    )


def _mock_fit_parameter() -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid.uuid4(),
        dataset_id=ORG_A_DATASET_ID,
        column_name="revenue",
        transform_type="zscore",
        parameters={"mean": 42.0, "std": 1.5},
        hmac_sha256="abc123",
        fitted_at=now,
        row_count=5000,
        version=1,
        is_active=True,
        created_at=now,
    )


# ── 1. Dataset list — org B sees empty, not org A's data ─────────


class TestDatasetListIsolation:
    """GET /api/v1/datasets returns only org-scoped data."""

    async def test_org_a_sees_own_datasets(self, client_org_a: AsyncClient) -> None:
        with patch(
            "app.routers.datasets.list_datasets",
            new_callable=AsyncMock,
            return_value=([_mock_dataset_summary()], 1),
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/datasets")

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_cannot_see_org_a_datasets(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.list_datasets",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/datasets")

        assert response.status_code == 200
        assert response.json()["data"] == []
        assert response.json()["pagination"]["total"] == 0

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)


# ── 2. Dataset by ID — org B gets 404 for org A's dataset ────────


class TestDatasetGetIsolation:
    """GET /api/v1/datasets/{id} returns 404 for cross-org resources."""

    async def test_org_a_sees_own_dataset(self, client_org_a: AsyncClient) -> None:
        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            return_value=_mock_dataset_read(),
        ):
            response = await client_org_a.get(f"/api/v1/datasets/{ORG_A_DATASET_ID}")

        assert response.status_code == 200

    async def test_org_b_gets_404_for_org_a_dataset(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(f"/api/v1/datasets/{ORG_A_DATASET_ID}")

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        assert str(ORG_A_ID) not in str(response.json())


# ── 3. Columns — org B can't see org A's columns ─────────────────


class TestDatasetColumnsIsolation:
    """GET /api/v1/datasets/{id}/columns rejects cross-org."""

    async def test_org_a_sees_own_columns(self, client_org_a: AsyncClient) -> None:
        with patch(
            "app.routers.datasets.get_dataset_columns",
            new_callable=AsyncMock,
            return_value=[_mock_column()],
        ) as mock_svc:
            response = await client_org_a.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/columns"
            )

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_gets_404_for_org_a_columns(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_dataset_columns",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/columns"
            )

        assert response.status_code == 404


# ── 4. Data — org B can't see org A's raw data ───────────────────


class TestDatasetDataIsolation:
    """GET /api/v1/datasets/{id}/data rejects cross-org."""

    async def test_org_b_gets_404_for_org_a_data(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_dataset_data",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/data"
            )

        assert response.status_code == 404


# ── 5. Ingestion log — org B can't see org A's logs ──────────────


class TestIngestionLogIsolation:
    """GET /api/v1/datasets/{id}/ingestion-log rejects cross-org."""

    async def test_org_a_sees_own_ingestion_log(
        self, client_org_a: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_ingestion_log",
            new_callable=AsyncMock,
            return_value=([_mock_ingestion_log()], 1),
        ) as mock_svc:
            response = await client_org_a.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingestion-log"
            )

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_gets_404_for_org_a_ingestion_log(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_ingestion_log",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/ingestion-log"
            )

        assert response.status_code == 404


# ── 6. Config history — org B can't see org A's history ──────────


class TestConfigHistoryIsolation:
    """GET /api/v1/datasets/{id}/history rejects cross-org."""

    async def test_org_b_gets_404_for_org_a_history(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_config_history",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/history"
            )

        assert response.status_code == 404


# ── 7. Fit parameters — org B can't see org A's params ───────────


class TestFitParametersIsolation:
    """GET /api/v1/datasets/{id}/fit-parameters rejects cross-org."""

    async def test_org_a_sees_own_fit_parameters(
        self, client_org_a: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_fit_parameters",
            new_callable=AsyncMock,
            return_value=[_mock_fit_parameter()],
        ) as mock_svc:
            response = await client_org_a.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/fit-parameters"
            )

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_gets_404_for_org_a_fit_parameters(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_fit_parameters",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}/fit-parameters"
            )

        assert response.status_code == 404


# ── 8. PATCH dataset — org B gets 404 for org A's dataset ────────


class TestDatasetUpdateIsolation:
    """PATCH /api/v1/datasets/{id} rejects cross-org."""

    async def test_org_b_cannot_patch_org_a_dataset(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.update_dataset_config",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.patch(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}",
                json={
                    "pipelineConfig": {"lags": [1, 3]},
                    "changeReason": "IDOR attempt",
                },
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        assert str(ORG_A_ID) not in str(response.json())


# ── 9. Error responses never leak cross-org info ─────────────────


class TestDataCatalogErrorIsolation:
    """Error responses for cross-org dataset resources are opaque."""

    async def test_cross_org_dataset_404_is_opaque(
        self, client_org_b: AsyncClient
    ) -> None:
        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response = await client_org_b.get(f"/api/v1/datasets/{ORG_A_DATASET_ID}")

        body = response.json()
        body_str = str(body).lower()
        assert "forbidden" not in body_str
        assert "permission" not in body_str
        assert "other org" not in body_str
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "ClientDataset not found"

    async def test_fake_uuid_and_cross_org_produce_identical_404(
        self, client_org_b: AsyncClient
    ) -> None:
        fake_id = uuid.uuid4()

        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(fake_id)),
        ):
            response_fake = await client_org_b.get(f"/api/v1/datasets/{fake_id}")

        with patch(
            "app.routers.datasets.get_dataset",
            new_callable=AsyncMock,
            side_effect=NotFoundError("ClientDataset", str(ORG_A_DATASET_ID)),
        ):
            response_cross = await client_org_b.get(
                f"/api/v1/datasets/{ORG_A_DATASET_ID}"
            )

        assert response_fake.status_code == response_cross.status_code == 404
        fake_body = response_fake.json()
        cross_body = response_cross.json()
        assert fake_body["error"]["code"] == cross_body["error"]["code"]
        assert fake_body["error"]["message"] == cross_body["error"]["message"]


# ── 10. Mass assignment prevention ────────────────────────────────


class TestDataCatalogMassAssignment:
    """Request schemas with extra='forbid' reject unexpected fields."""

    async def test_create_rejects_organization_id(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting organizationId in create request is rejected."""
        response = await client_org_a.post(
            "/api/v1/datasets",
            json={
                "name": "test_dataset",
                "tableName": "test_ds",
                "temporalIndex": "date_col",
                "groupBy": [],
                "pipelineConfig": {},
                "organizationId": str(ORG_B_ID),
            },
        )
        assert response.status_code == 422

    async def test_create_rejects_status_field(self, client_org_a: AsyncClient) -> None:
        """Injecting status in create request is rejected."""
        response = await client_org_a.post(
            "/api/v1/datasets",
            json={
                "name": "test_dataset",
                "tableName": "test_ds",
                "temporalIndex": "date_col",
                "groupBy": [],
                "pipelineConfig": {},
                "status": "active",
            },
        )
        assert response.status_code == 422

    async def test_update_rejects_organization_id(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting organizationId in PATCH request is rejected."""
        response = await client_org_a.patch(
            f"/api/v1/datasets/{ORG_A_DATASET_ID}",
            json={
                "pipelineConfig": {"lags": [1]},
                "organizationId": str(ORG_B_ID),
            },
        )
        assert response.status_code == 422


# ── 11. Viewer cannot write ───────────────────────────────────────


class TestDataCatalogRoleIsolation:
    """Viewers cannot access write endpoints."""

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

    async def test_viewer_cannot_create_dataset(
        self, client_org_a_viewer: AsyncClient
    ) -> None:
        response = await client_org_a_viewer.post(
            "/api/v1/datasets",
            json={
                "name": "viewer_attempt",
                "tableName": "viewer_ds",
                "temporalIndex": "date_col",
                "groupBy": [],
                "pipelineConfig": {},
            },
        )
        assert response.status_code == 403

    async def test_viewer_cannot_patch_dataset(
        self, client_org_a_viewer: AsyncClient
    ) -> None:
        response = await client_org_a_viewer.patch(
            f"/api/v1/datasets/{ORG_A_DATASET_ID}",
            json={
                "pipelineConfig": {"lags": [1]},
            },
        )
        assert response.status_code == 403
