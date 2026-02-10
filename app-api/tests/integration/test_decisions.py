"""Integration tests for decisions endpoints.

Tests cover:
- 200/201 success paths
- 404 IDOR (tenant isolation)
- 401 unauthenticated access
- 403 forbidden (viewer role)
- Pagination
- Filter by status and type
- Review state transitions (approve/reject/defer)
- Outcome recording
- Invalid transitions (409)
"""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.auth import JWTPayload
from app.core.dependencies import get_current_user, get_db_session, get_tenant_filter
from app.core.exceptions import NotFoundError
from app.core.security import TenantFilter
from app.main import app
from app.services.decisions import InvalidTransitionError

from .conftest import ORG_A_ID


def _make_mock_decision(
    decision_id: uuid.UUID | None = None,
    org_id: uuid.UUID = ORG_A_ID,
    status: str = "suggested",
    decision_type: str = "overtime",
    priority: str = "high",
) -> SimpleNamespace:
    """Create a mock Decision ORM object using SimpleNamespace."""
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=decision_id or uuid.uuid4(),
        organization_id=org_id,
        forecast_run_id=None,
        department_id=uuid.uuid4(),
        target_period={"startDate": "2026-02-10", "endDate": "2026-02-17"},
        type=decision_type,
        priority=priority,
        status=status,
        title="Test Decision",
        description="Test description",
        rationale="Test rationale",
        risk_indicators={"risk_level": "medium"},
        estimated_cost=1500.00,
        cost_of_inaction=5000.00,
        estimated_roi=None,
        confidence_score=85.0,
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


# --- GET /api/v1/decisions ---


