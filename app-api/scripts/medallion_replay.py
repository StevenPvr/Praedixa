"""Replay quarantined medallion source files through the standard pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripts.medallion_reprocessing_common import (
    apply_reprocessing_plan,
    build_replay_plan,
    parse_iso_date,
    plan_to_payload,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Replay quarantined medallion files.")
    parser.add_argument(
        "--data-root", type=Path, default=Path(__file__).resolve().parents[2] / "data"
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data-ready",
    )
    parser.add_argument(
        "--metadata-root",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config" / "medallion",
    )
    parser.add_argument("--client-slug")
    parser.add_argument("--dataset")
    parser.add_argument("--reason-code")
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--force-rebuild", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    plan, notes = build_replay_plan(
        data_root=args.data_root,
        output_root=args.output_root,
        client_slug=args.client_slug,
        dataset=args.dataset,
        reason_code=args.reason_code,
        start_date=parse_iso_date(args.start_date),
        end_date=parse_iso_date(args.end_date),
    )
    if not args.apply:
        sys.stdout.write(
            json.dumps(plan_to_payload(plan, notes=notes), indent=2, sort_keys=True)
            + "\n"
        )
        return

    result = apply_reprocessing_plan(
        plan=plan,
        data_root=args.data_root,
        output_root=args.output_root,
        metadata_root=args.metadata_root,
        force_rebuild=args.force_rebuild,
        notes=notes,
    )
    sys.stdout.write(json.dumps(result, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
