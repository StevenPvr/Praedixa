"""Tenant isolation security tests for decisions and arbitrage endpoints.

Strategy: same pattern as test_tenant_isolation.py.
Two orgs (A and B) — org B must NEVER see org A's decisions or arbitrage data.
Service-level patching ensures Pydantic model_validate works with mock returns.

Endpoints covered:
- GET /api/v1/decisions (list)
- GET /api/v1/decisions/{id} (get single)
- POST /api/v1/decisions (create)
- PATCH /api/v1/decisions/{id}/review (review)
- POST /api/v1/decisions/{id}/outcome (record outcome)
- GET /api/v1/arbitrage/{alert_id}/options (get options)
- POST /api/v1/arbitrage/{alert_id}/validate (validate option)

Additional security tests:
- Mass assignment prevention (extra=forbid on request schemas)
- JWT-sourced user IDs (reviewer_id, recorder_id never from body)
- Org A operations use correct TenantFilter
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.main import app

# ── Fixed test identifiers ────────────────────────────────────────────
ORG_A_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
ORG_B_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")
USER_A_ID = "user-a-dec-001"
USER_B_ID = "user-b-dec-001"

# Resources belonging to org A — org B must NOT see these
ORG_A_DECISION_ID = uuid.UUID("aaaaaaaa-4444-4444-4444-444444444444")
ORG_A_ALERT_ID = uuid.UUID("aaaaaaaa-5555-5555-5555-555555555555")
ORG_A_DEPT_ID = uuid.UUID("aaaaaaaa-6666-6666-6666-666666666666")


def _make_jwt(
    user_id: str, org_id: uuid.UUID, role: str = "org_admin"
) -> JWTPayload:
    return JWTPayload(
        user_id=user_id,
        email=f"{user_id}@test.com",
        organization_id=str(org_id),
        role=role,
    )


JWT_A = _make_jwt(USER_A_ID, ORG_A_ID)
JWT_B = _make_jwt(USER_B_ID, ORG_B_ID)


# ── Fixtures ──────────────────────────────────────────────────────────


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
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(
        str(ORG_A_ID)
    )

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
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(
        str(ORG_B_ID)
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def _mock_decision(org_id: uuid.UUID = ORG_A_ID) -> SimpleNamespace:
    """Build a mock decision that Pydantic model_validate can handle."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=ORG_A_DECISION_ID,
        organization_id=org_id,
        forecast_run_id=None,
        department_id=ORG_A_DEPT_ID,
        target_period={"startDate": "2026-02-10", "endDate": "2026-02-20"},
        type="overtime",
        priority="medium",
        status="suggested",
        title="Test Decision",
        description="Test description",
        rationale="Test rationale",
        risk_indicators={},
        estimated_cost=1500.0,
        cost_of_inaction=3000.0,
        estimated_roi=None,
        confidence_score=75.0,
        related_employee_id=None,
        suggested_replacement_id=None,
        reviewed_by=None,
        reviewed_at=None,
        manager_notes=None,
        implementation_deadline=None,
        implemented_by=None,
        implemented_at=None,
        outcome=None,
        created_at=now,
        updated_at=now,
    )


# ── 1. Decisions list — org B sees empty, not org A's data ─────────