async def test_list_decisions_200(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions returns paginated list."""
    decisions = [_make_mock_decision(), _make_mock_decision()]

    with patch(
        "app.routers.decisions.list_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 2),
    ):
        response = await client_a.get("/api/v1/decisions")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["page"] == 1


async def test_list_decisions_empty(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions returns empty list when no decisions."""
    with patch(
        "app.routers.decisions.list_decisions",
        new_callable=AsyncMock,
        return_value=([], 0),
    ):
        response = await client_a.get("/api/v1/decisions")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []
    assert data["pagination"]["total"] == 0


async def test_list_decisions_with_status_filter(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions?status=approved filters by status."""
    decisions = [_make_mock_decision(status="approved")]

    with patch(
        "app.routers.decisions.list_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 1),
    ) as mock_list:
        response = await client_a.get("/api/v1/decisions?status=approved")

    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args
    assert call_kwargs.kwargs["status_filter"] == "approved"


async def test_list_decisions_with_type_filter(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions?type=overtime filters by type."""
    decisions = [_make_mock_decision(decision_type="overtime")]

    with patch(
        "app.routers.decisions.list_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 1),
    ) as mock_list:
        response = await client_a.get("/api/v1/decisions?type=overtime")

    assert response.status_code == 200
    mock_list.assert_called_once()
    call_kwargs = mock_list.call_args
    assert call_kwargs.kwargs["type_filter"] == "overtime"


async def test_list_decisions_pagination(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions?page=2&page_size=5 handles pagination."""
    decisions = [_make_mock_decision()]

    with patch(
        "app.routers.decisions.list_decisions",
        new_callable=AsyncMock,
        return_value=(decisions, 6),
    ):
        response = await client_a.get("/api/v1/decisions?page=2&page_size=5")

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["pageSize"] == 5
    assert data["pagination"]["totalPages"] == 2
    assert data["pagination"]["hasPreviousPage"] is True


async def test_list_decisions_401_no_auth(unauth_client: AsyncClient) -> None:
    """GET /api/v1/decisions returns 401 without auth."""
    response = await unauth_client.get("/api/v1/decisions")
    assert response.status_code == 401


# --- GET /api/v1/decisions/{id} ---


async def test_get_decision_200(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions/{id} returns full decision."""
    decision_id = uuid.uuid4()
    decision = _make_mock_decision(decision_id=decision_id)

    with patch(
        "app.routers.decisions.get_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        response = await client_a.get(f"/api/v1/decisions/{decision_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(decision_id)


async def test_get_decision_404_not_found(client_a: AsyncClient) -> None:
    """GET /api/v1/decisions/{id} returns 404 for unknown decision."""
    decision_id = uuid.uuid4()

    with patch(
        "app.routers.decisions.get_decision",
        new_callable=AsyncMock,
        side_effect=NotFoundError("Decision", str(decision_id)),
    ):
        response = await client_a.get(f"/api/v1/decisions/{decision_id}")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


async def test_get_decision_404_other_org(client_b: AsyncClient) -> None:
    """GET from org B on org A's decision returns 404 (tenant isolation)."""
    decision_id = uuid.uuid4()

    with patch(
        "app.routers.decisions.get_decision",
        new_callable=AsyncMock,
        side_effect=NotFoundError("Decision", str(decision_id)),
    ):
        response = await client_b.get(f"/api/v1/decisions/{decision_id}")

    assert response.status_code == 404


# --- POST /api/v1/decisions ---


async def test_create_decision_201(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions creates a new decision."""
    decision_id = uuid.uuid4()
    dept_id = uuid.uuid4()
    decision = _make_mock_decision(decision_id=decision_id)

    with patch(
        "app.routers.decisions.create_decision",
        new_callable=AsyncMock,
        return_value=decision,
    ):
        response = await client_a.post(
            "/api/v1/decisions",
            json={
                "departmentId": str(dept_id),
                "type": "overtime",
                "priority": "high",
                "title": "Test decision",
                "description": "Test description",
                "rationale": "Test rationale",
                "targetPeriod": {"startDate": "2026-02-10", "endDate": "2026-02-17"},
                "estimatedCost": 1500.00,
                "confidenceScore": 85.0,
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True


async def test_create_decision_422_invalid_type(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions rejects invalid decision type."""
    response = await client_a.post(
        "/api/v1/decisions",
        json={
            "departmentId": str(uuid.uuid4()),
            "type": "invalid_type",
            "priority": "high",
            "title": "Test",
            "description": "Test",
            "rationale": "Test",
            "targetPeriod": {},
            "confidenceScore": 50.0,
        },
    )

    assert response.status_code == 422


async def test_create_decision_422_confidence_out_of_range(
    client_a: AsyncClient,
) -> None:
    """POST /api/v1/decisions rejects confidence_score > 100."""
    response = await client_a.post(
        "/api/v1/decisions",
        json={
            "departmentId": str(uuid.uuid4()),
            "type": "overtime",
            "priority": "high",
            "title": "Test",
            "description": "Test",
            "rationale": "Test",
            "targetPeriod": {},
            "confidenceScore": 150.0,
        },
    )

    assert response.status_code == 422


async def test_create_decision_422_negative_cost(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions rejects negative estimated_cost."""
    response = await client_a.post(
        "/api/v1/decisions",
        json={
            "departmentId": str(uuid.uuid4()),
            "type": "overtime",
            "priority": "high",
            "title": "Test",
            "description": "Test",
            "rationale": "Test",
            "targetPeriod": {},
            "confidenceScore": 50.0,
            "estimatedCost": -100.0,
        },
    )

    assert response.status_code == 422


async def test_create_decision_403_viewer_role(mock_session: AsyncMock) -> None:
    """POST /api/v1/decisions returns 403 for viewer role."""
    from collections.abc import AsyncGenerator

    viewer_jwt = JWTPayload(
        user_id="viewer-001",
        email="viewer@test.com",
        organization_id=str(ORG_A_ID),
        role="viewer",
    )

    async def _override_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_session
    app.dependency_overrides[get_current_user] = lambda: viewer_jwt
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/decisions",
            json={
                "departmentId": str(uuid.uuid4()),
                "type": "overtime",
                "priority": "high",
                "title": "Test",
                "description": "Test",
                "rationale": "Test",
                "targetPeriod": {},
                "confidenceScore": 50.0,
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# --- PATCH /api/v1/decisions/{id}/review ---


async def test_review_decision_approve_200(client_a: AsyncClient) -> None:
    """PATCH /api/v1/decisions/{id}/review approves a decision."""
    decision_id = uuid.uuid4()
    reviewed_decision = _make_mock_decision(decision_id=decision_id, status="approved")
    reviewed_decision.reviewed_by = uuid.UUID("30000000-0000-0000-0000-000000000001")
    reviewed_decision.reviewed_at = datetime.now(UTC)

    with patch(
        "app.routers.decisions.review_decision",
        new_callable=AsyncMock,
        return_value=reviewed_decision,
    ):
        response = await client_a.patch(
            f"/api/v1/decisions/{decision_id}/review",
            json={"action": "approve", "notes": "Looks good"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "approved"


async def test_review_decision_reject_200(client_a: AsyncClient) -> None:
    """PATCH /api/v1/decisions/{id}/review rejects a decision."""
    decision_id = uuid.uuid4()
    rejected = _make_mock_decision(decision_id=decision_id, status="rejected")

    with patch(
        "app.routers.decisions.review_decision",
        new_callable=AsyncMock,
        return_value=rejected,
    ):
        response = await client_a.patch(
            f"/api/v1/decisions/{decision_id}/review",
            json={"action": "reject", "notes": "Too expensive"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["status"] == "rejected"


async def test_review_decision_defer_200(client_a: AsyncClient) -> None:
    """PATCH /api/v1/decisions/{id}/review defers a decision."""
    decision_id = uuid.uuid4()
    deferred = _make_mock_decision(decision_id=decision_id, status="pending_review")

    with patch(
        "app.routers.decisions.review_decision",
        new_callable=AsyncMock,
        return_value=deferred,
    ):
        response = await client_a.patch(
            f"/api/v1/decisions/{decision_id}/review",
            json={"action": "defer"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["status"] == "pending_review"


async def test_review_decision_invalid_action_422(client_a: AsyncClient) -> None:
    """PATCH /api/v1/decisions/{id}/review rejects invalid action."""
    decision_id = uuid.uuid4()

    response = await client_a.patch(
        f"/api/v1/decisions/{decision_id}/review",
        json={"action": "invalid_action"},
    )

    assert response.status_code == 422


async def test_review_decision_409_invalid_transition(client_a: AsyncClient) -> None:
    """PATCH /api/v1/decisions/{id}/review returns 409 for invalid transition."""
    decision_id = uuid.uuid4()

    with patch(
        "app.routers.decisions.review_decision",
        new_callable=AsyncMock,
        side_effect=InvalidTransitionError("implemented", "approve"),
    ):
        response = await client_a.patch(
            f"/api/v1/decisions/{decision_id}/review",
            json={"action": "approve"},
        )

    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "INVALID_TRANSITION"


async def test_review_decision_404_not_found(client_a: AsyncClient) -> None:
    """PATCH /api/v1/decisions/{id}/review returns 404 for unknown decision."""
    decision_id = uuid.uuid4()

    with patch(
        "app.routers.decisions.review_decision",
        new_callable=AsyncMock,
        side_effect=NotFoundError("Decision", str(decision_id)),
    ):
        response = await client_a.patch(
            f"/api/v1/decisions/{decision_id}/review",
            json={"action": "approve"},
        )

    assert response.status_code == 404


# --- POST /api/v1/decisions/{id}/outcome ---


async def test_record_outcome_201(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions/{id}/outcome records outcome."""
    decision_id = uuid.uuid4()
    implemented = _make_mock_decision(decision_id=decision_id, status="implemented")
    implemented.implemented_by = uuid.UUID("30000000-0000-0000-0000-000000000001")
    implemented.implemented_at = datetime.now(UTC)
    implemented.outcome = {
        "effective": True,
        "actual_cost": 1800.00,
        "actual_impact": "Success",
    }

    with patch(
        "app.routers.decisions.record_outcome",
        new_callable=AsyncMock,
        return_value=implemented,
    ):
        response = await client_a.post(
            f"/api/v1/decisions/{decision_id}/outcome",
            json={
                "effective": True,
                "actualCost": 1800.00,
                "actualImpact": "Implemented successfully",
                "lessonsLearned": "Start earlier next time",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "implemented"


async def test_record_outcome_409_not_approved(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions/{id}/outcome returns 409 if not approved."""
    decision_id = uuid.uuid4()

    with patch(
        "app.routers.decisions.record_outcome",
        new_callable=AsyncMock,
        side_effect=InvalidTransitionError("suggested", "record outcome"),
    ):
        response = await client_a.post(
            f"/api/v1/decisions/{decision_id}/outcome",
            json={
                "effective": True,
                "actualImpact": "N/A",
            },
        )

    assert response.status_code == 409


async def test_record_outcome_404_not_found(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions/{id}/outcome returns 404 for unknown decision."""
    decision_id = uuid.uuid4()

    with patch(
        "app.routers.decisions.record_outcome",
        new_callable=AsyncMock,
        side_effect=NotFoundError("Decision", str(decision_id)),
    ):
        response = await client_a.post(
            f"/api/v1/decisions/{decision_id}/outcome",
            json={
                "effective": False,
                "actualImpact": "Did not work",
            },
        )

    assert response.status_code == 404


async def test_record_outcome_422_negative_cost(client_a: AsyncClient) -> None:
    """POST /api/v1/decisions/{id}/outcome rejects negative actual_cost."""
    decision_id = uuid.uuid4()

    response = await client_a.post(
        f"/api/v1/decisions/{decision_id}/outcome",
        json={
            "effective": True,
            "actualCost": -500.00,
            "actualImpact": "Test",
        },
    )

    assert response.status_code == 422
