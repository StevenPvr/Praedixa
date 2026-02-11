"""Unit tests for medallion orchestrator."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from pathlib import Path

from scripts.medallion_orchestrator import (
    OrchestratorConfig,
    compute_retry_delay,
    load_orchestrator_config,
    run_pipeline_with_retries,
    send_webhook_alert,
)


def _config_for_tests(tmp_path: Path) -> OrchestratorConfig:
    return OrchestratorConfig(
        data_root=tmp_path / "data",
        output_root=tmp_path / "data-ready",
        metadata_root=tmp_path / "metadata",
        lock_file=tmp_path / "lock",
        heartbeat_file=tmp_path / "heartbeat.json",
        poll_seconds=30,
        max_retries=3,
        retry_base_seconds=5,
        retry_max_seconds=30,
    )


def test_compute_retry_delay_exponential_capped() -> None:
    assert compute_retry_delay(0, 5, 120) == 5
    assert compute_retry_delay(1, 5, 120) == 10
    assert compute_retry_delay(2, 5, 120) == 20
    assert compute_retry_delay(5, 5, 30) == 30


def test_load_orchestrator_config_resolves_relative_paths(tmp_path: Path) -> None:
    cfg_path = tmp_path / "orchestrator.json"
    absolute_lock = tmp_path / "custom-lock"
    cfg_payload = {
        "data_root": "../d",
        "output_root": "../o",
        "metadata_root": ".",
        "lock_file": str(absolute_lock),
        "poll_seconds": 12,
        "max_retries": 2,
        "allow_reprocess": True,
    }
    cfg_path.write_text(json.dumps(cfg_payload), encoding="utf-8")

    cfg = load_orchestrator_config(cfg_path)
    assert cfg.data_root == (tmp_path / "../d")
    assert cfg.output_root == (tmp_path / "../o")
    assert cfg.metadata_root == tmp_path
    assert cfg.lock_file == absolute_lock
    assert cfg.poll_seconds == 12
    assert cfg.max_retries == 2
    assert cfg.allow_reprocess is True


def test_run_pipeline_with_retries_then_success(tmp_path: Path) -> None:
    cfg = _config_for_tests(tmp_path)
    calls = {"n": 0}
    delays: list[float] = []

    def fake_runner(**_kwargs) -> bool:
        calls["n"] += 1
        if calls["n"] < 3:
            raise RuntimeError("transient")
        return True

    changed, attempts = run_pipeline_with_retries(
        cfg,
        force_rebuild=False,
        runner=fake_runner,
        sleeper=delays.append,
    )

    assert changed is True
    assert attempts == 3
    assert delays == [5, 10]


def test_run_pipeline_with_retries_exhausts(tmp_path: Path) -> None:
    cfg = _config_for_tests(tmp_path)
    delays: list[float] = []

    def always_fail(**_kwargs) -> bool:
        raise RuntimeError("hard-fail")

    with pytest.raises(RuntimeError, match="hard-fail"):
        run_pipeline_with_retries(
            cfg,
            force_rebuild=False,
            runner=always_fail,
            sleeper=delays.append,
        )

    # max_retries=3 means 4 attempts and 3 waits.
    assert delays == [5, 10, 20]


def test_send_webhook_alert_success(monkeypatch: pytest.MonkeyPatch) -> None:
    class _FakeResponse:
        status = 204

        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _tb):
            return False

    monkeypatch.setattr(
        "urllib.request.urlopen",
        lambda *_args, **_kwargs: _FakeResponse(),
    )

    ok = send_webhook_alert(
        "https://example.com/webhook",
        {"event": "test"},
        timeout_seconds=3,
    )
    assert ok is True
