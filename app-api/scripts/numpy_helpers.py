"""Small NumPy adapter helpers with editor-friendly local symbols."""

from __future__ import annotations

from typing import Any

import numpy as np


def array(values: Any, *, dtype: Any = None) -> Any:
    return np.array(values, dtype=dtype)


def column_stack(values: Any) -> Any:
    return np.column_stack(values)


def corrcoef(values: Any, other: Any) -> Any:
    return np.corrcoef(values, other)


def eye(size: Any) -> Any:
    return np.eye(size)


def mean(values: Any) -> Any:
    return np.mean(values)


def median(values: Any) -> Any:
    return np.median(values)


def ones(size: Any) -> Any:
    return np.ones(size)


def percentile(values: Any, q: Any) -> Any:
    return np.percentile(values, q)


def solve(lhs: Any, rhs: Any) -> Any:
    return np.linalg.solve(lhs, rhs)


def std(values: Any) -> Any:
    return np.std(values)


def sum_(values: Any) -> Any:
    return np.sum(values)
