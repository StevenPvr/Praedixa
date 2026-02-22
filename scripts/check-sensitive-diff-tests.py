#!/usr/bin/env python3
"""Fail commit when sensitive security files change without security tests."""

from __future__ import annotations

import argparse
import fnmatch
import subprocess
from pathlib import Path

SENSITIVE_PATH_PATTERNS = (
    "app-api/app/core/auth.py",
    "app-api/app/core/security.py",
    "app-api/app/core/config.py",
    "app-api/app/routers/admin*.py",
    "app-api/app/routers/*auth*.py",
    "app-api/app/routers/*security*.py",
    "app-webapp/lib/auth/**",
    "app-admin/lib/auth/**",
    "app-landing/lib/security/**",
    "app-webapp/lib/security/**",
    "app-admin/lib/security/**",
    "scripts/gate-*.sh",
    "scripts/security-*.yaml",
)

SECURITY_TEST_PATTERNS = (
    "app-api/tests/security/test_*.py",
    "app-api/tests/unit/test_*security*.py",
    "app-api/tests/unit/test_*auth*.py",
    "app-api/tests/unit/test_*config*.py",
    "app-webapp/**/__tests__/*.test.ts",
    "app-webapp/**/__tests__/*.test.tsx",
    "app-admin/**/__tests__/*.test.ts",
    "app-admin/**/__tests__/*.test.tsx",
    "app-landing/**/__tests__/*.test.ts",
    "app-landing/**/__tests__/*.test.tsx",
    "testing/e2e/**/*.spec.ts",
)

ABUSE_REQUIREMENTS = (
    {
        "name": "tenant-isolation",
        "critical_paths": (
            "app-api/app/core/security.py",
            "app-api/app/routers/organizations.py",
            "app-api/app/routers/decisions.py",
            "app-api/app/routers/alerts.py",
            "app-api/app/routers/arbitrage.py",
            "app-api/app/routers/admin*.py",
        ),
        "required_tests": (
            "app-api/tests/security/test_tenant_isolation.py",
            "app-api/tests/security/test_operational_isolation.py",
            "app-api/tests/security/test_data_catalog_isolation.py",
        ),
    },
    {
        "name": "role-escalation",
        "critical_paths": (
            "app-api/app/core/auth.py",
            "app-api/app/routers/admin*.py",
            "app-webapp/lib/auth/**",
            "app-admin/lib/auth/**",
        ),
        "required_tests": (
            "app-api/tests/security/test_admin_role_escalation.py",
            "app-api/tests/security/test_admin_cross_tenant.py",
        ),
    },
    {
        "name": "workflow-bypass-and-replay",
        "critical_paths": (
            "app-api/app/routers/admin.py",
            "app-api/app/services/**",
            "app-api/app/models/**",
        ),
        "required_tests": (
            "app-api/tests/security/test_rgpd_bypass.py",
            "app-api/tests/security/test_scenario_engine_integrity.py",
        ),
    },
    {
        "name": "rate-limit-and-abuse",
        "critical_paths": (
            "app-api/app/core/rate_limit.py",
            "app-api/app/main.py",
            "app-api/app/routers/contact_requests.py",
        ),
        "required_tests": (
            "app-api/tests/security/test_rate_limit_bypass.py",
            "app-api/tests/security/test_rate_limits.py",
        ),
    },
)


def _get_staged_files() -> list[str]:
    proc = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def _matches_any(path: str, patterns: tuple[str, ...]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def _normalize(paths: list[str]) -> list[str]:
    return [str(Path(path)) for path in paths]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--allow-empty-diff",
        action="store_true",
        help="Return success when no staged file exists",
    )
    args = parser.parse_args()

    staged_files = _normalize(_get_staged_files())
    if not staged_files:
        if args.allow_empty_diff:
            print("[sensitive-diff] No staged changes")
            return 0
        print("[sensitive-diff] No staged changes to validate")
        return 0

    sensitive_changed = [
        path
        for path in staged_files
        if _matches_any(path, tuple(SENSITIVE_PATH_PATTERNS))
    ]
    staged_tests = [
        path
        for path in staged_files
        if _matches_any(path, tuple(SECURITY_TEST_PATTERNS))
    ]

    errors: list[str] = []

    if sensitive_changed and not staged_tests:
        errors.append(
            "Sensitive security/config files changed without any staged security test."
        )

    for requirement in ABUSE_REQUIREMENTS:
        if not any(
            _matches_any(path, tuple(requirement["critical_paths"]))
            for path in sensitive_changed
        ):
            continue

        if not any(
            _matches_any(path, tuple(requirement["required_tests"]))
            for path in staged_tests
        ):
            tests = ", ".join(requirement["required_tests"])
            errors.append(
                "Critical flow changed without required abuse test update "
                f"for '{requirement['name']}'. Expected one of: {tests}"
            )

    if errors:
        print("[sensitive-diff] FAIL")
        print("[sensitive-diff] Sensitive files changed:")
        for path in sensitive_changed:
            print(f"  - {path}")
        print("[sensitive-diff] Staged security tests:")
        for path in staged_tests:
            print(f"  - {path}")
        for err in errors:
            print(f"[sensitive-diff] {err}")
        return 1

    if sensitive_changed:
        print(
            "[sensitive-diff] OK "
            f"({len(sensitive_changed)} sensitive file(s), {len(staged_tests)} test(s))"
        )
    else:
        print("[sensitive-diff] OK (no sensitive file changed)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
