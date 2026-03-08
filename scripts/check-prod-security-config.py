#!/usr/bin/env python3
"""Blocking checks for production security configuration."""

from __future__ import annotations

import argparse
import fnmatch
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATTERNS: dict[str, tuple[str, ...]] = {
    "app-api-ts/src/server.ts": (
        '"X-Content-Type-Options": "nosniff"',
        '"X-Frame-Options": "DENY"',
        '"Referrer-Policy": "no-referrer"',
        '"Strict-Transport-Security":',
    ),
    "app-api/app/core/config.py": (
        "DEBUG must be false in staging/production",
        "KEY_PROVIDER must be 'scaleway' in staging/production",
        "LOCAL_KEY_SEED must be configured when KEY_PROVIDER=local",
    ),
    "app-webapp/lib/security/headers.ts": (
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "Permissions-Policy",
    ),
    "app-admin/lib/security/headers.ts": (
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "Permissions-Policy",
    ),
    "app-landing/lib/security/headers.ts": (
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "Permissions-Policy",
    ),
    "app-webapp/lib/auth/oidc/cookies.ts": (
        "httpOnly: true",
        'sameSite: "lax"',
        "secure,",
    ),
    "app-admin/lib/auth/oidc.ts": ("httpOnly: true", 'sameSite: "lax"', "secure,"),
    "app-webapp/app/auth/login/route.ts": (
        "httpOnly: true",
        'sameSite: "lax"',
        "secure,",
    ),
    "app-admin/app/auth/login/route.ts": (
        "httpOnly: true",
        'sameSite: "lax"',
        "secure,",
    ),
}

RISKY_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"allow_origins\s*=\s*\[\s*['\"]\*['\"]\s*\]"),
        "Wildcard CORS allowlist is forbidden",
    ),
    (
        re.compile(r"Access-Control-Allow-Origin\s*[:=]\s*['\"]\*['\"]"),
        "Wildcard Access-Control-Allow-Origin is forbidden",
    ),
    (
        re.compile(r"(?i)TODO.*(disable|bypass|skip).*(auth|security|csrf|tenant)"),
        "Security bypass marker found",
    ),
    (
        re.compile(
            r"\b(API_KEY|SECRET|TOKEN|PASSWORD|JWT_SECRET)\b\s*=\s*['\"][^'\"]{8,}['\"]"
        ),
        "Potential hardcoded secret detected",
    ),
    (
        re.compile(r"\bsecure\s*:\s*false\b"),
        "Cookie secure=false detected",
    ),
)

EXCLUDE_GLOBS = (
    "**/__tests__/**",
    "**/*.test.*",
    "**/tests/**",
    "testing/**",
    "docs/**",
    "scripts/semgrep/**",
    "scripts/check-prod-security-config.py",
    "**/.next/**",
    "node_modules/**",
    "coverage/**",
)


def _is_excluded(path: str) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in EXCLUDE_GLOBS)


def _git_files() -> list[str]:
    proc = subprocess.run(
        ["git", "ls-files"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def _staged_files() -> list[str]:
    proc = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def _scan_files(mode: str) -> list[str]:
    if mode == "staged":
        files = _staged_files()
    else:
        files = _git_files()

    allowed_suffixes = {
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs",
        ".yaml",
        ".yml",
        ".json",
    }

    filtered = []
    for path in files:
        abs_path = ROOT / path
        if not abs_path.exists() or not abs_path.is_file():
            continue
        suffix = Path(path).suffix
        if suffix not in allowed_suffixes:
            continue
        if _is_excluded(path):
            continue
        filtered.append(path)
    return filtered


def _read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def _validate_required_patterns() -> list[str]:
    errors: list[str] = []
    for rel_path, patterns in REQUIRED_PATTERNS.items():
        abs_path = ROOT / rel_path
        if not abs_path.exists():
            errors.append(f"Missing required security file: {rel_path}")
            continue

        content = _read(rel_path)
        for pattern in patterns:
            if pattern not in content:
                errors.append(
                    f"Missing required security pattern in {rel_path}: {pattern}"
                )
    return errors


def _scan_risky_patterns(paths: list[str]) -> list[str]:
    errors: list[str] = []
    for rel_path in paths:
        try:
            content = _read(rel_path)
        except UnicodeDecodeError:
            continue

        for regex, message in RISKY_PATTERNS:
            if regex.search(content):
                errors.append(f"{rel_path}: {message}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode",
        choices=("staged", "full"),
        default="staged",
        help="staged scans only changed files, full scans tracked code",
    )
    args = parser.parse_args()

    errors = []
    errors.extend(_validate_required_patterns())

    scan_paths = _scan_files(args.mode)
    errors.extend(_scan_risky_patterns(scan_paths))

    if errors:
        print("[prod-config] FAIL")
        for err in errors:
            print(f"[prod-config] {err}")
        return 1

    print(f"[prod-config] OK ({args.mode}, scanned={len(scan_paths)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
