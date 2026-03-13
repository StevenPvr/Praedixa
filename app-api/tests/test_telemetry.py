from __future__ import annotations

import json
from io import StringIO

from app.core.config import settings
from app.core.telemetry import (
    CONNECTOR_RUN_ID_HEADER,
    REQUEST_ID_HEADER,
    RUN_ID_HEADER,
    TelemetryContext,
    configure_structured_logging,
    get_telemetry_logger,
)


def test_telemetry_context_keeps_null_correlation_fields() -> None:
    context = TelemetryContext(
        request_id="req-123",
        organization_id="org-123",
    )

    assert context.as_log_fields() == {
        "request_id": "req-123",
        "run_id": None,
        "connector_run_id": None,
        "organization_id": "org-123",
        "trace_id": None,
        "site_id": None,
        "action_id": None,
        "contract_version": None,
    }


def test_structured_logger_renders_event_and_null_fields() -> None:
    stream = StringIO()
    configure_structured_logging(
        service_name="app-api",
        force=True,
        stream=stream,
    )
    logger = get_telemetry_logger(
        "app.tests.telemetry",
        context=TelemetryContext(
            request_id="req-123",
            connector_run_id="conn-run-456",
            organization_id="org-123",
        ),
    )

    logger.info(
        "Connector drain completed",
        event="connector.runtime.drain.completed",
        claimed_count=2,
        processed_count=2,
    )

    payload = json.loads(stream.getvalue().strip())

    assert payload["service"] == "app-api"
    assert payload["env"] == settings.ENVIRONMENT
    assert payload["event"] == "connector.runtime.drain.completed"
    assert payload["message"] == "Connector drain completed"
    assert payload["request_id"] == "req-123"
    assert payload["connector_run_id"] == "conn-run-456"
    assert payload["organization_id"] == "org-123"
    assert payload["run_id"] is None
    assert payload["trace_id"] is None
    assert payload["claimed_count"] == 2
    assert payload["processed_count"] == 2
    assert payload["logger"] == "app.tests.telemetry"
    assert payload["action_id"] is None
    assert payload["contract_version"] is None


def test_telemetry_context_emits_runtime_http_headers_for_known_ids() -> None:
    context = TelemetryContext(
        request_id="req-123",
        run_id="run-456",
        connector_run_id="sync-789",
    )

    assert context.as_http_headers() == {
        REQUEST_ID_HEADER: "req-123",
        RUN_ID_HEADER: "run-456",
        CONNECTOR_RUN_ID_HEADER: "sync-789",
    }
