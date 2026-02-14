"""Pagination helpers."""

import math


def calculate_total_pages(total: int, page_size: int) -> int:
    if page_size <= 0:
        return 1
    return max(1, math.ceil(total / page_size))
