#!/usr/bin/env python3
"""Enforce versioned security invariants and abuse scenarios."""

from __future__ import annotations

import argparse
import fnmatch
import subprocess
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
INVARIANTS_PATH = ROOT / "docs/security/invariants/security-invariants.yaml"
ABUSE_PATH = ROOT / "docs/security/invariants/abuse-scenarios.yaml"


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Invalid YAML structure in {path}")
    return data


def _git_staged() -> list[str]:
    proc = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def _matches(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def _validate_schema(
    invariants: list[dict[str, Any]], abuse_scenarios: list[dict[str, Any]]
) -> list[str]:
    errors: list[str] = []

    for inv in invariants:
        inv_id = str(inv.get("id", "<missing-id>"))
        for field in ("id", "statement", "critical_paths", "required_tests"):
            if field not in inv:
                errors.append(f"{inv_id}: missing field '{field}'")
        if not isinstance(inv.get("critical_paths"), list) or not inv["critical_paths"]:
            errors.append(f"{inv_id}: critical_paths must be a non-empty list")
        if not isinstance(inv.get("required_tests"), list) or not inv["required_tests"]:
            errors.append(f"{inv_id}: required_tests must be a non-empty list")

    for abuse in abuse_scenarios:
        abuse_id = str(abuse.get("id", "<missing-id>"))
        for field in ("id", "title", "description", "required_tests"):
            if field not in abuse:
                errors.append(f"{abuse_id}: missing field '{field}'")
        if not isinstance(abuse.get("required_tests"), list) or not abuse["required_tests"]:
            errors.append(f"{abuse_id}: required_tests must be a non-empty list")

    return errors


def _run_full_invariant_tests(
    invariants: list[dict[str, Any]], abuse_scenarios: list[dict[str, Any]]
) -> int:
    grouped_tests: dict[str, set[str]] = {
        "@praedixa/api-ts": set(),
        "@praedixa/connectors": set(),
    }

    for inv in invariants:
        for test_path in inv.get("required_tests", []):
            if not isinstance(test_path, str):
                continue
            if test_path.startswith("app-api-ts/"):
                grouped_tests["@praedixa/api-ts"].add(test_path.removeprefix("app-api-ts/"))
            elif test_path.startswith("app-connectors/"):
                grouped_tests["@praedixa/connectors"].add(
                    test_path.removeprefix("app-connectors/")
                )

    for abuse in abuse_scenarios:
        for test_path in abuse.get("required_tests", []):
            if not isinstance(test_path, str):
                continue
            if test_path.startswith("app-api-ts/"):
                grouped_tests["@praedixa/api-ts"].add(test_path.removeprefix("app-api-ts/"))
            elif test_path.startswith("app-connectors/"):
                grouped_tests["@praedixa/connectors"].add(
                    test_path.removeprefix("app-connectors/")
                )

    total_tests = sum(len(paths) for paths in grouped_tests.values())
    if total_tests == 0:
        print("[invariants] No executable invariant tests declared")
        return 0

    for workspace, tests in grouped_tests.items():
        if not tests:
            continue
        ordered_tests = sorted(tests)
        print(
            "[invariants] Running declared invariant tests "
            f"for {workspace} ({len(ordered_tests)} file(s))"
        )
        cmd = ["pnpm", "--filter", workspace, "test", "--", "--run", *ordered_tests]
        proc = subprocess.run(cmd, cwd=ROOT)
        if proc.returncode != 0:
            return proc.returncode

    return 0


def _check_staged_coverage(invariants: list[dict[str, Any]], staged: list[str]) -> list[str]:
    staged_tests = [
        path for path in staged if ("__tests__/" in path or path.endswith(".test.ts") or path.endswith(".test.tsx"))
    ]
    errors: list[str] = []

    for inv in invariants:
        critical_paths = [str(p) for p in inv.get("critical_paths", [])]
        if not any(_matches(path, critical_paths) for path in staged):
            continue

        required_tests = [str(p) for p in inv.get("required_tests", [])]
        if not any(_matches(test_path, required_tests) for test_path in staged_tests):
            tests = ", ".join(required_tests)
            errors.append(
                f"{inv.get('id')}: critical path changed without staged test update "
                f"(expected one of: {tests})"
            )

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode",
        choices=("staged", "full"),
        default="staged",
        help="staged=diff guard, full=execute declared backend security tests",
    )
    args = parser.parse_args()

    invariants_doc = _load_yaml(INVARIANTS_PATH)
    abuse_doc = _load_yaml(ABUSE_PATH)

    invariants = invariants_doc.get("invariants")
    abuse_scenarios = abuse_doc.get("abuse_scenarios")

    if not isinstance(invariants, list) or not isinstance(abuse_scenarios, list):
        print("[invariants] Invalid schema: invariants/abuse_scenarios must be lists")
        return 1

    schema_errors = _validate_schema(invariants, abuse_scenarios)
    if schema_errors:
        print("[invariants] FAIL schema validation")
        for err in schema_errors:
            print(f"[invariants] {err}")
        return 1

    if args.mode == "full":
        return _run_full_invariant_tests(invariants, abuse_scenarios)

    staged_files = _git_staged()
    if not staged_files:
        print("[invariants] No staged files")
        return 0

    coverage_errors = _check_staged_coverage(invariants, staged_files)
    if coverage_errors:
        print("[invariants] FAIL staged coverage")
        for err in coverage_errors:
            print(f"[invariants] {err}")
        return 1

    print("[invariants] OK staged coverage")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
