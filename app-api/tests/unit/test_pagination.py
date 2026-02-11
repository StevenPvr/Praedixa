"""Tests for app.core.pagination helpers."""

from app.core.pagination import calculate_total_pages


class TestCalculateTotalPages:
    def test_zero_total(self) -> None:
        assert calculate_total_pages(0, 10) == 1

    def test_exact_division(self) -> None:
        assert calculate_total_pages(20, 10) == 2

    def test_remainder(self) -> None:
        assert calculate_total_pages(11, 5) == 3

    def test_one_item(self) -> None:
        assert calculate_total_pages(1, 10) == 1

    def test_page_size_larger_than_total(self) -> None:
        assert calculate_total_pages(3, 100) == 1

    def test_page_size_one(self) -> None:
        assert calculate_total_pages(5, 1) == 5

    def test_page_size_zero_or_negative(self) -> None:
        assert calculate_total_pages(10, 0) == 1
        assert calculate_total_pages(10, -1) == 1
