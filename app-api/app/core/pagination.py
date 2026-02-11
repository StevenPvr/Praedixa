"""Pagination helpers shared across routers."""

import math


def calculate_total_pages(total: int, page_size: int) -> int:
    """Return the number of pages needed to paginate *total* items.

    Always returns at least 1 (even when *total* is 0) so the response
    carries a valid ``total_pages`` field.
    """
    if page_size <= 0:
        return 1
    return max(1, math.ceil(total / page_size))
