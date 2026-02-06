"""Input sanitization and validation utilities."""

import re
import uuid
from uuid import UUID


def strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text)


def limit_string(text: str, max_length: int = 1000) -> str:
    """Truncate a string to max_length."""
    return text[:max_length] if len(text) > max_length else text


def sanitize_text(text: str, max_length: int = 1000) -> str:
    """Strip HTML and limit length."""
    return limit_string(strip_html(text.strip()), max_length)


def validate_uuid(value: str) -> UUID:
    """Validate and return a UUID, raising ValueError if invalid."""
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid UUID: {value}") from e


def sanitize_search_query(query: str) -> str:
    """Sanitize a search query — remove SQL injection patterns and special chars."""
    # Remove common SQL injection patterns
    dangerous_patterns = [
        r"('|--|;|/\*|\*/|xp_|sp_|exec|execute|union|select|insert|update|delete|drop|alter|create)",
    ]
    sanitized = query.strip()
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, "", sanitized, flags=re.IGNORECASE)
    # Limit length
    return limit_string(sanitized, 200)


def validate_horizon(horizon: int) -> int:
    """Validate forecast horizon (allowed: 3, 7, 14 days)."""
    allowed = {3, 7, 14}
    if horizon not in allowed:
        raise ValueError(f"Invalid horizon: {horizon}. Allowed: {allowed}")
    return horizon
