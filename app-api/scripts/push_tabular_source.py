"""Push one CSV/XLSX file through the real connectors ingest API.

Usage:
  cd app-api
  uv run python -m scripts.push_tabular_source \
    --ingest-url http://127.0.0.1:8100/v1/ingest/<org>/<connection>/events \
    --api-key prdx_ingest_... \
    --signing-secret prdx_sig_... \
    --source-object sales_hourly \
    --schema-version custom.sales_hourly.v1 \
    --file ../data/restauration-bella-vista/\
ventes_horaires_weekend_2026-03-20_2026-03-22.csv
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import hmac
import json
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from app.services.file_parser import parse_file


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Push tabular rows to the connectors public ingest API.",
    )
    parser.add_argument("--ingest-url", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--signing-secret")
    parser.add_argument("--source-object", required=True)
    parser.add_argument("--schema-version", required=True)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--format-hint", choices=["csv", "xlsx", "lucca", "payfit"])
    parser.add_argument("--sheet-name")
    parser.add_argument("--id-column")
    parser.add_argument("--batch-size", type=int, default=250)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    return parser.parse_args()


def _build_source_record_id(
    row: dict[str, Any],
    *,
    id_column: str | None,
    file_name: str,
    row_index: int,
) -> str:
    if id_column:
        raw_value = row.get(id_column)
        if raw_value is not None and str(raw_value).strip():
            return str(raw_value).strip()
    payload = json.dumps(row, sort_keys=True, default=str, separators=(",", ":"))
    digest = hashlib.sha256(f"{file_name}:{row_index}:{payload}".encode())
    return digest.hexdigest()


def _build_event(
    row: dict[str, Any],
    *,
    source_object: str,
    file_name: str,
    schema_version: str,
    row_index: int,
    id_column: str | None,
) -> dict[str, Any]:
    source_record_id = _build_source_record_id(
        row,
        id_column=id_column,
        file_name=file_name,
        row_index=row_index,
    )
    event_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{file_name}:{source_record_id}"))
    return {
        "eventId": event_id,
        "sourceObject": source_object,
        "sourceRecordId": source_record_id,
        "contentType": "application/json",
        "payload": row,
    }


def _sign_body(signing_secret: str, body: str) -> tuple[str, str]:
    timestamp = str(int(datetime.now(UTC).timestamp()))
    signature_payload = f"{timestamp}.{body}"
    signature = hmac.new(
        signing_secret.encode("utf-8"),
        signature_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return timestamp, signature


async def _post_batch(
    client: httpx.AsyncClient,
    *,
    ingest_url: str,
    api_key: str,
    signing_secret: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
    headers = {
        "authorization": f"Bearer {api_key}",
        "content-type": "application/json",
        "idempotency-key": str(uuid.uuid4()),
    }
    if signing_secret:
        timestamp, signature = _sign_body(signing_secret, raw_body)
        headers["x-praedixa-key-id"] = "manual"
        headers["x-praedixa-timestamp"] = timestamp
        headers["x-praedixa-signature"] = signature

    response = await client.post(ingest_url, content=raw_body, headers=headers)
    response.raise_for_status()
    return response.json()


async def main() -> None:
    args = _parse_args()
    content = args.file.read_bytes()
    parsed = parse_file(
        content,
        args.file.name,
        format_hint=args.format_hint,
        sheet_name=args.sheet_name,
    )
    events = [
        _build_event(
            row,
            source_object=args.source_object,
            file_name=args.file.name,
            schema_version=args.schema_version,
            row_index=index,
            id_column=args.id_column,
        )
        for index, row in enumerate(parsed.rows, start=1)
    ]
    batches = [
        events[index : index + max(1, args.batch_size)]
        for index in range(0, len(events), max(1, args.batch_size))
    ]

    accepted_total = 0
    duplicate_total = 0
    async with httpx.AsyncClient(timeout=args.timeout_seconds) as client:
        for batch in batches:
            payload = {
                "schemaVersion": args.schema_version,
                "sentAt": datetime.now(UTC).isoformat(),
                "events": batch,
            }
            result = await _post_batch(
                client,
                ingest_url=args.ingest_url,
                api_key=args.api_key,
                signing_secret=args.signing_secret,
                payload=payload,
            )
            data = result.get("data", {})
            accepted_total += int(data.get("accepted", 0))
            duplicate_total += int(data.get("duplicates", 0))

    sys.stdout.write(
        json.dumps(
            {
                "file": str(args.file),
                "sourceObject": args.source_object,
                "schemaVersion": args.schema_version,
                "rowsParsed": len(events),
                "accepted": accepted_total,
                "duplicates": duplicate_total,
                "batches": len(batches),
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    asyncio.run(main())
