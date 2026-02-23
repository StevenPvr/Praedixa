"""Contract test: webapp endpoint map must exist in backend OpenAPI."""

from __future__ import annotations

import re
from pathlib import Path

from app.main import app

_ENDPOINTS_FILE = (
    Path(__file__).resolve().parents[3] / "app-webapp" / "lib" / "api" / "endpoints.ts"
)
_ENCODED_PARAM_RE = re.compile(r"\$\{encodeURIComponent\(([^)]+)\)\}")
_QUERY_TEMPLATE_RE = re.compile(r"\$\{qs\([^}]+\)\}")
_TS_LITERAL_PATH_RE = re.compile(r'["`](/api/v1[^"`]+)["`]')


def _extract_frontend_paths() -> set[str]:
    source = _ENDPOINTS_FILE.read_text(encoding="utf-8")
    raw_paths = set(_TS_LITERAL_PATH_RE.findall(source))
    normalized: set[str] = set()
    for raw in raw_paths:
        value = _QUERY_TEMPLATE_RE.sub("", raw)
        value = _ENCODED_PARAM_RE.sub(r"{\1}", value)
        value = value.split("?", 1)[0]
        value = (
            value.replace("{alertId}", "{alert_id}")
            .replace("{decisionId}", "{decision_id}")
            .replace("{datasetId}", "{dataset_id}")
            .replace("{forecastId}", "{run_id}")
            .replace("{convId}", "{conv_id}")
        )
        normalized.add(value)
    return normalized


def test_webapp_paths_exist_in_backend_openapi() -> None:
    """All webapp endpoint constants must map to backend OpenAPI paths."""
    frontend_paths = _extract_frontend_paths()
    backend_paths = set(app.openapi()["paths"].keys())
    missing = sorted(frontend_paths - backend_paths)
    assert not missing, (
        "Missing backend routes for webapp endpoints: " + ", ".join(missing)
    )
