"""X-Request-ID extraction and validation — max 64 chars, ASCII, printable."""

import uuid

from fastapi import Request

MAX_REQUEST_ID_LEN = 64


def extract_valid_request_id(request: Request) -> str | None:
    raw = request.headers.get("X-Request-ID")
    if raw and len(raw) <= MAX_REQUEST_ID_LEN and raw.isascii() and raw.isprintable():
        return raw
    return None


def get_or_generate_request_id(request: Request) -> str:
    return extract_valid_request_id(request) or str(uuid.uuid4())
