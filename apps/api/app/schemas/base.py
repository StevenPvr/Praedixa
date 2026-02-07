"""Base Pydantic schema with camelCase alias generation.

All API schemas inherit from CamelModel to ensure the JSON API
uses camelCase (matching the TypeScript shared-types convention)
while Python code uses snake_case.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
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
    """Query parameters for paginated list endpoints.

    IMPORTANT: sort_by must be validated against an allowlist of column names
    in the service/router layer before being used in ORDER BY clauses.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str | None = Field(default=None, max_length=50, pattern=r"^[a-z_]+$")
    sort_order: Literal["asc", "desc"] = "asc"
