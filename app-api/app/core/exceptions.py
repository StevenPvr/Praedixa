"""Domain exceptions shared by data engineering and ML services."""

import re

_UUID_REGEX: re.Pattern[str] = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE,
)


class PraedixaError(Exception):
    """Base typed exception for domain/data errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict[str, str] | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(PraedixaError):
    """Typed not-found error with safe details."""

    def __init__(self, resource: str, resource_id: str) -> None:
        details: dict[str, str] = {"resource": resource}
        if _UUID_REGEX.fullmatch(resource_id):
            details["id"] = resource_id

        super().__init__(
            message=f"{resource} not found",
            code="NOT_FOUND",
            status_code=404,
            details=details,
        )


class ForbiddenError(PraedixaError):
    """Access forbidden."""

    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class ConflictError(PraedixaError):
    """Resource conflict (duplicate/state conflict)."""

    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="CONFLICT", status_code=409)
