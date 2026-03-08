from __future__ import annotations

import asyncio
import io
import uuid
import zipfile
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

from app.core.config import settings
from app.core.key_management import KeyManagementError, LocalKeyProvider
from app.core.pagination import normalize_limit_offset, normalize_page_window
from app.core.pipeline_config import (
    PipelineConfigValidationError,
    sanitize_feature_pipeline_config,
    sanitize_feature_rules_override,
)
from app.integrations.core import ConnectorAuthContext, InMemoryIdempotencyStore
from app.integrations.core.pagination import decode_cursor, encode_cursor
from app.services import file_parser
from app.services.file_parser import FileParseError, _sanitize_cell_value, parse_file
from app.services.rgpd_erasure import initiate_erasure
from scripts.medallion_orchestrator import _validate_alert_webhook_url
from scripts.medallion_pipeline import normalize_school_zone


def test_pipeline_config_rejects_excessive_window_lists() -> None:
    with pytest.raises(PipelineConfigValidationError):
        sanitize_feature_pipeline_config(
            {"lags": list(range(settings.MAX_WINDOWS_PER_DATASET + 1))}
        )


def test_rules_override_rejects_unknown_keys() -> None:
    with pytest.raises(PipelineConfigValidationError):
        sanitize_feature_rules_override({"unexpected": True})


def test_pipeline_config_rejects_invalid_data_quality_threshold() -> None:
    with pytest.raises(PipelineConfigValidationError):
        sanitize_feature_pipeline_config(
            {"data_quality": {"missing_threshold_delete": 2.0}}
        )


def test_parse_file_rejects_payloads_over_size_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 4)

    with pytest.raises(FileParseError, match="maximum allowed size"):
        parse_file(b"hello", "sample.csv", format_hint="csv")


def test_parse_file_rejects_too_many_columns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "MAX_COLUMNS_PER_TABLE", 2)

    with pytest.raises(FileParseError, match="maximum allowed column count"):
        parse_file(b"a,b,c\n1,2,3\n", "sample.csv", format_hint="csv")


def test_parse_file_rejects_xlsx_zip_bomb_like_archive(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(file_parser, "_MAX_XLSX_UNCOMPRESSED_BYTES", 10)

    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("xl/sharedStrings.xml", "A" * 32)

    with pytest.raises(FileParseError, match="too large when decompressed"):
        parse_file(archive_buffer.getvalue(), "sample.xlsx", format_hint="xlsx")


def test_csv_formula_sanitization_strips_minus_formulas() -> None:
    assert _sanitize_cell_value("-1+2") == "1+2"
    assert _sanitize_cell_value("-2*cmd|' /C calc'!A0") == "2*cmd|' /C calc'!A0"
    assert _sanitize_cell_value("-42.5") == "-42.5"


def test_decode_cursor_rejects_oversized_payload() -> None:
    oversized = encode_cursor({"blob": "x" * 5000})
    with pytest.raises(ValueError):
        decode_cursor(oversized)


def test_in_memory_idempotency_store_expires_entries() -> None:
    store = InMemoryIdempotencyStore(ttl_seconds=0.01, max_entries=2)
    assert store.register("event-1")
    assert not store.register("event-1")

    asyncio.run(asyncio.sleep(0.02))

    assert store.register("event-1")


def test_connector_auth_context_masks_secret_ref() -> None:
    context = ConnectorAuthContext(
        organization_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        secret_ref="scw://secret/very-sensitive-reference",
    )

    safe_payload = context.to_safe_log_dict()

    assert safe_payload["secret_ref"] != "scw://secret/very-sensitive-reference"
    assert safe_payload["secret_ref"] != "***REDACTED***"


def test_local_key_provider_rejects_prod_like_env_without_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(KeyManagementError, match="MUST NOT be used in production"):
        LocalKeyProvider(seed=b"0123456789abcdef")


def test_alert_webhook_validation_rejects_private_hosts() -> None:
    with pytest.raises(ValueError):
        _validate_alert_webhook_url(
            "https://127.0.0.1/hooks/alerts",
            allowed_hosts=("hooks.example.com",),
        )


def test_alert_webhook_validation_requires_allowlist() -> None:
    with pytest.raises(ValueError):
        _validate_alert_webhook_url(
            "https://hooks.example.com/alerts",
            allowed_hosts=(),
        )


def test_normalize_school_zone_rejects_untrusted_value() -> None:
    assert normalize_school_zone("B") == "B"
    assert normalize_school_zone('B" or 1=1') is None


def test_pagination_helpers_clamp_untrusted_inputs() -> None:
    page, page_size, offset = normalize_page_window(-1, 5000)
    assert page == 1
    assert page_size == 200
    assert offset == 0

    limit, normalized_offset = normalize_limit_offset(-10, -5)
    assert limit == 20
    assert normalized_offset == 0


@pytest.mark.asyncio
async def test_initiate_erasure_uses_canonical_database_slug(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    org_id = uuid.UUID("22222222-2222-2222-2222-222222222222")

    class _Result:
        def scalar_one_or_none(self) -> str:
            return "canonical-org"

    class _FakeDB:
        def __init__(self) -> None:
            self.added: list[object] = []

        async def execute(self, stmt: object) -> _Result:
            return _Result()

        def add(self, obj: object) -> None:
            self.added.append(obj)

    fake_db = _FakeDB()

    monkeypatch.setattr(
        "app.services.rgpd_erasure._ensure_no_active_request",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.services.rgpd_erasure._flush_with_conflict",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.services.rgpd_erasure._append_audit_event",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.services.rgpd_erasure._build_response",
        AsyncMock(side_effect=lambda _db, row: row),
    )

    request_row = await initiate_erasure(
        org_id,
        "attacker-controlled-slug",
        "admin-1",
        fake_db,  # type: ignore[arg-type]
    )

    assert fake_db.added
    created_request = cast("Any", fake_db.added[0])
    erasure_request = cast("Any", request_row)

    assert created_request.org_slug == "canonical-org"
    assert erasure_request.org_slug == "canonical-org"
