"""Tests for app.core.security — TenantFilter, SiteFilter, and require_role."""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.core.auth import JWTPayload
from app.core.security import SiteFilter, TenantFilter, require_role


class TestTenantFilter:
    """Test TenantFilter initialization and query application."""

    def test_init_stores_org_id(self) -> None:
        tf = TenantFilter("org-123")
        assert tf.organization_id == "org-123"

    def test_apply_adds_where_clause(self) -> None:
        """Verify that apply() adds a WHERE clause filtering by organization_id."""
        tf = TenantFilter("org-abc")

        # Create a mock model with an organization_id column
        model = MagicMock()
        model.organization_id = MagicMock()

        # Create a base query
        base_query = MagicMock()
        base_query.where.return_value = "filtered_query"

        result = tf.apply(base_query, model)
        base_query.where.assert_called_once()
        assert result == "filtered_query"

    def test_apply_with_sqlalchemy_select(self) -> None:
        """Verify compiled SQL contains organization_id filter."""
        from app.models.site import Site

        tf = TenantFilter("550e8400-e29b-41d4-a716-446655440000")
        query = tf.apply(select(Site), Site)

        # Compile to string to verify the WHERE clause is present
        compiled = str(query.compile(compile_kwargs={"literal_binds": False}))
        assert "organization_id" in compiled


class TestSiteFilter:
    """Test SiteFilter initialization and query application."""

    def test_init_stores_site_id(self) -> None:
        sf = SiteFilter("site-123")
        assert sf.site_id == "site-123"

    def test_init_stores_none(self) -> None:
        sf = SiteFilter(None)
        assert sf.site_id is None

    def test_apply_adds_where_clause_when_site_id_set(self) -> None:
        """Verify that apply() adds a WHERE clause filtering by site_id."""
        sf = SiteFilter("site-abc")

        model = MagicMock()
        model.site_id = MagicMock()

        base_query = MagicMock()
        base_query.where.return_value = "filtered_query"

        result = sf.apply(base_query, model)
        base_query.where.assert_called_once()
        assert result == "filtered_query"

    def test_apply_noop_when_site_id_none(self) -> None:
        """When site_id is None, apply() should return the query unchanged."""
        sf = SiteFilter(None)

        model = MagicMock()
        base_query = MagicMock()

        result = sf.apply(base_query, model)
        base_query.where.assert_not_called()
        assert result is base_query

    def test_apply_with_sqlalchemy_select(self) -> None:
        """Verify compiled SQL contains site_id filter."""
        from app.models.operational import CoverageAlert

        sf = SiteFilter("site-lyon")
        query = sf.apply(select(CoverageAlert), CoverageAlert)

        compiled = str(query.compile(compile_kwargs={"literal_binds": False}))
        assert "site_id" in compiled

    def test_apply_with_sqlalchemy_select_none(self) -> None:
        """Verify compiled SQL does NOT contain site_id filter when None."""
        from app.models.operational import CoverageAlert

        sf = SiteFilter(None)
        query = sf.apply(select(CoverageAlert), CoverageAlert)

        compiled = str(query.compile(compile_kwargs={"literal_binds": False}))
        # The query should not have a WHERE site_id clause
        assert "WHERE" not in compiled or "site_id" not in compiled


class TestRequireRole:
    """Test require_role dependency factory."""

    def test_authorized_role_returns_user(self) -> None:
        """User with an allowed role should be returned."""
        user = JWTPayload(
            user_id="u1", email="e@x.com", organization_id="o1", role="admin"
        )
        check_fn = require_role("admin", "manager")

        # The inner _check_role function has a `current_user` param.
        # We call it directly with the JWTPayload.
        result = check_fn(current_user=user)
        assert result is user

    def test_unauthorized_role_raises_403(self) -> None:
        """User with a role not in the allowed list should get 403."""
        user = JWTPayload(
            user_id="u1", email="e@x.com", organization_id="o1", role="viewer"
        )
        check_fn = require_role("admin", "manager")

        with pytest.raises(HTTPException) as exc_info:
            check_fn(current_user=user)
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in exc_info.value.detail

    def test_multiple_allowed_roles(self) -> None:
        """Any role in the allowed set should pass."""
        check_fn = require_role("admin", "manager", "hr_manager")

        for role in ["admin", "manager", "hr_manager"]:
            user = JWTPayload(
                user_id="u1", email="e@x.com", organization_id="o1", role=role
            )
            result = check_fn(current_user=user)
            assert result.role == role

    def test_single_allowed_role(self) -> None:
        check_fn = require_role("admin")
        user = JWTPayload(
            user_id="u1", email="e@x.com", organization_id="o1", role="admin"
        )
        assert check_fn(current_user=user) is user

    def test_error_message_does_not_leak_user_role(self) -> None:
        """Error detail should not reveal the user's actual role."""
        user = JWTPayload(
            user_id="u1", email="e@x.com", organization_id="o1", role="viewer"
        )
        check_fn = require_role("admin")

        with pytest.raises(HTTPException) as exc_info:
            check_fn(current_user=user)
        assert "viewer" not in exc_info.value.detail
