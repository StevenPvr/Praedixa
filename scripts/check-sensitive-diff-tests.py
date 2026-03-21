#!/usr/bin/env python3
"""Fail commit when sensitive security files change without security tests."""

from __future__ import annotations

import argparse
import fnmatch
import subprocess
from pathlib import Path

SENSITIVE_PATH_PATTERNS = (
    "app-api-ts/src/auth.ts",
    "app-api-ts/src/server.ts",
    "app-api-ts/src/routes.ts",
    "app-api-ts/src/config.ts",
    "app-api-ts/src/services/operational-data.ts",
    "app-api-ts/src/services/gold-explorer.ts",
    "app-connectors/src/config.ts",
    "app-connectors/src/server.ts",
    "app-connectors/src/routes.ts",
    "app-connectors/src/service.ts",
    "app-connectors/src/router.ts",
    "app-connectors/src/security.ts",
    "app-connectors/src/types.ts",
    "app-connectors/src/outbound-url.ts",
    "contracts/openapi/public.yaml",
    "app-landing/lib/api/form-route.ts",
    "app-landing/app/api/contact/route.ts",
    "app-landing/app/api/contact/challenge/route.ts",
    "app-landing/app/api/pilot-application/route.ts",
    "app-landing/app/api/scoping-call/route.ts",
    "app-webapp/lib/auth/**",
    "app-admin/lib/auth/**",
    "app-landing/lib/security/**",
    "app-webapp/lib/security/**",
    "app-admin/lib/security/**",
    "scripts/gate-*.sh",
    "scripts/security-*.yaml",
)

SECURITY_TEST_PATTERNS = (
    "app-api-ts/**/*.test.ts",
    "app-api-ts/**/*.test.tsx",
    "app-connectors/**/*.test.ts",
    "app-connectors/**/*.test.tsx",
    "app-webapp/**/__tests__/*.test.ts",
    "app-webapp/**/__tests__/*.test.tsx",
    "app-admin/**/__tests__/*.test.ts",
    "app-admin/**/__tests__/*.test.tsx",
    "app-landing/**/__tests__/*.test.ts",
    "app-landing/**/__tests__/*.test.tsx",
    "scripts/__tests__/*.test.mjs",
    "testing/e2e/**/*.spec.ts",
)

ABUSE_REQUIREMENTS = (
    {
        "name": "tenant-isolation",
        "critical_paths": (
            "app-api-ts/src/auth.ts",
            "app-api-ts/src/routes.ts",
        ),
        "required_tests": (
            "app-api-ts/src/__tests__/auth.test.ts",
        ),
    },
    {
        "name": "role-escalation",
        "critical_paths": (
            "app-api-ts/src/auth.ts",
            "app-api-ts/src/routes.ts",
            "app-webapp/lib/auth/**",
            "app-admin/lib/auth/**",
        ),
        "required_tests": (
            "app-api-ts/src/__tests__/server.test.ts",
        ),
    },
    {
        "name": "api-contract-and-routing",
        "critical_paths": (
            "app-api-ts/src/routes.ts",
            "contracts/openapi/public.yaml",
        ),
        "required_tests": (
            "app-api-ts/src/__tests__/auth.test.ts",
        ),
    },
    {
        "name": "transport-security-headers",
        "critical_paths": (
            "app-api-ts/src/server.ts",
        ),
        "required_tests": (
            "app-api-ts/src/__tests__/server.test.ts",
        ),
    },
    {
        "name": "site-scope-enforcement",
        "critical_paths": (
            "app-api-ts/src/routes.ts",
            "app-api-ts/src/services/operational-data.ts",
            "app-api-ts/src/services/gold-explorer.ts",
        ),
        "required_tests": (
            "app-api-ts/src/__tests__/operational-data.test.ts",
            "app-api-ts/src/__tests__/gold-explorer.test.ts",
        ),
    },
    {
        "name": "connectors-service-token-authz",
        "critical_paths": (
            "app-connectors/src/config.ts",
            "app-connectors/src/router.ts",
            "app-connectors/src/routes.ts",
            "app-connectors/src/server.ts",
            "app-connectors/src/types.ts",
        ),
        "required_tests": (
            "app-connectors/src/__tests__/config.test.ts",
            "app-connectors/src/__tests__/server.test.ts",
        ),
    },
    {
        "name": "connectors-outbound-runtime-hardening",
        "critical_paths": (
            "app-connectors/src/config.ts",
            "app-connectors/src/routes.ts",
            "app-connectors/src/service.ts",
            "app-connectors/src/outbound-url.ts",
            "app-connectors/src/oauth.ts",
        ),
        "required_tests": (
            "app-connectors/src/__tests__/config.test.ts",
            "app-connectors/src/__tests__/service.test.ts",
        ),
    },
    {
        "name": "landing-public-form-security",
        "critical_paths": (
            "app-landing/lib/api/form-route.ts",
            "app-landing/lib/security/**",
            "app-landing/app/api/contact/route.ts",
            "app-landing/app/api/contact/challenge/route.ts",
            "app-landing/app/api/pilot-application/route.ts",
            "app-landing/app/api/scoping-call/route.ts",
        ),
        "required_tests": (
            "app-landing/app/api/contact/__tests__/route.test.ts",
            "app-landing/app/api/contact/challenge/__tests__/route.test.ts",
            "app-landing/app/api/pilot-application/__tests__/route-security.test.ts",
            "app-landing/app/api/scoping-call/__tests__/route.test.ts",
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
            for path in staged_files
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
