"""Tests for app.services.org_provisioning."""

import sys
import types
import uuid
from unittest.mock import AsyncMock

import pytest

from app.services.org_provisioning import provision_new_organization


@pytest.mark.asyncio
async def test_provision_new_organization_calls_seed_all(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seed_all = AsyncMock()
    fake_module = types.ModuleType("scripts.seed_full_demo")
    fake_module.seed_all = seed_all
    monkeypatch.setitem(sys.modules, "scripts.seed_full_demo", fake_module)

    session = AsyncMock()
    org_id = uuid.uuid4()

    await provision_new_organization(session, organization_id=org_id)

    seed_all.assert_awaited_once_with(
        session,
        target_org_id=org_id,
        strict_step4=True,
    )
