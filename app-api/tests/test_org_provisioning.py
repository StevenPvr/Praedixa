from __future__ import annotations

import ast
import inspect
import uuid
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from app.core.ddl_validation import validate_client_slug
from app.core.exceptions import PraedixaError
from app.services import organization_foundation
from app.services.org_provisioning import provision_new_organization


def _list_import_modules(source_path: Path) -> set[str]:
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module is not None:
            modules.add(node.module)
    return modules


def test_provision_organization_foundation_requires_explicit_organization_id() -> None:
    signature = inspect.signature(
        organization_foundation.provision_organization_foundation
    )
    assert signature.parameters["organization_id"].default is inspect._empty


def test_organization_foundation_has_no_seed_full_demo_dependency() -> None:
    module_path = Path(organization_foundation.__file__)
    imported_modules = _list_import_modules(module_path)

    assert all("seed_full_demo" not in module for module in imported_modules)


def test_schema_safe_slug_uses_collision_resistant_fallbacks_for_long_slugs() -> None:
    slug_a = organization_foundation._schema_safe_slug(
        "this-is-a-very-long-organization-slug-that-would-otherwise-collide-a"
    )
    slug_b = organization_foundation._schema_safe_slug(
        "this-is-a-very-long-organization-slug-that-would-otherwise-collide-b"
    )

    assert slug_a != slug_b
    assert slug_a.startswith("tenant_")
    assert slug_b.startswith("tenant_")
    assert len(slug_a) <= 35
    assert len(slug_b) <= 35
    assert validate_client_slug(slug_a) == slug_a
    assert validate_client_slug(slug_b) == slug_b


@pytest.mark.asyncio
async def test_provision_new_organization_uses_foundation_bootstrap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock()
    organization_id = uuid.uuid4()
    captured: dict[str, object] = {}

    async def fake_foundation_bootstrap(
        current_session: AsyncMock,
        *,
        organization_id: uuid.UUID,
    ) -> None:
        captured["session"] = current_session
        captured["organization_id"] = organization_id

    monkeypatch.setattr(
        "app.services.org_provisioning.provision_organization_foundation",
        fake_foundation_bootstrap,
    )

    await provision_new_organization(session, organization_id=organization_id)

    assert captured == {
        "session": session,
        "organization_id": organization_id,
    }


@pytest.mark.asyncio
async def test_provision_new_organization_wraps_bootstrap_failures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    organization_id = uuid.uuid4()

    async def failing_foundation_bootstrap(
        current_session: AsyncMock,
        *,
        organization_id: uuid.UUID,
    ) -> None:
        del current_session, organization_id
        raise RuntimeError("ddl missing")

    monkeypatch.setattr(
        "app.services.org_provisioning.provision_organization_foundation",
        failing_foundation_bootstrap,
    )

    with pytest.raises(PraedixaError) as error:
        await provision_new_organization(AsyncMock(), organization_id=organization_id)

    assert error.value.code == "ORG_PROVISIONING_FAILED"
    assert error.value.details == {
        "org_id": str(organization_id),
        "cause": "ddl missing",
    }