class TestDecisionListIsolation:
    """GET /api/v1/decisions returns only org-scoped data."""

    async def test_org_a_sees_own_decisions(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A lists its own decisions."""
        with patch(
            "app.routers.decisions.list_decisions",
            new_callable=AsyncMock,
            return_value=([_mock_decision()], 1),
        ) as mock_svc:
            response = await client_org_a.get("/api/v1/decisions")

        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_A_ID)

    async def test_org_b_cannot_see_org_a_decisions(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B sees empty list — org A's decisions are invisible."""
        with patch(
            "app.routers.decisions.list_decisions",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_svc:
            response = await client_org_b.get("/api/v1/decisions")

        assert response.status_code == 200
        assert response.json()["data"] == []
        assert response.json()["pagination"]["total"] == 0

        tenant_used: TenantFilter = mock_svc.call_args.kwargs["tenant"]
        assert tenant_used.organization_id == str(ORG_B_ID)


# ── 2. Decision by ID — org B gets 404 for org A's decision ────────


class TestDecisionGetIsolation:
    """GET /api/v1/decisions/{id} returns 404 for cross-org resources."""

    async def test_org_a_sees_own_decision(
        self, client_org_a: AsyncClient
    ) -> None:
        """Org A can get its own decision by ID."""
        with patch(
            "app.routers.decisions.get_decision",
            new_callable=AsyncMock,
            return_value=_mock_decision(),
        ):
            response = await client_org_a.get(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}"
            )

        assert response.status_code == 200

    async def test_org_b_gets_404_for_org_a_decision(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B gets 404 (not 403) for org A's decision."""
        with patch(
            "app.routers.decisions.get_decision",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Decision", str(ORG_A_DECISION_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}"
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        assert str(ORG_A_ID) not in str(response.json())


# ── 3. Create decision — org B can't use org A's department ─────────


class TestDecisionCreateIsolation:
    """POST /api/v1/decisions rejects cross-org department_id."""

    async def test_org_b_cannot_create_for_org_a_department(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B creating a decision for org A's department gets 404."""
        with patch(
            "app.routers.decisions.create_decision",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Department", str(ORG_A_DEPT_ID)),
        ):
            response = await client_org_b.post(
                "/api/v1/decisions",
                json={
                    "departmentId": str(ORG_A_DEPT_ID),
                    "type": "overtime",
                    "priority": "medium",
                    "title": "Fake decision",
                    "description": "Trying to target org A",
                    "rationale": "IDOR attempt",
                    "targetPeriod": {
                        "startDate": "2026-02-10",
                        "endDate": "2026-02-20",
                    },
                    "confidenceScore": 50,
                },
            )

        assert response.status_code == 404


# ── 4. Review decision — org B can't review org A's decision ────────


class TestDecisionReviewIsolation:
    """PATCH /api/v1/decisions/{id}/review rejects cross-org."""

    async def test_org_b_cannot_review_org_a_decision(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B reviewing org A's decision gets 404."""
        with patch(
            "app.routers.decisions.review_decision",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Decision", str(ORG_A_DECISION_ID)),
        ):
            response = await client_org_b.patch(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}/review",
                json={"action": "approve"},
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"


# ── 5. Record outcome — org B can't record on org A's decision ──────


class TestDecisionOutcomeIsolation:
    """POST /api/v1/decisions/{id}/outcome rejects cross-org."""

    async def test_org_b_cannot_record_outcome_org_a_decision(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B recording outcome on org A's decision gets 404."""
        with patch(
            "app.routers.decisions.record_outcome",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Decision", str(ORG_A_DECISION_ID)),
        ):
            response = await client_org_b.post(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}/outcome",
                json={
                    "effective": True,
                    "actualImpact": "Attempted cross-org recording",
                },
            )

        assert response.status_code == 404


# ── 6. Arbitrage options — org B can't see org A's alert options ────


class TestArbitrageOptionsIsolation:
    """GET /api/v1/arbitrage/{alert_id}/options rejects cross-org."""

    async def test_org_b_gets_404_for_org_a_alert_options(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B gets 404 for org A's alert arbitrage options."""
        with patch(
            "app.routers.arbitrage.get_arbitrage_options",
            new_callable=AsyncMock,
            side_effect=NotFoundError("DashboardAlert", str(ORG_A_ALERT_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/arbitrage/{ORG_A_ALERT_ID}/options"
            )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
        assert str(ORG_A_ID) not in str(response.json())


# ── 7. Arbitrage validate — org B can't validate org A's alert ──────


class TestArbitrageValidateIsolation:
    """POST /api/v1/arbitrage/{alert_id}/validate rejects cross-org."""

    async def test_org_b_cannot_validate_org_a_alert(
        self, client_org_b: AsyncClient
    ) -> None:
        """Org B validating org A's alert arbitrage gets 404."""
        with patch(
            "app.routers.arbitrage.get_arbitrage_options",
            new_callable=AsyncMock,
            side_effect=NotFoundError("DashboardAlert", str(ORG_A_ALERT_ID)),
        ):
            response = await client_org_b.post(
                f"/api/v1/arbitrage/{ORG_A_ALERT_ID}/validate",
                json={"selectedOptionIndex": 0},
            )

        assert response.status_code == 404


# ── 8. Error responses never leak cross-org info ────────────────────


class TestDecisionErrorIsolation:
    """Error responses for cross-org decision/arbitrage resources are opaque."""

    async def test_cross_org_decision_404_is_opaque(
        self, client_org_b: AsyncClient
    ) -> None:
        """Cross-org decision 404 doesn't hint at resource existence."""
        with patch(
            "app.routers.decisions.get_decision",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Decision", str(ORG_A_DECISION_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}"
            )

        body = response.json()
        body_str = str(body).lower()
        assert "forbidden" not in body_str
        assert "permission" not in body_str
        assert "other org" not in body_str
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Decision not found"

    async def test_cross_org_arbitrage_404_is_opaque(
        self, client_org_b: AsyncClient
    ) -> None:
        """Cross-org arbitrage 404 doesn't hint at resource existence."""
        with patch(
            "app.routers.arbitrage.get_arbitrage_options",
            new_callable=AsyncMock,
            side_effect=NotFoundError("DashboardAlert", str(ORG_A_ALERT_ID)),
        ):
            response = await client_org_b.get(
                f"/api/v1/arbitrage/{ORG_A_ALERT_ID}/options"
            )

        body = response.json()
        body_str = str(body).lower()
        assert "forbidden" not in body_str
        assert "permission" not in body_str
        assert body["error"]["code"] == "NOT_FOUND"

    async def test_fake_uuid_and_cross_org_produce_identical_404(
        self, client_org_b: AsyncClient
    ) -> None:
        """Fake UUID and cross-org UUID produce identical 404 responses."""
        fake_id = uuid.uuid4()

        with patch(
            "app.routers.decisions.get_decision",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Decision", str(fake_id)),
        ):
            response_fake = await client_org_b.get(
                f"/api/v1/decisions/{fake_id}"
            )

        with patch(
            "app.routers.decisions.get_decision",
            new_callable=AsyncMock,
            side_effect=NotFoundError("Decision", str(ORG_A_DECISION_ID)),
        ):
            response_cross = await client_org_b.get(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}"
            )

        assert response_fake.status_code == response_cross.status_code == 404
        fake_body = response_fake.json()
        cross_body = response_cross.json()
        assert fake_body["error"]["code"] == cross_body["error"]["code"]
        assert fake_body["error"]["message"] == cross_body["error"]["message"]


# ── 9. Role-based access — viewer can't write ──────────────────────


class TestDecisionRoleIsolation:
    """Viewers cannot access write endpoints even within their own org."""

    @pytest.fixture
    async def client_org_a_viewer(
        self, mock_session: AsyncMock
    ) -> AsyncGenerator[AsyncClient, None]:
        """HTTP client authenticated as org A viewer (read-only)."""
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

    async def test_viewer_cannot_create_decision(
        self, client_org_a_viewer: AsyncClient
    ) -> None:
        """Viewer cannot POST decisions — gets 403."""
        response = await client_org_a_viewer.post(
            "/api/v1/decisions",
            json={
                "departmentId": str(ORG_A_DEPT_ID),
                "type": "overtime",
                "priority": "medium",
                "title": "Viewer attempt",
                "description": "Should be rejected",
                "rationale": "No permission",
                "targetPeriod": {"startDate": "2026-02-10", "endDate": "2026-02-20"},
                "confidenceScore": 50,
            },
        )

        assert response.status_code == 403

    async def test_viewer_cannot_review_decision(
        self, client_org_a_viewer: AsyncClient
    ) -> None:
        """Viewer cannot PATCH review — gets 403."""
        response = await client_org_a_viewer.patch(
            f"/api/v1/decisions/{ORG_A_DECISION_ID}/review",
            json={"action": "approve"},
        )

        assert response.status_code == 403

    async def test_viewer_cannot_validate_arbitrage(
        self, client_org_a_viewer: AsyncClient
    ) -> None:
        """Viewer cannot POST arbitrage validate — gets 403."""
        response = await client_org_a_viewer.post(
            f"/api/v1/arbitrage/{ORG_A_ALERT_ID}/validate",
            json={"selectedOptionIndex": 0},
        )

        assert response.status_code == 403


# ── 10. Mass assignment prevention ───────────────────────────────────


class TestMassAssignmentPrevention:
    """Request schemas with extra='forbid' reject unexpected fields.

    This prevents attackers from injecting fields like organization_id,
    reviewed_by, or status into the request body to escalate privileges.
    """

    async def test_create_decision_rejects_organization_id(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting organizationId in create request is rejected (422)."""
        response = await client_org_a.post(
            "/api/v1/decisions",
            json={
                "departmentId": str(ORG_A_DEPT_ID),
                "type": "overtime",
                "priority": "medium",
                "title": "Decision",
                "description": "Description",
                "rationale": "Rationale",
                "targetPeriod": {"startDate": "2026-02-10", "endDate": "2026-02-20"},
                "confidenceScore": 50,
                "organizationId": str(ORG_B_ID),
            },
        )
        assert response.status_code == 422

    async def test_create_decision_rejects_status_field(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting status in create request is rejected (422)."""
        response = await client_org_a.post(
            "/api/v1/decisions",
            json={
                "departmentId": str(ORG_A_DEPT_ID),
                "type": "overtime",
                "priority": "medium",
                "title": "Decision",
                "description": "Description",
                "rationale": "Rationale",
                "targetPeriod": {"startDate": "2026-02-10", "endDate": "2026-02-20"},
                "confidenceScore": 50,
                "status": "approved",
            },
        )
        assert response.status_code == 422

    async def test_review_rejects_reviewed_by_field(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting reviewedBy in review request is rejected (422)."""
        response = await client_org_a.patch(
            f"/api/v1/decisions/{ORG_A_DECISION_ID}/review",
            json={
                "action": "approve",
                "reviewedBy": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 422

    async def test_outcome_rejects_implemented_by_field(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting implementedBy in outcome request is rejected (422)."""
        response = await client_org_a.post(
            f"/api/v1/decisions/{ORG_A_DECISION_ID}/outcome",
            json={
                "effective": True,
                "actualImpact": "Resolved",
                "implementedBy": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 422

    async def test_arbitrage_validate_rejects_extra_fields(
        self, client_org_a: AsyncClient
    ) -> None:
        """Injecting extra fields in arbitrage validate is rejected (422)."""
        response = await client_org_a.post(
            f"/api/v1/arbitrage/{ORG_A_ALERT_ID}/validate",
            json={
                "selectedOptionIndex": 0,
                "organizationId": str(ORG_B_ID),
            },
        )
        assert response.status_code == 422


# ── 11. JWT-sourced user IDs ─────────────────────────────────────────


class TestJwtSourcedUserIds:
    """Verify that reviewer_id and recorder_id always come from JWT,
    never from the request body."""

    async def test_review_uses_jwt_user_id(
        self, client_org_a: AsyncClient
    ) -> None:
        """PATCH /review passes reviewer_id from JWT, not from body."""
        mock = _mock_decision()
        mock.status = "approved"
        mock.reviewed_by = uuid.UUID("00000000-0000-0000-0000-000000000000")
        mock.reviewed_at = datetime.now(UTC)

        with patch(
            "app.routers.decisions.review_decision",
            new_callable=AsyncMock,
            return_value=mock,
        ) as mock_svc:
            await client_org_a.patch(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}/review",
                json={"action": "approve"},
            )

        # reviewer_id MUST be USER_A_ID (from JWT), not anything else
        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["reviewer_id"] == USER_A_ID

    async def test_outcome_uses_jwt_user_id(
        self, client_org_a: AsyncClient
    ) -> None:
        """POST /outcome passes recorder_id from JWT, not from body."""
        mock = _mock_decision()
        mock.status = "implemented"
        mock.implemented_by = uuid.UUID("00000000-0000-0000-0000-000000000000")
        mock.implemented_at = datetime.now(UTC)
        mock.outcome = {"effective": True, "actual_impact": "Done"}

        with patch(
            "app.routers.decisions.record_outcome",
            new_callable=AsyncMock,
            return_value=mock,
        ) as mock_svc:
            await client_org_a.post(
                f"/api/v1/decisions/{ORG_A_DECISION_ID}/outcome",
                json={"effective": True, "actualImpact": "Done"},
            )

        # recorder_id MUST be USER_A_ID (from JWT)
        call_kwargs = mock_svc.call_args.kwargs
        assert call_kwargs["recorder_id"] == USER_A_ID
