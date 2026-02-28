"""Fetch NHS UEC/SitRep historical files with deterministic year URL mapping.

Output structure:
  data-sante/raw/nhs-uec-history/<year>/
    - uec_daily_sitrep_timeseries.xlsx
    - nhs111_timeseries.xlsx
    - covid_acute_timeseries.xlsx          (optional by year)
    - ambulance_collection_timeseries.xlsx (optional by year)
    - acute_discharge_sitrep_timeseries.xlsx (optional by year)

Metadata:
  data-sante/meta/nhs_uec_history_sources.csv
  data-sante/raw/uk_bank_holidays.json
"""

from __future__ import annotations

import csv
import hashlib
import os
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path


RAW_DIR = Path("data-sante/raw")
HISTORY_DIR = RAW_DIR / "nhs-uec-history"
META_DIR = Path("data-sante/meta")
DEFAULT_FETCH_MIN_YEAR_START = 2022

# Canonical local file names used downstream by the builder.
OUTPUT_NAMES = {
    "uec": "uec_daily_sitrep_timeseries.xlsx",
    "nhs111": "nhs111_timeseries.xlsx",
    "covid": "covid_acute_timeseries.xlsx",
    "ambulance": "ambulance_collection_timeseries.xlsx",
    "acute_discharge": "acute_discharge_sitrep_timeseries.xlsx",
}

# Deterministic source mapping per reporting year.
# Some early years do not provide all categories as separate files.
YEAR_URLS: dict[str, dict[str, str]] = {
    "2025-26": {
        "uec": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Web-File-Timeseries-UEC-Daily-SitRep-P4zp0E.xlsx",
        "nhs111": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Web-File-Timeseries-NHS111-Bfa92X.xlsx",
        "covid": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Web-File-Timeseries-Covid-Acute-lKv4ds.xlsx",
        "ambulance": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Web-File-Timeseries-Ambulance-Collection-vfxf2.xlsx",
        "acute_discharge": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Web-File-Timeseries-Acute-Discharge-SitRep-M7B9F4.xlsx",
    },
    "2024-25": {
        "uec": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/04/Web-File-Timeseries-UEC-Daily-SitRep.xlsx",
        "nhs111": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/04/Web-File-Timeseries-NHS111.xlsx",
        "covid": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/04/Webfile-Timeseries-Covid-Acute.xlsx",
        "ambulance": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/04/Web-File-Timeseries-Ambulance-Collection.xlsx",
        "acute_discharge": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/04/Web-File-Timeseries-Acute-Discharge-SitRep.xlsx",
    },
    "2023-24": {
        "uec": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/04/Web-File-Timeseries-UEC-Daily-SitRep.xlsx",
        "nhs111": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/04/Web-File-Timeseries-NHS111.xlsx",
        "covid": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/04/Web-File-Timeseries-Staff-Absences.xlsx",
        "ambulance": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/04/Web-File-Timeseries-Ambulance-Collection.xlsx",
        "acute_discharge": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/04/Web-File-Timeseries-Discharge-Delays.xlsx",
    },
    "2022-23": {
        "uec": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2023/04/UEC-Daily-SitRep-Web-File-Timeseries.xlsx",
        "nhs111": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2023/04/NHS111-Web-File-Timeseries.xlsx",
        "covid": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2023/04/Staff-Absences-Web-File-Timeseries.xlsx",
        "ambulance": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2023/04/Ambulance-Collection-Web-File-Timeseries.xlsx",
        "acute_discharge": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2023/04/Discharge-Delays-Web-File-Timeseries.xlsx",
    },
    "2021-22": {
        "uec": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2022/04/UEC-Daily-SitRep-Web-File-Timeseries.xlsx",
        "nhs111": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2022/04/NHS111-Web-File-Timeseries.xlsx",
        "covid": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2022/04/Staff-Absences-Web-File-Timeseries.xlsx",
        "acute_discharge": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2022/04/Daily-Discharge-SitRep-Web-File-Timeseries.xlsx",
    },
    "2020-21": {
        "uec": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2021/04/UEC-Daily-SitRep-Acute-Web-File-Timeseries-1.xlsx",
        "nhs111": "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2021/04/111-for-winter-daily-sitrep-20210404.xlsx",
    },
}


def _parse_year_start(year_label: str) -> int:
    if "-" in year_label:
        head = year_label.split("-", 1)[0]
        if head.isdigit():
            return int(head)
    if year_label.isdigit():
        return int(year_label)
    return -1


