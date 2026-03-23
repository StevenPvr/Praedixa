#!/usr/bin/env python3
"""Validate security exceptions against strict policy.

This validator is intentionally fail-closed:
- incomplete exceptions fail
- expired exceptions fail
- disallowed severities fail
- owner must be nominative (no generic team placeholders)
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml

SEVERITY_LEVELS = ("critical", "high", "medium", "low")
GENERIC_OWNERS = {
    "security-team",
    "security team",
    "team",
    "unknown",
    "tbd",
    "n/a",
}


@dataclass(frozen=True)
class ValidationContext:
    today: date
    policy: dict[str, Any]


def _parse_date(raw: str, field: str, exc_id: str) -> date:
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:  # pragma: no cover - exercised via caller
        raise ValueError(
            f"{exc_id}: invalid {field} date '{raw}' (expected YYYY-MM-DD)"
        ) from exc


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ValueError(f"Missing file: {path}")
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Invalid YAML root in {path}: expected mapping")
    return data


def _require_non_empty_string(value: Any, field: str, exc_id: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{exc_id}: field '{field}' must be a non-empty string")
    return value.strip()


def _validate_owner(owner: str, exc_id: str) -> None:
    normalized = owner.strip().lower()
    if normalized in GENERIC_OWNERS:
        raise ValueError(f"{exc_id}: owner must be nominative, got '{owner}'")
    if len(owner.split()) < 2 and "(" not in owner:
        raise ValueError(
            f"{exc_id}: owner must include nominative identity, got '{owner}'"
        )


def _validate_reviewer(reviewer: str, owner: str, exc_id: str) -> None:
    _validate_owner(reviewer, exc_id)
    if reviewer.strip().lower() == owner.strip().lower():
        raise ValueError(f"{exc_id}: reviewer must be different from owner")


def _validate_exception(exc: dict[str, Any], ctx: ValidationContext) -> list[str]:
    errors: list[str] = []
    exc_id = str(exc.get("id", "<missing-id>"))

    def _raiseable(fn: Any) -> None:
        try:
            fn()
        except ValueError as err:
            errors.append(str(err))

    required = (
        "id",
        "tool",
        "rule",
        "severity",
        "owner",
        "reviewer",
        "justification",
        "evidence",
        "removal_plan",
        "created_at",
        "expires_at",
        "status",
    )

    for field in required:
        _raiseable(lambda f=field: _require_non_empty_string(exc.get(f), f, exc_id))

    severity = str(exc.get("severity", "")).strip().lower()
    if severity not in SEVERITY_LEVELS:
        errors.append(
            f"{exc_id}: unsupported severity '{severity}' "
            f"(expected one of {', '.join(SEVERITY_LEVELS)})"
        )
        return errors

    owner = str(exc.get("owner", ""))
    reviewer = str(exc.get("reviewer", ""))
    _raiseable(lambda: _validate_owner(owner, exc_id))
    _raiseable(lambda: _validate_reviewer(reviewer, owner, exc_id))

    scope = exc.get("scope")
    if not isinstance(scope, list) or not scope or not all(
        isinstance(item, str) and item.strip() for item in scope
    ):
        errors.append(f"{exc_id}: scope must be a non-empty list of paths")

    identifiers = exc.get("identifiers")
    if not isinstance(identifiers, list) or not identifiers or not all(
        isinstance(item, str) and item.strip() for item in identifiers
    ):
        errors.append(f"{exc_id}: identifiers must be a non-empty list of strings")

    status = str(exc.get("status", "")).strip().lower()
    if status not in {"active", "resolved", "revoked"}:
        errors.append(
            f"{exc_id}: status must be one of active/resolved/revoked, got '{status}'"
        )

    try:
        created_at = _parse_date(str(exc.get("created_at", "")), "created_at", exc_id)
        expires_at = _parse_date(str(exc.get("expires_at", "")), "expires_at", exc_id)
    except ValueError as err:
        errors.append(str(err))
        return errors

    if expires_at <= created_at:
        errors.append(f"{exc_id}: expires_at must be after created_at")

    if (
        status == "active"
        and ctx.policy["exceptions"].get("fail_on_expired", True)
        and expires_at < ctx.today
    ):
        errors.append(f"{exc_id}: exception expired on {expires_at.isoformat()}")

    max_ttl_days = (
        ctx.policy.get("exceptions", {})
        .get("max_ttl_days", {})
        .get(severity)
    )
    if status == "active" and isinstance(max_ttl_days, int) and max_ttl_days > 0:
        ttl_days = (expires_at - created_at).days
        if ttl_days > max_ttl_days:
            errors.append(
                f"{exc_id}: ttl {ttl_days}d exceeds max_ttl_days={max_ttl_days}d "
                f"for severity '{severity}'"
            )

    allowed = bool(ctx.policy.get("severity", {}).get(severity, {}).get("allowed_exception"))
    if status == "active" and not allowed:
        errors.append(
            f"{exc_id}: exceptions are forbidden for severity '{severity}' "
            "by security policy"
        )

    return errors


def _collect_active_identifiers(
    exceptions: list[dict[str, Any]],
    *,
    today: date,
    tool: str | None,
) -> list[str]:
    identifiers: set[str] = set()
    for exc in exceptions:
        if str(exc.get("status", "")).strip().lower() != "active":
            continue
        if tool and str(exc.get("tool", "")).strip() != tool:
            continue
        try:
            expires_at = _parse_date(
                str(exc.get("expires_at", "")), "expires_at", str(exc.get("id", ""))
            )
        except ValueError:
            continue
        if expires_at < today:
            continue

        for identifier in exc.get("identifiers", []):
            if isinstance(identifier, str) and identifier.strip():
                identifiers.add(identifier.strip())
    return sorted(identifiers)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--exceptions-file",
        default="scripts/security-exceptions.yaml",
        help="Path to structured security exceptions file",
    )
    parser.add_argument(
        "--policy-file",
        default="scripts/security-policy.yaml",
        help="Path to security policy file",
    )
    parser.add_argument(
        "--today",
        default=date.today().isoformat(),
        help="Override current date (YYYY-MM-DD) for deterministic checks",
    )
    parser.add_argument(
        "--tool",
        default=None,
        help="Filter by tool when emitting identifiers (example: npm-audit)",
    )
    parser.add_argument(
        "--emit-identifiers",
        action="store_true",
        help="Emit active identifiers as JSON array after validation",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress success logs (errors are always printed)",
    )

    args = parser.parse_args()

    try:
        today = date.fromisoformat(args.today)
    except ValueError:
        print(f"[exceptions] Invalid --today value: {args.today}")
        return 1

    try:
        policy = _load_yaml(Path(args.policy_file))
        exceptions_doc = _load_yaml(Path(args.exceptions_file))
    except ValueError as err:
        print(f"[exceptions] {err}")
        return 1

    exceptions = exceptions_doc.get("exceptions")
    if not isinstance(exceptions, list):
        print("[exceptions] Invalid schema: 'exceptions' must be a list")
        return 1

    ctx = ValidationContext(today=today, policy=policy)
    errors: list[str] = []
    for item in exceptions:
        if not isinstance(item, dict):
            errors.append("<unknown>: each exception entry must be a mapping")
            continue
        errors.extend(_validate_exception(item, ctx))

    if errors:
        for error in errors:
            print(f"[exceptions] {error}")
        return 1

    if args.emit_identifiers:
        ids = _collect_active_identifiers(exceptions, today=today, tool=args.tool)
        print(json.dumps(ids))
        return 0

    if not args.quiet:
        print(f"[exceptions] OK ({len(exceptions)} exception(s) validated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
