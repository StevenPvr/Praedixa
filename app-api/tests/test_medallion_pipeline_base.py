from datetime import date

import pytest

from scripts.medallion_pipeline_base import coerce_scalar, to_float


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, None),
        (True, None),
        (False, None),
        (42, 42.0),
        (3.5, 3.5),
        (float("nan"), None),
        ("na", None),
        (" 1 234,50 ", 1234.5),
        ("1.234,56", 1234.56),
        ("1,234.56", 1234.56),
        (" 7 ", 7.0),
        ("abc", None),
    ],
)
def test_to_float_normalizes_common_numeric_formats(
    value: object, expected: float | None
) -> None:
    assert to_float(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, None),
        (True, True),
        (False, False),
        ("  yes ", True),
        ("FALSE", False),
        ("  non ", False),
        (" 2024-03-01 ", "2024-03-01"),
        ("01/03/2024", "2024-03-01"),
        (" 1 234,0 ", 1234),
        ("12,5", 12.5),
        ("  keep me  ", "keep me"),
        (date(2024, 3, 1), "2024-03-01"),
    ],
)
def test_coerce_scalar_preserves_scalar_contract(
    value: object, expected: object
) -> None:
    assert coerce_scalar(value) == expected


def test_coerce_scalar_passthroughs_unknown_objects() -> None:
    sentinel = object()

    assert coerce_scalar(sentinel) is sentinel
