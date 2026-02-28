"""Build a trust-level daily simulation dataset from NHS raw files.

Input priority:
1. Multi-year layout (preferred):
   data-sante/raw/nhs-uec-history/<year>/*.xlsx
2. Flat layout (fallback):
   data-sante/raw/*.xlsx

Output:
- data-sante/processed/nhs_trust_daily_simulation_base.csv
- data-sante/processed/nhs_trust_daily_simulation_ready.csv
- data-sante/processed/nhs111_daily_item_totals.csv
- data-sante/meta/simulation_dataset_summary.json
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


RAW_DIR = Path("data-sante/raw")
PROCESSED_DIR = Path("data-sante/processed")
META_DIR = Path("data-sante/meta")
HISTORY_DIR = RAW_DIR / "nhs-uec-history"
DEFAULT_MIN_YEAR_START = 2022


@dataclass(frozen=True)
class Paths:
    uec: Path
    covid: Path
    ambulance: Path
    nhs111: Path
    bank_holidays: Path


@dataclass(frozen=True)
class SourceBundle:
    year_label: str
    year_start: int
    paths: Paths


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and np.isnan(value):
        return None
    text = str(value).strip()
    return text if text else None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, float) and np.isnan(value):
        return None
    if isinstance(value, pd.Timedelta):
        return value.total_seconds() / 3600.0
    if isinstance(value, time):
        return (
            value.hour
            + (value.minute / 60.0)
            + (value.second / 3600.0)
            + (value.microsecond / 3_600_000_000.0)
        )
    if hasattr(value, "total_seconds") and not isinstance(value, (int, float)):
        try:
            return float(value.total_seconds()) / 3600.0
        except Exception:
            return None
    if isinstance(value, str):
        parsed_timedelta = pd.to_timedelta(value, errors="coerce")
        if not pd.isna(parsed_timedelta):
            return float(parsed_timedelta.total_seconds()) / 3600.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _find_row_index(df: pd.DataFrame, needle: str) -> int:
    for row_idx, row in df.iterrows():
        if any(needle in str(cell) for cell in row.tolist()):
            return int(row_idx)
    msg = f"Unable to find row containing '{needle}'"
    raise ValueError(msg)


def _is_date_cell(value: Any) -> bool:
    return isinstance(value, (pd.Timestamp, datetime))


def _normalize_sheet_name(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def _resolve_sheet_name(path: Path, candidates: list[str]) -> str:
    excel = pd.ExcelFile(path)
    normalized_lookup = {
        _normalize_sheet_name(sheet_name): sheet_name for sheet_name in excel.sheet_names
    }

    for candidate in candidates:
        normalized = _normalize_sheet_name(candidate)
        matched = normalized_lookup.get(normalized)
        if matched:
            return matched

    msg = (
        f"Unable to resolve sheet in {path.name}. "
        f"Candidates={candidates} Available={excel.sheet_names}"
    )
    raise ValueError(msg)


def _get_min_year_start() -> int:
    raw_value = os.environ.get("PRAEDIXA_MIN_YEAR_START", str(DEFAULT_MIN_YEAR_START))
    try:
        return int(raw_value)
    except ValueError:
        return DEFAULT_MIN_YEAR_START


def _infer_date_block_width(date_cols: list[int]) -> int:
    if len(date_cols) < 2:
        return 0
    gaps = [b - a for a, b in zip(date_cols, date_cols[1:]) if b > a]
    if not gaps:
        return 0
    return min(gaps)


def _extract_uec_sheet(
    path: Path,
    sheet_name: str,
    prefix: str,
    *,
    source_year_label: str,
    source_year_start: int,
) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    header_row = _find_row_index(df, "NHS England Region")
    date_row = header_row - 1

    date_cols = sorted(
        [
            col_idx
            for col_idx, value in df.iloc[date_row, :].items()
            if _is_date_cell(value)
        ]
    )
    if not date_cols:
        msg = f"No date columns found in {path.name}/{sheet_name}"
        raise ValueError(msg)
    block_width = _infer_date_block_width(date_cols)

    records: list[dict[str, Any]] = []
    for row_idx in range(header_row + 1, len(df)):
        trust_code = _clean_text(df.iat[row_idx, 3])
        trust_name = _clean_text(df.iat[row_idx, 4])
        region = _clean_text(df.iat[row_idx, 1])

        if not trust_code or trust_code == "-":
            continue
        if not trust_name:
            continue

        for col_idx in date_cols:
            dt_value = df.iat[date_row, col_idx]
            if not _is_date_cell(dt_value):
                continue

            open_value = _to_float(df.iat[row_idx, col_idx])
            if block_width >= 3:
                unavailable_value = (
                    _to_float(df.iat[row_idx, col_idx + 1])
                    if col_idx + 1 < df.shape[1]
                    else None
                )
                occupied_value = (
                    _to_float(df.iat[row_idx, col_idx + 2])
                    if col_idx + 2 < df.shape[1]
                    else None
                )
            elif block_width == 2:
                unavailable_value = None
                occupied_value = (
                    _to_float(df.iat[row_idx, col_idx + 1])
                    if col_idx + 1 < df.shape[1]
                    else None
                )
            else:
                unavailable_value = None
                occupied_value = None

            if open_value is None and occupied_value is None:
                continue

            records.append(
                {
                    "date": pd.Timestamp(dt_value).date(),
                    "trust_code": trust_code,
                    "trust_name": trust_name,
                    "region": region,
                    "source_year_label": source_year_label,
                    "source_year_start": source_year_start,
                    f"{prefix}_beds_open": open_value,
                    f"{prefix}_beds_unavailable_non_covid": unavailable_value,
                    f"{prefix}_beds_occupied": occupied_value,
                }
            )

    result = pd.DataFrame.from_records(records)
    return result


def _extract_covid_sheet(
    path: Path,
    sheet_name: str,
    metric_name: str,
    *,
    source_year_label: str,
    source_year_start: int,
) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    header_row = _find_row_index(df, "NHS England Region")

    date_cols = [
        col_idx
        for col_idx, value in df.iloc[header_row, :].items()
        if _is_date_cell(value)
    ]

    records: list[dict[str, Any]] = []
    for row_idx in range(header_row + 1, len(df)):
        trust_code = _clean_text(df.iat[row_idx, 2])
        trust_name = _clean_text(df.iat[row_idx, 3])
        region = _clean_text(df.iat[row_idx, 1])

        if not trust_code:
            continue
        if not trust_name:
            continue

        for col_idx in date_cols:
            dt_value = df.iat[header_row, col_idx]
            metric_value = _to_float(df.iat[row_idx, col_idx])
            if metric_value is None:
                continue

            records.append(
                {
                    "date": pd.Timestamp(dt_value).date(),
                    "trust_code": trust_code,
                    "trust_name": trust_name,
                    "region": region,
                    "source_year_label": source_year_label,
                    "source_year_start": source_year_start,
                    metric_name: metric_value,
                }
            )

    result = pd.DataFrame.from_records(records)
    return result


def _extract_ambulance_handovers(
    path: Path,
    sheet_name: str,
    *,
    source_year_label: str,
    source_year_start: int,
) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    header_row = _find_row_index(df, "NHS Trust code")

    date_row = None
    for candidate in range(max(0, header_row - 5), header_row):
        date_count = sum(_is_date_cell(value) for value in df.iloc[candidate, :].tolist())
        if date_count >= 2:
            date_row = candidate
    if date_row is None:
        msg = f"No date row found for ambulance handovers in {path.name}/{sheet_name}"
        raise ValueError(msg)

    date_cols = sorted(
        [
            col_idx
            for col_idx, value in df.iloc[date_row, :].items()
            if _is_date_cell(value)
        ]
    )
    if not date_cols:
        msg = f"No date columns found for ambulance handovers in {path.name}/{sheet_name}"
        raise ValueError(msg)

    block_width = _infer_date_block_width(date_cols)
    if block_width not in (13, 14):
        msg = (
            f"Unexpected ambulance handover block width={block_width} "
            f"in {path.name}/{sheet_name}"
        )
        raise ValueError(msg)

    records: list[dict[str, Any]] = []
    for row_idx in range(header_row + 1, len(df)):
        trust_code = _clean_text(df.iat[row_idx, 1])
        trust_name = _clean_text(df.iat[row_idx, 2])
        region = _clean_text(df.iat[row_idx, 0])

        if not trust_code or trust_code == "-":
            continue
        if not trust_name:
            continue

        for col_idx in date_cols:
            dt_value = df.iat[date_row, col_idx]
            if not _is_date_cell(dt_value):
                continue

            if block_width == 14:
                over_60_idx = col_idx + 4
                unknown_idx = col_idx + 5
                all_idx = col_idx + 6
                total_hours_idx = col_idx + 7
                mean_hours_idx = col_idx + 8
            else:
                over_60_idx = col_idx + 3
                unknown_idx = col_idx + 4
                all_idx = col_idx + 5
                total_hours_idx = col_idx + 6
                mean_hours_idx = col_idx + 7

            handover_known = _to_float(df.iat[row_idx, col_idx])
            over_15 = _to_float(df.iat[row_idx, col_idx + 1])
            over_30 = _to_float(df.iat[row_idx, col_idx + 2])
            over_45 = _to_float(df.iat[row_idx, col_idx + 3]) if block_width == 14 else None
            over_60 = _to_float(df.iat[row_idx, over_60_idx])
            handover_unknown = _to_float(df.iat[row_idx, unknown_idx])
            all_handovers = _to_float(df.iat[row_idx, all_idx])
            total_hours = _to_float(df.iat[row_idx, total_hours_idx])
            mean_hours = _to_float(df.iat[row_idx, mean_hours_idx])

            if handover_known is None and all_handovers is None:
                continue

            records.append(
                {
                    "date": pd.Timestamp(dt_value).date(),
                    "trust_code": trust_code,
                    "trust_name": trust_name,
                    "region": region,
                    "source_year_label": source_year_label,
                    "source_year_start": source_year_start,
                    "ambulance_handover_known": handover_known,
                    "ambulance_over_15_min": over_15,
                    "ambulance_over_30_min": over_30,
                    "ambulance_over_45_min": over_45,
                    "ambulance_over_60_min": over_60,
                    "ambulance_handover_unknown": handover_unknown,
                    "ambulance_all_handovers": all_handovers,
                    "ambulance_handover_total_hours": total_hours,
                    "ambulance_handover_mean_hours": mean_hours,
                }
            )

    return pd.DataFrame.from_records(records)


def _extract_ambulance_arrivals_delays(
    path: Path,
    sheet_name: str,
    *,
    source_year_label: str,
    source_year_start: int,
) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    header_row = _find_row_index(df, "NHS England Region")
    date_row = header_row - 1
    date_cols = sorted(
        [
            col_idx
            for col_idx, value in df.iloc[date_row, :].items()
            if _is_date_cell(value)
        ]
    )
    if not date_cols:
        msg = f"No date columns found in {path.name}/{sheet_name}"
        raise ValueError(msg)
    block_width = _infer_date_block_width(date_cols)
    if block_width not in (3, 4):
        msg = (
            f"Unexpected ambulance legacy block width={block_width} "
            f"in {path.name}/{sheet_name}"
        )
        raise ValueError(msg)

    records: list[dict[str, Any]] = []
    for row_idx in range(header_row + 1, len(df)):
        trust_code = _clean_text(df.iat[row_idx, 2 if block_width == 4 else 3])
        trust_name = _clean_text(df.iat[row_idx, 3 if block_width == 4 else 4])
        region = _clean_text(df.iat[row_idx, 1])

        if not trust_code or trust_code == "-":
            continue
        if not trust_name:
            continue

        for col_idx in date_cols:
            dt_value = df.iat[date_row, col_idx]
            if not _is_date_cell(dt_value):
                continue

            arriving = _to_float(df.iat[row_idx, col_idx])
            delay_30_60 = _to_float(df.iat[row_idx, col_idx + 1])
            delay_over_60 = _to_float(df.iat[row_idx, col_idx + 2])
            total_hours = (
                _to_float(df.iat[row_idx, col_idx + 3])
                if block_width == 4 and col_idx + 3 < df.shape[1]
                else None
            )
            over_30 = None
            if delay_30_60 is not None and delay_over_60 is not None:
                over_30 = delay_30_60 + delay_over_60
            elif delay_over_60 is not None:
                over_30 = delay_over_60
            elif delay_30_60 is not None:
                over_30 = delay_30_60

            if arriving is None and over_30 is None:
                continue

            records.append(
                {
                    "date": pd.Timestamp(dt_value).date(),
                    "trust_code": trust_code,
                    "trust_name": trust_name,
                    "region": region,
                    "source_year_label": source_year_label,
                    "source_year_start": source_year_start,
                    "ambulance_handover_known": arriving,
                    "ambulance_over_15_min": np.nan,
                    "ambulance_over_30_min": over_30,
                    "ambulance_over_45_min": np.nan,
                    "ambulance_over_60_min": delay_over_60,
                    "ambulance_handover_unknown": np.nan,
                    "ambulance_all_handovers": arriving,
                    "ambulance_handover_total_hours": total_hours,
                    "ambulance_handover_mean_hours": np.nan,
                }
            )

    return pd.DataFrame.from_records(records)


def _extract_ambulance(
    path: Path,
    *,
    source_year_label: str,
    source_year_start: int,
) -> pd.DataFrame:
    try:
        sheet_name = _resolve_sheet_name(path, ["Handovers", "All handovers"])
        return _extract_ambulance_handovers(
            path,
            sheet_name,
            source_year_label=source_year_label,
            source_year_start=source_year_start,
        )
    except ValueError:
        sheet_name = _resolve_sheet_name(path, ["Ambulance Arrivals and Delays"])
        return _extract_ambulance_arrivals_delays(
            path,
            sheet_name,
            source_year_label=source_year_label,
            source_year_start=source_year_start,
        )


def _extract_nhs111_daily_item_totals(
    path: Path,
    *,
    source_year_start: int,
) -> pd.DataFrame:
    raw_sheet = _resolve_sheet_name(path, ["Raw"])
    raw = pd.read_excel(path, sheet_name=raw_sheet)
    raw.columns = [str(col).strip().lower().replace(" ", "_") for col in raw.columns]
    required = {"date_of_day", "item_number", "value"}
    missing = required - set(raw.columns)
    if missing:
        msg = f"NHS111 Raw sheet missing columns: {sorted(missing)}"
        raise ValueError(msg)

    raw["date"] = pd.to_datetime(raw["date_of_day"], errors="coerce").dt.date
    raw["value"] = pd.to_numeric(raw["value"], errors="coerce")
    raw["item_number"] = raw["item_number"].astype(str).str.strip()
    raw = raw.dropna(subset=["date", "item_number", "value"])

    grouped = (
        raw.groupby(["date", "item_number"], as_index=False)["value"]
        .sum()
        .rename(columns={"value": "value_sum"})
    )
    grouped["source_year_start"] = source_year_start
    return grouped


def _build_bank_holiday_set(path: Path) -> set[date]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    events = payload.get("england-and-wales", {}).get("events", [])
    dates: set[date] = set()
    for event in events:
        dt = event.get("date")
        if not dt:
            continue
        parsed = pd.to_datetime(dt, errors="coerce")
        if pd.isna(parsed):
            continue
        dates.add(parsed.date())
    return dates


def _drop_meta_cols(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(columns=["region", "trust_name"], errors="ignore")


def _build_trust_meta(*frames: pd.DataFrame) -> pd.DataFrame:
    rows: list[pd.DataFrame] = []
    for frame in frames:
        existing = [col for col in ("trust_code", "trust_name", "region") if col in frame]
        if len(existing) < 3:
            continue
        rows.append(frame[existing].dropna(subset=["trust_code"]).copy())

    if not rows:
        return pd.DataFrame(columns=["trust_code", "trust_name", "region"])

    meta = pd.concat(rows, ignore_index=True)
    meta = meta.sort_values(["trust_code", "trust_name", "region"], na_position="last")
    meta = meta.drop_duplicates(subset=["trust_code"], keep="first")
    return meta


def _missing_ratio(series: pd.Series) -> float:
    if len(series) == 0:
        return 0.0
    return float(series.isna().sum() / len(series))


def _require_inputs(paths: Paths) -> None:
    for candidate in (
        paths.uec,
        paths.nhs111,
        paths.bank_holidays,
    ):
        if not candidate.exists():
            msg = f"Missing input file: {candidate}"
            raise FileNotFoundError(msg)


def _parse_year_start(year_label: str) -> int:
    if "-" in year_label:
        head = year_label.split("-", 1)[0]
        if head.isdigit():
            return int(head)
    if year_label.isdigit():
        return int(year_label)
    return -1


def _discover_source_bundles() -> list[SourceBundle]:
    bundles: list[SourceBundle] = []
    min_year_start = _get_min_year_start()

    if HISTORY_DIR.exists():
        for year_dir in sorted(HISTORY_DIR.iterdir()):
            if not year_dir.is_dir():
                continue
            year_label = year_dir.name
            year_start = _parse_year_start(year_label)
            if year_start != -1 and year_start < min_year_start:
                print(
                    f"[info] skipping {year_label}: below min year {min_year_start}",
                    flush=True,
                )
                continue
            paths = Paths(
                uec=year_dir / "uec_daily_sitrep_timeseries.xlsx",
                covid=year_dir / "covid_acute_timeseries.xlsx",
                ambulance=year_dir / "ambulance_collection_timeseries.xlsx",
                nhs111=year_dir / "nhs111_timeseries.xlsx",
                bank_holidays=RAW_DIR / "uk_bank_holidays.json",
            )
            _require_inputs(paths)
            bundles.append(
                SourceBundle(
                    year_label=year_label,
                    year_start=year_start,
                    paths=paths,
                )
            )

    if bundles:
        return bundles

    fallback_paths = Paths(
        uec=RAW_DIR / "uec_daily_sitrep_timeseries.xlsx",
        covid=RAW_DIR / "covid_acute_timeseries.xlsx",
        ambulance=RAW_DIR / "ambulance_collection_timeseries.xlsx",
        nhs111=RAW_DIR / "nhs111_timeseries.xlsx",
        bank_holidays=RAW_DIR / "uk_bank_holidays.json",
    )
    _require_inputs(fallback_paths)
    return [
        SourceBundle(
            year_label="single_year",
            year_start=-1,
            paths=fallback_paths,
        )
    ]


def _coalesce_latest_rows(
    frame: pd.DataFrame,
    *,
    key_cols: list[str],
    meta_cols: list[str],
) -> pd.DataFrame:
    if frame.empty:
        return frame
    ordered = frame.sort_values(key_cols + ["source_year_start"], na_position="last")
    deduped = ordered.drop_duplicates(subset=key_cols, keep="last")
    value_cols = [
        col
        for col in deduped.columns
        if col not in set(key_cols + meta_cols + ["source_year_label", "source_year_start"])
    ]
    return deduped[key_cols + meta_cols + value_cols]


def _empty_metric_frame(metric_cols: list[str]) -> pd.DataFrame:
    return pd.DataFrame(
        columns=["trust_code", "date", "trust_name", "region"] + metric_cols
    )


def _combine_optional_frames(
    frames: list[pd.DataFrame],
    *,
    metric_cols: list[str],
) -> pd.DataFrame:
    non_empty = [frame for frame in frames if not frame.empty]
    if not non_empty:
        return _empty_metric_frame(metric_cols)
    merged = pd.concat(non_empty, ignore_index=True)
    return _coalesce_latest_rows(
        merged,
        key_cols=["trust_code", "date"],
        meta_cols=["trust_name", "region"],
    )


def build_dataset(
    bundles: list[SourceBundle],
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    cohort_min_year_start = _get_min_year_start()
    uec_total_frames: list[pd.DataFrame] = []
    uec_adult_frames: list[pd.DataFrame] = []
    covid_abs_frames: list[pd.DataFrame] = []
    covid_patients_frames: list[pd.DataFrame] = []
    ambulance_frames: list[pd.DataFrame] = []
    nhs111_long_frames: list[pd.DataFrame] = []

    for bundle in bundles:
        paths = bundle.paths
        try:
            total_sheet = _resolve_sheet_name(paths.uec, ["Total G&A beds"])
            uec_total_frames.append(
                _extract_uec_sheet(
                    paths.uec,
                    total_sheet,
                    "total_ga",
                    source_year_label=bundle.year_label,
                    source_year_start=bundle.year_start,
                )
            )
        except Exception as exc:
            print(
                f"[warn] skipped total G&A beds for {bundle.year_label}: {exc}",
                flush=True,
            )
        try:
            adult_sheet = _resolve_sheet_name(paths.uec, ["Adult G&A beds"])
            uec_adult_frames.append(
                _extract_uec_sheet(
                    paths.uec,
                    adult_sheet,
                    "adult_ga",
                    source_year_label=bundle.year_label,
                    source_year_start=bundle.year_start,
                )
            )
        except Exception as exc:
            print(
                f"[warn] skipped adult G&A beds for {bundle.year_label}: {exc}",
                flush=True,
            )
        if paths.covid.exists():
            try:
                abs_sheet = _resolve_sheet_name(paths.covid, ["Total Absences"])
                covid_abs_frames.append(
                    _extract_covid_sheet(
                        paths.covid,
                        abs_sheet,
                        "staff_absent_total",
                        source_year_label=bundle.year_label,
                        source_year_start=bundle.year_start,
                    )
                )
            except Exception as exc:
                print(
                    f"[warn] skipped Total Absences for {bundle.year_label}: {exc}"
                )
            try:
                patient_sheet = _resolve_sheet_name(
                    paths.covid,
                    ["Covid Total Patients"],
                )
                covid_patients_frames.append(
                    _extract_covid_sheet(
                        paths.covid,
                        patient_sheet,
                        "covid_patients_total",
                        source_year_label=bundle.year_label,
                        source_year_start=bundle.year_start,
                    )
                )
            except Exception as exc:
                print(
                    f"[warn] skipped Covid Total Patients for {bundle.year_label}: {exc}"
                )

        if paths.ambulance.exists():
            try:
                ambulance_frames.append(
                    _extract_ambulance(
                        paths.ambulance,
                        source_year_label=bundle.year_label,
                        source_year_start=bundle.year_start,
                    )
                )
            except Exception as exc:
                print(f"[warn] skipped ambulance for {bundle.year_label}: {exc}")

        try:
            nhs111_long_frames.append(
                _extract_nhs111_daily_item_totals(
                    paths.nhs111,
                    source_year_start=bundle.year_start,
                )
            )
        except Exception as exc:
            print(f"[warn] skipped nhs111 for {bundle.year_label}: {exc}")

    key = ["trust_code", "date"]
    meta_cols = ["trust_name", "region"]

    uec_total = _combine_optional_frames(
        uec_total_frames,
        metric_cols=[
            "total_ga_beds_open",
            "total_ga_beds_unavailable_non_covid",
            "total_ga_beds_occupied",
        ],
    )
    uec_adult = _combine_optional_frames(
        uec_adult_frames,
        metric_cols=[
            "adult_ga_beds_open",
            "adult_ga_beds_unavailable_non_covid",
            "adult_ga_beds_occupied",
        ],
    )
    covid_abs = _combine_optional_frames(
        covid_abs_frames,
        metric_cols=["staff_absent_total"],
    )
    covid_patients = _combine_optional_frames(
        covid_patients_frames,
        metric_cols=["covid_patients_total"],
    )
    ambulance = _combine_optional_frames(
        ambulance_frames,
        metric_cols=[
            "ambulance_handover_known",
            "ambulance_over_15_min",
            "ambulance_over_30_min",
            "ambulance_over_45_min",
            "ambulance_over_60_min",
            "ambulance_handover_unknown",
            "ambulance_all_handovers",
            "ambulance_handover_total_hours",
            "ambulance_handover_mean_hours",
        ],
    )

    if nhs111_long_frames:
        nhs111_long = pd.concat(nhs111_long_frames, ignore_index=True)
        nhs111_long = nhs111_long.sort_values(
            ["date", "item_number", "source_year_start"],
            na_position="last",
        )
        nhs111_long = nhs111_long.drop_duplicates(
            subset=["date", "item_number"],
            keep="last",
        )
        nhs111 = (
            nhs111_long.pivot(index="date", columns="item_number", values="value_sum")
            .reset_index()
            .rename(
                columns={
                    col: f"nhs111_item_{col}"
                    for col in nhs111_long["item_number"].dropna().unique()
                }
            )
        )
        nhs111 = nhs111.sort_values("date").reset_index(drop=True)
    else:
        nhs111 = pd.DataFrame(columns=["date"])

    base = _drop_meta_cols(uec_total).copy()
    for frame in (
        _drop_meta_cols(uec_adult),
        _drop_meta_cols(covid_abs),
        _drop_meta_cols(covid_patients),
        _drop_meta_cols(ambulance),
    ):
        base = base.merge(frame, on=key, how="outer")

    trust_meta = _build_trust_meta(
        uec_total, uec_adult, covid_abs, covid_patients, ambulance
    )
    base = base.merge(trust_meta, on="trust_code", how="left")

    holidays = _build_bank_holiday_set(bundles[0].paths.bank_holidays)
    base["date"] = pd.to_datetime(base["date"], errors="coerce").dt.date
    base = base.dropna(subset=["date", "trust_code"])

    date_series = pd.to_datetime(base["date"])
    base["day_of_week"] = date_series.dt.day_name()
    base["is_weekend"] = base["day_of_week"].isin(["Saturday", "Sunday"])
    base["is_bank_holiday_england_wales"] = base["date"].isin(holidays)

    base["bed_occupancy_total_pct"] = np.where(
        base["total_ga_beds_open"] > 0,
        base["total_ga_beds_occupied"] / base["total_ga_beds_open"],
        np.nan,
    )
    base["bed_occupancy_adult_pct"] = np.where(
        base["adult_ga_beds_open"] > 0,
        base["adult_ga_beds_occupied"] / base["adult_ga_beds_open"],
        np.nan,
    )
    base["absence_per_100_adult_open_beds"] = np.where(
        base["adult_ga_beds_open"] > 0,
        (base["staff_absent_total"] / base["adult_ga_beds_open"]) * 100.0,
        np.nan,
    )
    base["ambulance_over_60_rate"] = np.where(
        base["ambulance_handover_known"] > 0,
        base["ambulance_over_60_min"] / base["ambulance_handover_known"],
        np.nan,
    )

    preferred_cols = [
        "date",
        "trust_code",
        "trust_name",
        "region",
        "total_ga_beds_open",
        "total_ga_beds_unavailable_non_covid",
        "total_ga_beds_occupied",
        "adult_ga_beds_open",
        "adult_ga_beds_unavailable_non_covid",
        "adult_ga_beds_occupied",
        "staff_absent_total",
        "covid_patients_total",
        "ambulance_handover_known",
        "ambulance_over_15_min",
        "ambulance_over_30_min",
        "ambulance_over_45_min",
        "ambulance_over_60_min",
        "ambulance_handover_unknown",
        "ambulance_all_handovers",
        "ambulance_handover_total_hours",
        "ambulance_handover_mean_hours",
        "bed_occupancy_total_pct",
        "bed_occupancy_adult_pct",
        "absence_per_100_adult_open_beds",
        "ambulance_over_60_rate",
        "day_of_week",
        "is_weekend",
        "is_bank_holiday_england_wales",
    ]
    ordered_cols = [col for col in preferred_cols if col in base.columns]
    base = base[ordered_cols].sort_values(["trust_code", "date"]).reset_index(drop=True)

    ready_key_cols = [
        "total_ga_beds_open",
        "total_ga_beds_occupied",
        "adult_ga_beds_open",
        "adult_ga_beds_occupied",
        "staff_absent_total",
        "ambulance_all_handovers",
    ]
    ready = base.dropna(subset=ready_key_cols).copy()

    summary = {
        "cohort_min_year_start": cohort_min_year_start,
        "rows": int(len(base)),
        "trust_count": int(base["trust_code"].nunique()),
        "date_min": str(base["date"].min()),
        "date_max": str(base["date"].max()),
        "source_years": [bundle.year_label for bundle in bundles],
        "ready_rows": int(len(ready)),
        "ready_trust_count": int(ready["trust_code"].nunique()),
        "missing_ratio": {
            "staff_absent_total": _missing_ratio(base["staff_absent_total"]),
            "covid_patients_total": _missing_ratio(base["covid_patients_total"]),
            "ambulance_all_handovers": _missing_ratio(base["ambulance_all_handovers"]),
            "total_ga_beds_open": _missing_ratio(base["total_ga_beds_open"]),
            "adult_ga_beds_open": _missing_ratio(base["adult_ga_beds_open"]),
        },
        "nhs111_daily_rows": int(len(nhs111)),
        "nhs111_items": sorted(
            [col.replace("nhs111_item_", "") for col in nhs111.columns if col.startswith("nhs111_item_")]
        ),
    }

    return base, ready, nhs111, summary


def main() -> None:
    bundles = _discover_source_bundles()

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)

    base, ready, nhs111_daily, summary = build_dataset(bundles)

    base_path = PROCESSED_DIR / "nhs_trust_daily_simulation_base.csv"
    ready_path = PROCESSED_DIR / "nhs_trust_daily_simulation_ready.csv"
    nhs111_path = PROCESSED_DIR / "nhs111_daily_item_totals.csv"
    summary_path = META_DIR / "simulation_dataset_summary.json"

    base.to_csv(base_path, index=False)
    ready.to_csv(ready_path, index=False)
    nhs111_daily.to_csv(nhs111_path, index=False)
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Wrote {base_path} ({len(base)} rows)")
    print(f"Wrote {ready_path} ({len(ready)} rows)")
    print(f"Wrote {nhs111_path} ({len(nhs111_daily)} rows)")
    print(f"Wrote {summary_path}")
    print(f"Source years: {', '.join(summary['source_years'])}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
