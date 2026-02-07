"""Shared fixtures for integration tests.

Strategy:
- We mock get_db_session, get_current_user, and get_tenant_filter
  via FastAPI dependency overrides. This lets us test router -> service
  -> (mocked) DB flow without a real PostgreSQL instance.
- Two org contexts (ORG_A, ORG_B) test tenant isolation.
- Mock ORM objects use SimpleNamespace (not MagicMock) so Pydantic
  model_validate(obj, from_attributes=True) works correctly.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.security import TenantFilter
from app.main import app

# Fixed UUIDs for test reproducibility
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
USER_A_ID = "user-a-001"
USER_B_ID = "user-b-001"


def _make_jwt(user_id: str, org_id: uuid.UUID, role: str = "org_admin") -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


JWT_A = _make_jwt(USER_A_ID, ORG_A_ID)
JWT_B = _make_jwt(USER_B_ID, ORG_B_ID)


@pytest.fixture
def mock_session() -> AsyncMock:
    """Create a mock AsyncSession for database operations."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    return session


@pytest.fixture
async def client_a(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client authenticated as org A."""

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: JWT_A
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def client_b(mock_session: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client authenticated as org B."""

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: JWT_B
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_B_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def unauth_client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client with NO auth -- tests 401 behavior."""
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def make_mock_org(org_id: uuid.UUID = ORG_A_ID) -> SimpleNamespace:
    """Create a mock Organization ORM object using SimpleNamespace."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=org_id,
        organization_id=None,
        name="Test Org",
        slug="test-org",
        legal_name=None,
        siret=None,
        sector=None,
        size=None,
        headcount=100,
        status="active",
        plan="starter",
        timezone="Europe/Paris",
        locale="fr-FR",
        currency="EUR",
        contact_email="test@test.com",
        logo_url=None,
        settings={},
        created_at=now,
        updated_at=now,
    )


def make_mock_site(
    site_id: uuid.UUID | None = None,
    org_id: uuid.UUID = ORG_A_ID,
    name: str = "Test Site",
) -> SimpleNamespace:
    """Create a mock Site ORM object using SimpleNamespace."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=site_id or uuid.uuid4(),
        organization_id=org_id,
        name=name,
        code="TST",
        address=None,
        timezone="Europe/Paris",
        working_days_config=None,
        headcount=50,
        capacity_units=None,
        created_at=now,
        updated_at=now,
    )


def make_mock_department(
    dept_id: uuid.UUID | None = None,
    org_id: uuid.UUID = ORG_A_ID,
    site_id: uuid.UUID | None = None,
    name: str = "Test Dept",
) -> SimpleNamespace:
    """Create a mock Department ORM object using SimpleNamespace."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=dept_id or uuid.uuid4(),
        organization_id=org_id,
        site_id=site_id,
        parent_id=None,
        manager_id=None,
        name=name,
        code="TST",
        cost_center=None,
        headcount=20,
        min_staffing_level=80.0,
        critical_roles_count=1,
        created_at=now,
        updated_at=now,
    )
