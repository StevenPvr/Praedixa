"""Pagination helpers."""

import math

_DEFAULT_PAGE = 1
_DEFAULT_PAGE_SIZE = 20
_MAX_PAGE_SIZE = 200


def calculate_total_pages(total: int, page_size: int) -> int:
    if page_size <= 0:
        return 1
    return max(1, math.ceil(total / page_size))


def normalize_page_window(
    page: int,
    page_size: int,
    *,
    default_page_size: int = _DEFAULT_PAGE_SIZE,
    max_page_size: int = _MAX_PAGE_SIZE,
) -> tuple[int, int, int]:
    """Clamp page/page_size to safe values and return computed offset."""
    if default_page_size <= 0:
        raise ValueError("default_page_size must be > 0")
    if max_page_size <= 0:
        raise ValueError("max_page_size must be > 0")
    if max_page_size < default_page_size:
        raise ValueError("max_page_size must be >= default_page_size")

    normalized_page = max(_DEFAULT_PAGE, page)
    if page_size <= 0:
        normalized_page_size = default_page_size
    else:
        normalized_page_size = min(page_size, max_page_size)

    return (
        normalized_page,
        normalized_page_size,
        (normalized_page - 1) * normalized_page_size,
    )


def normalize_limit_offset(
    limit: int,
    offset: int,
    *,
    default_limit: int = _DEFAULT_PAGE_SIZE,
    max_limit: int = _MAX_PAGE_SIZE,
) -> tuple[int, int]:
    """Clamp LIMIT/OFFSET values used by service-layer queries."""
    if default_limit <= 0:
        raise ValueError("default_limit must be > 0")
    if max_limit <= 0:
        raise ValueError("max_limit must be > 0")
    if max_limit < default_limit:
        raise ValueError("max_limit must be >= default_limit")

    normalized_limit = default_limit if limit <= 0 else min(limit, max_limit)
    normalized_offset = max(0, offset)
    return normalized_limit, normalized_offset
