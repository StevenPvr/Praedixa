from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def _read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_gate_prepush_targeted_backend_disables_coverage() -> None:
    content = _read("scripts/gate-prepush-deep.sh")
    assert '-m pytest --no-cov \\' in content


def test_run_osv_scan_handles_transient_backend_failures() -> None:
    content = _read("scripts/run-osv-scan.sh")
    assert "is_transient_backend_failure" in content
    assert "transient backend/network failure detected" in content
