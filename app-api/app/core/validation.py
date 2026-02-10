"""Input sanitization and validation utilities.

Security notes:
- All sanitization uses allowlist-based approaches, never denylists.
- SQL injection prevention is handled by SQLAlchemy parameterized queries,
  NOT by string sanitization. The sanitize_search_query function uses an
  allowlist of safe characters rather than trying to block SQL patterns.
- HTML entity encoding is used instead of regex stripping to prevent bypass.
- UUID validation never reflects user input in error messages.
"""

import html
import re
import uuid
from uuid import UUID

# Allowlist: alphanumeric, spaces, hyphens, accented chars (French support)
_SEARCH_QUERY_ALLOWLIST = re.compile(r"[^\w\s\-àâäéèêëïîôùûüÿçœæ]", re.UNICODE)


def html_encode(text: str) -> str:
    """HTML-entity-encode a string to prevent XSS in any output context."""
    return html.escape(text, quote=True)


def limit_string(text: str, max_length: int = 1000) -> str:
    """Truncate a string to max_length."""
    return text[:max_length] if len(text) > max_length else text


def sanitize_text(text: str, max_length: int = 1000) -> str:
    """HTML-encode and limit length.

    Uses html.escape() instead of regex tag stripping because regex-based
    HTML removal is trivially bypassable (e.g. unclosed tags, nested encodings).
    """
    return limit_string(html_encode(text.strip()), max_length)


def validate_uuid(value: str) -> UUID:
    """Validate and return a UUID, raising ValueError if invalid.

    Never reflects the input value in the error message to prevent
    log injection or XSS via crafted UUID-like strings.
    """
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError) as e:
        raise ValueError("Invalid UUID format") from e


def sanitize_search_query(query: str) -> str:
    """Sanitize a search query using allowlist of safe characters.

    Security: SQL injection prevention is NOT this function's job — that is
    handled by SQLAlchemy's parameterized queries. This function strips
    characters that have no business being in a search query to reduce
    attack surface for log injection and display-level XSS.
    """
    sanitized = query.strip()
    # Remove any character not in the allowlist
    sanitized = _SEARCH_QUERY_ALLOWLIST.sub("", sanitized)
    return limit_string(sanitized, 200)


def validate_horizon(horizon: int) -> int:
    """Validate forecast horizon (allowed: 3, 7, 14 days)."""
    allowed = {3, 7, 14}
    if horizon not in allowed:
        raise ValueError(f"Invalid horizon: {horizon}. Allowed: {allowed}")
    return horizon
