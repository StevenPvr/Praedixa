"""Shared organization/site scoping validation helpers."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.core.exceptions import NotFoundError
from app.models.site import Site

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


async def validate_site_belongs_to_org(
    session: AsyncSession,
    target_org_id: uuid.UUID,
    site_id_str: str,
) -> uuid.UUID:
    """Validate that the site exists and belongs to the target organization."""
    try:
        site_uuid = uuid.UUID(site_id_str)
    except ValueError:
        raise NotFoundError("Site", site_id_str) from None

    site_exists = await session.execute(
        select(Site.id).where(
            Site.organization_id == target_org_id,
            Site.id == site_uuid,
        )
    )
    if not site_exists.scalar_one_or_none():
        raise NotFoundError("Site", site_id_str)
    return site_uuid
