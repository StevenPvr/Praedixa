"""Base Pydantic schema with camelCase alias generation.

All API schemas inherit from CamelModel to ensure the JSON API
uses camelCase (matching the TypeScript shared-types convention)
while Python code uses snake_case.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model with camelCase JSON aliases.

    - alias_generator=to_camel: snake_case -> camelCase for serialization
    - populate_by_name=True: allows both camelCase and snake_case in input
    - from_attributes=True: allows creating from SQLAlchemy model instances
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class TimestampSchema(CamelModel):
    """Audit timestamps for responses."""

    created_at: datetime
    updated_at: datetime


class TenantEntitySchema(TimestampSchema):
    """Base for tenant-scoped response schemas."""

    id: uuid.UUID
    organization_id: uuid.UUID


class PaginationMeta(CamelModel):
    """Pagination metadata for list endpoints."""

    total: int
    page: int
    page_size: int
    total_pages: int
    has_next_page: bool
    has_previous_page: bool


class PaginationParams(CamelModel):
    """Query parameters for paginated list endpoints."""

    page: int = 1
    page_size: int = 20
    sort_by: str | None = None
    sort_order: str = "asc"  # "asc" | "desc"