def _fetch_min_year_start() -> int:
    raw_value = os.environ.get(
        "PRAEDIXA_FETCH_MIN_YEAR_START",
        str(DEFAULT_FETCH_MIN_YEAR_START),
    )
    try:
        return int(raw_value)
    except ValueError:
        return DEFAULT_FETCH_MIN_YEAR_START


def _run_curl_download(url: str, output_path: Path, attempts: int = 4) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, attempts + 1):
        proc = subprocess.run(
            [
                "curl",
                "-sS",
                "-L",
                "--fail",
                "--connect-timeout",
                "8",
                "--max-time",
                "45",
                "--retry",
                "2",
                "--retry-delay",
                "1",
                "--retry-all-errors",
                url,
                "-o",
                str(output_path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        if proc.returncode == 0:
            return
        if attempt < attempts:
            time.sleep(1.0 * attempt)
            continue
        msg = f"download failed for {url}: {proc.stderr.strip()}"
        raise RuntimeError(msg)


def _assert_excel(path: Path) -> None:
    proc = subprocess.run(
        ["file", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    if "microsoft excel 2007+" in proc.stdout.lower():
        return
    msg = f"Invalid xlsx payload: {path} ({proc.stdout.strip()})"
    raise ValueError(msg)


def _is_existing_valid_excel(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    proc = subprocess.run(
        ["file", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return False
    return "microsoft excel 2007+" in proc.stdout.lower()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)

    min_year_start = _fetch_min_year_start()
    selected_years = [
        year
        for year in sorted(YEAR_URLS.keys())
        if _parse_year_start(year) == -1 or _parse_year_start(year) >= min_year_start
    ]

    manifest_rows: list[dict[str, str | int]] = []
    errors: list[str] = []
    downloaded_at = datetime.now(UTC).replace(microsecond=0).isoformat()

    for year in selected_years:
        print(f"[fetch] year={year}", flush=True)
        year_dir = HISTORY_DIR / year
        year_dir.mkdir(parents=True, exist_ok=True)
        category_to_url = YEAR_URLS[year]

        for category, source_url in category_to_url.items():
            local_name = OUTPUT_NAMES[category]
            local_path = year_dir / local_name
            print(f"[fetch] year={year} category={category}", flush=True)

            try:
                if not _is_existing_valid_excel(local_path):
                    _run_curl_download(source_url, local_path)
                    _assert_excel(local_path)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{year}/{category}: {exc}")
                print(f"[warn] {year}/{category} failed: {exc}", flush=True)
                continue

            manifest_rows.append(
                {
                    "year": year,
                    "category": category,
                    "source_url": source_url,
                    "local_path": str(local_path),
                    "size_bytes": local_path.stat().st_size,
                    "sha256": _sha256(local_path),
                    "downloaded_at_utc": downloaded_at,
                }
            )

    bank_holidays_url = "https://www.gov.uk/bank-holidays.json"
    bank_holidays_path = RAW_DIR / "uk_bank_holidays.json"
    try:
        _run_curl_download(bank_holidays_url, bank_holidays_path)
    except Exception as exc:  # noqa: BLE001
        if bank_holidays_path.exists() and bank_holidays_path.stat().st_size > 0:
            print(
                f"[warn] bank_holidays refresh failed, keeping existing file: {exc}",
                flush=True,
            )
        else:
            errors.append(f"bank_holidays: {exc}")
            print(f"[warn] bank_holidays failed: {exc}", flush=True)

    manifest_path = META_DIR / "nhs_uec_history_sources.csv"
    fieldnames = [
        "year",
        "category",
        "source_url",
        "local_path",
        "size_bytes",
        "sha256",
        "downloaded_at_utc",
    ]
    with manifest_path.open("w", newline="", encoding="utf-8") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(manifest_rows)

    print(
        "Downloaded/validated "
        f"{len(manifest_rows)} files for {len(selected_years)} years "
        f"(min_year_start={min_year_start})",
        flush=True,
    )
    print(f"Wrote {manifest_path}", flush=True)
    print(f"Refreshed {bank_holidays_path}", flush=True)

    if errors:
        print("[summary] incomplete fetch; retry to fill missing files:", flush=True)
        for line in errors:
            print(f"- {line}", flush=True)
        raise RuntimeError(f"{len(errors)} download error(s)")


if __name__ == "__main__":
    main()
