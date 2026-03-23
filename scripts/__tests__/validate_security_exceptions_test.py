from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import date
from pathlib import Path

MODULE_PATH = (
    Path(__file__).resolve().parents[1] / "validate-security-exceptions.py"
)
SPEC = importlib.util.spec_from_file_location("validate_security_exceptions", MODULE_PATH)
assert SPEC is not None
assert SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)

ValidationContext = MODULE.ValidationContext
validate_exception = MODULE._validate_exception


def base_exception() -> dict[str, object]:
    return {
        "id": "SEC-EXC-TEST-0001",
        "tool": "npm-audit",
        "rule": "GHSA-test",
        "identifiers": ["GHSA-test"],
        "severity": "low",
        "scope": ["pnpm-lock.yaml"],
        "owner": "Steven (CTO)",
        "reviewer": "Security Lead (Praedixa)",
        "justification": "temporary accepted risk",
        "evidence": "docs/security/test.md",
        "removal_plan": "remove once upstream is fixed",
        "created_at": "2026-02-22",
        "expires_at": "2026-03-22",
        "status": "active",
    }


def validation_context(today: str = "2026-03-23") -> ValidationContext:
    return ValidationContext(
        today=date.fromisoformat(today),
        policy={
            "severity": {
                "low": {"allowed_exception": True},
            },
            "exceptions": {
                "fail_on_expired": True,
                "max_ttl_days": {"low": 30},
            },
        },
    )


class ValidateSecurityExceptionsTest(unittest.TestCase):
    def test_expired_active_exception_is_rejected(self) -> None:
        errors = validate_exception(base_exception(), validation_context())

        self.assertTrue(
            any("exception expired on 2026-03-22" in error for error in errors),
            errors,
        )

    def test_expired_resolved_exception_is_allowed(self) -> None:
        exception = base_exception()
        exception["status"] = "resolved"

        errors = validate_exception(exception, validation_context())

        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
