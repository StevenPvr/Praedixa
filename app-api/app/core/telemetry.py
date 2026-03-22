"""Structured telemetry helpers for Python data-plane jobs."""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from dataclasses import asdict, dataclass, replace
from datetime import UTC, datetime
from typing import Any, TextIO

import structlog

from app.core.config import settings

CORRELATION_FIELDS = (
    "request_id",
    "run_id",
    "connector_run_id",
    "organization_id",
    "trace_id",
)
_OPTIONAL_FIELDS = (
    "site_id",
    "action_id",
    "contract_version",
)
_DEFAULT_NULL_FIELDS = dict.fromkeys(
    (*CORRELATION_FIELDS, *_OPTIONAL_FIELDS),
    None,
)
_DEFAULT_SERVICE_NAME = "app-api"
REQUEST_ID_HEADER = "X-Request-ID"
RUN_ID_HEADER = "X-Run-ID"
CONNECTOR_RUN_ID_HEADER = "X-Connector-Run-ID"
_LOG_LEVELS = {
    "critical": logging.CRITICAL,
    "error": logging.ERROR,
    "warning": logging.WARNING,
    "info": logging.INFO,
    "debug": logging.DEBUG,
}
_structured_logging_configured = False


@dataclass(frozen=True)
class TelemetryContext:
    """Correlation data propagated across one data-plane execution path."""

    request_id: str | None = None
    run_id: str | None = None
    connector_run_id: str | None = None
    organization_id: str | None = None
    trace_id: str | None = None
    site_id: str | None = None
    action_id: str | None = None
    contract_version: str | None = None

    def bind(self, **updates: str | None) -> TelemetryContext:
        allowed = {key: value for key, value in updates.items() if key in asdict(self)}
        return replace(self, **allowed)

    def as_log_fields(self) -> dict[str, str | None]:
        return {
            **_DEFAULT_NULL_FIELDS,
            **asdict(self),
        }

    def as_http_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.request_id:
            headers[REQUEST_ID_HEADER] = self.request_id
        if self.run_id:
            headers[RUN_ID_HEADER] = self.run_id
        if self.connector_run_id:
            headers[CONNECTOR_RUN_ID_HEADER] = self.connector_run_id
        return headers


class StructuredJsonFormatter(logging.Formatter):
    """Backward-compatible JSON formatter shim for focused tests."""

    def __init__(
        self,
        *,
        service_name: str,
        environment: str,
        app_version: str,
    ) -> None:
        super().__init__()
        self._service_name = service_name
        self._environment = environment
        self._app_version = app_version

    def format(self, record: logging.LogRecord) -> str:
        event_dict = {
            "event": record.getMessage(),
            "event_name": getattr(record, "event_name", record.getMessage()),
            "logger": record.name,
            "level": record.levelname.lower(),
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            **getattr(record, "telemetry", {}),
        }
        if record.exc_info:
            event_dict["exception"] = self.formatException(record.exc_info)
        payload = _normalize_event_dict(
            event_dict,
            service_name=self._service_name,
            environment=self._environment,
            app_version=self._app_version,
        )
        return _json_dumps(payload)


@dataclass(frozen=True)
class TelemetryLogger:
    """Small typed wrapper around stdlib logging with bound telemetry."""

    logger: logging.Logger
    bound_logger: structlog.stdlib.BoundLogger
    context: TelemetryContext

    def bind(self, **updates: str | None) -> TelemetryLogger:
        next_context = self.context.bind(**updates)
        return TelemetryLogger(
            logger=self.logger,
            bound_logger=self.bound_logger.bind(**next_context.as_log_fields()),
            context=next_context,
        )

    def info(self, message: str, *, event: str, **fields: Any) -> None:
        self.bound_logger.info(message, event_name=event, **fields)

    def warning(self, message: str, *, event: str, **fields: Any) -> None:
        self.bound_logger.warning(message, event_name=event, **fields)

    def error(self, message: str, *, event: str, **fields: Any) -> None:
        self.bound_logger.error(message, event_name=event, **fields)

    def exception(self, message: str, *, event: str, **fields: Any) -> None:
        self.bound_logger.exception(message, event_name=event, **fields)


def configure_structured_logging(
    *,
    service_name: str = _DEFAULT_SERVICE_NAME,
    force: bool = False,
    stream: TextIO | None = None,
) -> None:
    """Configure root logging once for structured JSON events."""

    global _structured_logging_configured
    if _structured_logging_configured and not force:
        return

    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(_resolve_log_level(settings.LOG_LEVEL))
    structlog.reset_defaults()
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.format_exc_info,
            _build_normalizer(
                service_name=service_name,
                environment=settings.ENVIRONMENT,
                app_version=settings.APP_VERSION,
            ),
            structlog.processors.JSONRenderer(serializer=_json_dumps),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=False,
    )
    _structured_logging_configured = True


def get_telemetry_logger(
    name: str,
    *,
    service_name: str = _DEFAULT_SERVICE_NAME,
    context: TelemetryContext | None = None,
) -> TelemetryLogger:
    configure_structured_logging(service_name=service_name)
    logger = logging.getLogger(name)
    telemetry_context = context or TelemetryContext()
    return TelemetryLogger(
        logger=logger,
        bound_logger=structlog.get_logger(name).bind(
            **telemetry_context.as_log_fields()
        ),
        context=telemetry_context,
    )


def _resolve_log_level(raw_level: str) -> int:
    return _LOG_LEVELS.get(raw_level.strip().lower(), logging.INFO)


def _build_normalizer(
    *,
    service_name: str,
    environment: str,
    app_version: str,
) -> Any:
    def _normalize(
        _logger: Any,
        _method_name: str,
        event_dict: dict[str, Any],
    ) -> dict[str, Any]:
        return _normalize_event_dict(
            event_dict,
            service_name=service_name,
            environment=environment,
            app_version=app_version,
        )

    return _normalize


def _normalize_event_dict(
    event_dict: Mapping[str, Any],
    *,
    service_name: str,
    environment: str,
    app_version: str,
) -> dict[str, Any]:
    message = str(event_dict.get("event", ""))
    event_name = event_dict.get("event_name")
    normalized = {
        **_DEFAULT_NULL_FIELDS,
        **{
            key: _normalize_value(value)
            for key, value in event_dict.items()
            if key not in {"event", "event_name"}
        },
    }
    normalized["service"] = service_name
    normalized["env"] = environment
    normalized["app_version"] = app_version
    normalized["event"] = (
        event_name if isinstance(event_name, str) and event_name else message
    )
    normalized["message"] = message
    return normalized


def _json_dumps(payload: Any, **kwargs: Any) -> str:
    kwargs.setdefault("default", _normalize_value)
    kwargs.setdefault("sort_keys", True)
    return json.dumps(payload, **kwargs)


def _normalize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    return value
