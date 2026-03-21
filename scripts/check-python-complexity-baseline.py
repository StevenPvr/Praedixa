#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = ROOT_DIR / "scripts" / "python-complexity-baseline.json"
XENON_COMMAND = [
    "uv",
    "tool",
    "run",
    "--from",
    "xenon",
    "xenon",
    "--max-absolute",
    "A",
    "--max-modules",
    "A",
    "--max-average",
    "A",
    "app-api/app",
]
VIOLATION_PATTERN = re.compile(
    r"ERROR:xenon:(block|module) [\"'](.+?)[\"'] has a rank of ([A-F])$"
)
BLOCK_TARGET_LINE_PATTERN = re.compile(r"^(.+?\.py):\d+( .+)$")
RANK_ORDER = {rank: index for index, rank in enumerate(["A", "B", "C", "D", "E", "F"], start=1)}


@dataclass(frozen=True)
class Violation:
    type: str
    target: str
    rank: str

    @property
    def key(self) -> tuple[str, str]:
        return (self.type, self.target)


def _sort_violations(violations: list[Violation]) -> list[Violation]:
    return sorted(violations, key=lambda violation: (violation.type, violation.target))


def _normalize_target(violation_type: str, target: str) -> str:
    if violation_type != "block":
        return target
    match = BLOCK_TARGET_LINE_PATTERN.match(target)
    if match is None:
        return target
    return f"{match.group(1)}{match.group(2)}"


def _run_xenon() -> tuple[int, list[Violation], str]:
    completed = subprocess.run(
        XENON_COMMAND,
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        check=False,
    )
    output = "\n".join(
        chunk for chunk in (completed.stdout.strip(), completed.stderr.strip()) if chunk
    )
    violations: list[Violation] = []
    for line in output.splitlines():
        match = VIOLATION_PATTERN.match(line.strip())
        if match is None:
            continue
        violations.append(
            Violation(
                type=match.group(1),
                target=_normalize_target(match.group(1), match.group(2)),
                rank=match.group(3),
            )
        )
    return completed.returncode, violations, output


def _load_baseline(path: Path) -> dict[tuple[str, str], Violation]:
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("entries")
    if not isinstance(entries, list):
        raise ValueError("Baseline JSON must contain an 'entries' list")

    baseline: dict[tuple[str, str], Violation] = {}
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError("Baseline entries must be objects")
        violation = Violation(
            type=str(item["type"]),
            target=_normalize_target(str(item["type"]), str(item["target"])),
            rank=str(item["rank"]),
        )
        if violation.rank not in RANK_ORDER:
            raise ValueError(f"Unsupported rank in baseline: {violation.rank}")
        baseline[violation.key] = violation
    return baseline


def _write_baseline(path: Path, violations: list[Violation]) -> None:
    payload = {
        "schema_version": 1,
        "tool": "xenon",
        "threshold": "A",
        "entries": [
            {"type": violation.type, "target": violation.target, "rank": violation.rank}
            for violation in sorted(violations, key=lambda item: (item.type, item.target))
        ],
    }
    path.write_text(f"{json.dumps(payload, indent=2, ensure_ascii=False)}\n", encoding="utf-8")


def _rank_is_worse(current: str, baseline: str) -> bool:
    return RANK_ORDER[current] > RANK_ORDER[baseline]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Block Python complexity regressions against a versioned xenon baseline."
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=DEFAULT_BASELINE,
        help="Path to the committed complexity baseline JSON file.",
    )
    parser.add_argument(
        "--write-current-baseline",
        action="store_true",
        help="Write the current xenon violations to the baseline file and exit.",
    )
    args = parser.parse_args()

    returncode, violations, output = _run_xenon()
    if returncode not in (0, 1):
        sys.stderr.write(output + ("\n" if output else ""))
        sys.stderr.write("[complexity] xenon execution failed unexpectedly\n")
        return returncode

    xenon_error_lines = [
        line for line in output.splitlines() if line.strip().startswith("ERROR:xenon:")
    ]
    if returncode == 1 and len(violations) != len(xenon_error_lines):
        sys.stderr.write(output + ("\n" if output else ""))
        sys.stderr.write("[complexity] Unable to parse every xenon violation line\n")
        return 1

    if args.write_current_baseline:
        _write_baseline(args.baseline, violations)
        print(
            f"[complexity] Wrote baseline with {len(violations)} violation(s) to {args.baseline}"
        )
        return 0

    if not args.baseline.is_file():
        sys.stderr.write(f"[complexity] Missing baseline file: {args.baseline}\n")
        return 1

    try:
        baseline = _load_baseline(args.baseline)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        sys.stderr.write(f"[complexity] Invalid baseline: {exc}\n")
        return 1

    current = {violation.key: violation for violation in violations}
    unexpected = _sort_violations(
        [violation for key, violation in current.items() if key not in baseline]
    )
    worsened = sorted(
        (
            (baseline[key], violation)
            for key, violation in current.items()
            if key in baseline and _rank_is_worse(violation.rank, baseline[key].rank)
        ),
        key=lambda item: (item[1].type, item[1].target),
    )
    resolved = sorted(key for key in baseline if key not in current)

    if unexpected or worsened:
        if unexpected:
            sys.stderr.write("[complexity] New xenon violations detected:\n")
            for violation in unexpected:
                sys.stderr.write(
                    f"  - {violation.type} {violation.target} -> rank {violation.rank}\n"
                )
        if worsened:
            sys.stderr.write("[complexity] Existing baseline violations got worse:\n")
            for previous, current_violation in worsened:
                sys.stderr.write(
                    "  - "
                    f"{current_violation.type} {current_violation.target}: "
                    f"{previous.rank} -> {current_violation.rank}\n"
                )
        return 1

    unresolved_count = len(current)
    resolved_count = len(resolved)
    print(
        "[complexity] OK: "
        f"{unresolved_count} baseline violation(s) remain, "
        f"{resolved_count} resolved since baseline."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
