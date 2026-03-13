"""Inspect append-only quarantine manifests emitted by the medallion pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from app.services.medallion_reprocessing import load_quarantine_records


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="List medallion quarantine records.")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data-ready",
    )
    parser.add_argument("--client-slug")
    parser.add_argument("--dataset")
    parser.add_argument("--reason-code")
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    records = load_quarantine_records(
        args.output_root,
        client_slug=args.client_slug,
        dataset=args.dataset,
        reason_code=args.reason_code,
    )
    if args.json:
        sys.stdout.write(
            json.dumps(
                [asdict(record) for record in records],
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n"
        )
        return

    for record in records:
        sys.stdout.write(
            f"{record.detected_at} {record.client_slug} {record.dataset} "
            f"{record.reason_code} replayable={record.replayable} "
            f"path={record.quarantine_path}" + "\n"
        )
    sys.stdout.write(f"total={len(records)}\n")


if __name__ == "__main__":
    main()
