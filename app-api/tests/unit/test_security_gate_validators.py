"""Tests for security gate validation helpers."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import yaml


def _write_yaml(path: Path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")


def test_validate_security_exceptions_rejects_high(tmp_path: Path) -> None:
    root = Path(__file__).resolve().parents[3]
    script = root / "scripts/validate-security-exceptions.py"

    policy = {
        "version": 1,
        "severity": {
            "critical": {"allowed_exception": False},
            "high": {"allowed_exception": False},
            "medium": {"allowed_exception": False},
            "low": {"allowed_exception": True},
        },
        "exceptions": {"max_ttl_days": {"low": 30}, "fail_on_expired": True},
    }
    exceptions = {
        "version": 1,
        "exceptions": [
            {
                "id": "SEC-TEST-001",
                "tool": "npm-audit",
                "rule": "GHSA-abc",
                "identifiers": ["GHSA-abc"],
                "severity": "high",
                "scope": ["pnpm-lock.yaml"],
                "owner": "Jane Doe",
                "reviewer": "John Reviewer",
                "justification": "Temporary",
                "evidence": "docs/security/security-posture-report.md",
                "created_at": "2026-02-22",
                "expires_at": "2026-02-23",
                "removal_plan": "Upgrade dependency",
                "status": "active",
            }
        ],
    }

    policy_path = tmp_path / "policy.yaml"
    exceptions_path = tmp_path / "exceptions.yaml"
    _write_yaml(policy_path, policy)
    _write_yaml(exceptions_path, exceptions)

    proc = subprocess.run(
        [
            sys.executable,
            str(script),
            "--policy-file",
            str(policy_path),
            "--exceptions-file",
            str(exceptions_path),
            "--today",
            "2026-02-22",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    assert "forbidden for severity 'high'" in proc.stdout


def test_validate_security_exceptions_emits_identifiers(tmp_path: Path) -> None:
    root = Path(__file__).resolve().parents[3]
    script = root / "scripts/validate-security-exceptions.py"

    policy = {
        "version": 1,
        "severity": {
            "critical": {"allowed_exception": False},
            "high": {"allowed_exception": False},
            "medium": {"allowed_exception": False},
            "low": {"allowed_exception": True},
        },
        "exceptions": {"max_ttl_days": {"low": 30}, "fail_on_expired": True},
    }
    exceptions = {
        "version": 1,
        "exceptions": [
            {
                "id": "SEC-TEST-LOW",
                "tool": "npm-audit",
                "rule": "GHSA-xyz",
                "identifiers": ["GHSA-xyz", "CVE-2026-0001"],
                "severity": "low",
                "scope": ["pnpm-lock.yaml"],
                "owner": "Jane Doe",
                "reviewer": "John Reviewer",
                "justification": "Tracked",
                "evidence": "docs/security/security-posture-report.md",
                "created_at": "2026-02-22",
                "expires_at": "2026-02-24",
                "removal_plan": "Upgrade dependency",
                "status": "active",
            }
        ],
    }

    policy_path = tmp_path / "policy.yaml"
    exceptions_path = tmp_path / "exceptions.yaml"
    _write_yaml(policy_path, policy)
    _write_yaml(exceptions_path, exceptions)

    proc = subprocess.run(
        [
            sys.executable,
            str(script),
            "--policy-file",
            str(policy_path),
            "--exceptions-file",
            str(exceptions_path),
            "--today",
            "2026-02-22",
            "--tool",
            "npm-audit",
            "--emit-identifiers",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 0
    assert "GHSA-xyz" in proc.stdout
    assert "CVE-2026-0001" in proc.stdout


def test_validate_security_exceptions_rejects_owner_as_reviewer(
    tmp_path: Path,
) -> None:
    root = Path(__file__).resolve().parents[3]
    script = root / "scripts/validate-security-exceptions.py"

    policy = {
        "version": 1,
        "severity": {
            "critical": {"allowed_exception": False},
            "high": {"allowed_exception": False},
            "medium": {"allowed_exception": False},
            "low": {"allowed_exception": True},
        },
        "exceptions": {"max_ttl_days": {"low": 30}, "fail_on_expired": True},
    }
    exceptions = {
        "version": 1,
        "exceptions": [
            {
                "id": "SEC-TEST-SAME-REVIEWER",
                "tool": "npm-audit",
                "rule": "GHSA-xyz",
                "identifiers": ["GHSA-xyz"],
                "severity": "low",
                "scope": ["pnpm-lock.yaml"],
                "owner": "Jane Doe",
                "reviewer": "Jane Doe",
                "justification": "Tracked",
                "evidence": "docs/security/security-posture-report.md",
                "created_at": "2026-02-22",
                "expires_at": "2026-02-24",
                "removal_plan": "Upgrade dependency",
                "status": "active",
            }
        ],
    }

    policy_path = tmp_path / "policy.yaml"
    exceptions_path = tmp_path / "exceptions.yaml"
    _write_yaml(policy_path, policy)
    _write_yaml(exceptions_path, exceptions)

    proc = subprocess.run(
        [
            sys.executable,
            str(script),
            "--policy-file",
            str(policy_path),
            "--exceptions-file",
            str(exceptions_path),
            "--today",
            "2026-02-22",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    assert "reviewer must be different from owner" in proc.stdout
