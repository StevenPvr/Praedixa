"""Data/ML engine tests."""

from __future__ import annotations

import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://praedixa_test:secure_test_password@localhost:5433/praedixa_test",
)
os.environ.setdefault(
    "LOCAL_KEY_SEED",
    "praedixa-local-test-seed-1234567890",
)
