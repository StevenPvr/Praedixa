"""Generate canonical operational data for the Praedixa planning layer.

Produces realistic production-planning records for 6 French sites over
12 months (Feb 2025 -- Jan 2026), with two shifts per working day.

Patterns modelled:
  - Monthly seasonality (Dec peak, Jul/Aug trough, Sep ramp)
  - Weekly effects (Fri -10 %, Sat -30 % capacity)
  - Absence baseline ~6 % with winter increase and random spikes
  - Overtime (~15 % of shifts) correlated with high charge
  - Interim correlated with absence + charge peaks
  - Gaussian noise on all metrics
  - ~2 % randomly dropped records (missing data)

Output directory: data/canonical/
  - canonical_records.csv  (~21 000 rows)
  - cost_parameters.csv    (7 rows)
  - sites.csv              (6 rows)

Usage:
    python scripts/generate_canonical_data.py
"""

from __future__ import annotations

import csv
import math
import os
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

# ── Paths ─────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "canonical"

# ── Sites configuration ──────────────────────────────────

SITES = {
    "S_LYON": {"capacite_base_h": 450, "lat": 45.76, "name": "Lyon Logistics", "city": "Lyon"},
    "S_ORLEANS": {"capacite_base_h": 300, "lat": 47.90, "name": "Orleans Hub", "city": "Orleans"},
    "S_LILLE": {"capacite_base_h": 250, "lat": 50.63, "name": "Lille Distribution", "city": "Lille"},
    "S_NANTES": {"capacite_base_h": 200, "lat": 47.22, "name": "Nantes Centre", "city": "Nantes"},
    "S_BORDEAUX": {"capacite_base_h": 350, "lat": 44.84, "name": "Bordeaux Plateforme", "city": "Bordeaux"},
    "S_MARSEILLE": {"capacite_base_h": 400, "lat": 43.30, "name": "Marseille Port", "city": "Marseille"},
}

# ── Shifts ────────────────────────────────────────────────

SHIFTS = ["AM", "PM"]  # AM 06:00-14:00, PM 14:00-22:00

# ── Period ────────────────────────────────────────────────

START_DATE = date(2025, 2, 1)
END_DATE = date(2026, 1, 31)

# ── Cost defaults ─────────────────────────────────────────

COST_DEFAULTS = {
    "c_int": 19.9,
    "maj_hs": 0.25,
    "c_interim": 30.0,
    "premium_urgence": 0.10,
    "c_backlog": 60.0,
    "cap_hs_shift": 30,
    "cap_interim_site": 50,
    "lead_time_jours": 2,
}

# ── Gap probability ───────────────────────────────────────

GAP_RATE = 0.02

# ── Seasonality ───────────────────────────────────────────


def _month_seasonality(month: int) -> float:
    """Return a charge multiplier based on month (1-12).

    Dec +60%, Jul/Aug -35%, Sep gradual ramp-up (+10%).
    Other months: slight sinusoidal variation around 1.0.
    """
    table = {
        1: 1.05,   # January
        2: 1.00,   # February (baseline)
        3: 1.02,
        4: 1.00,
        5: 0.98,
        6: 0.90,
        7: 0.65,   # July trough
        8: 0.65,   # August trough
        9: 0.85,   # September ramp
        10: 1.05,
        11: 1.15,
        12: 1.60,  # December peak
    }
    return table[month]


def _weekday_capacity_factor(weekday: int) -> float:
    """Capacity factor by weekday (0=Mon..5=Sat). Sunday excluded."""
    if weekday == 4:  # Friday
        return 0.90
    if weekday == 5:  # Saturday
        return 0.70
    return 1.0


def _absence_rate(month: int) -> float:
    """Baseline absence rate with seasonal variation.

    ~6% baseline. Higher in winter (Nov-Feb), lower in summer.
    """
    winter_months = {11, 12, 1, 2}
    base = 0.06
    if month in winter_months:
        base += 0.025
    elif month in {7, 8}:
        base -= 0.015
    return base


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _noise(value: float, pct: float = 0.07) -> float:
    """Add Gaussian noise (~pct std dev) to a value."""
    return value * (1.0 + random.gauss(0, pct))


# ── Main generation ───────────────────────────────────────


def _generate_working_days() -> list[date]:
    """Return all Mon-Sat dates in the period."""
    days = []
    d = START_DATE
    while d <= END_DATE:
        if d.weekday() < 6:  # Mon=0 .. Sat=5
            days.append(d)
        d += timedelta(days=1)
    return days


def _generate_records() -> list[dict]:
    """Generate all canonical records."""
    working_days = _generate_working_days()
    records = []

    for site_id, site_cfg in SITES.items():
        cap_base = site_cfg["capacite_base_h"]
        # Per-site random offset for variety
        site_offset = random.uniform(-0.03, 0.03)

        for day in working_days:
            month = day.month
            weekday = day.weekday()

            season = _month_seasonality(month)
            wd_factor = _weekday_capacity_factor(weekday)

            for shift in SHIFTS:
                # ~2% gaps
                if random.random() < GAP_RATE:
                    continue

                # ── Planned capacity (hours) ─────────────────
                cap_plan = (cap_base / 2.0) * wd_factor
                cap_plan = _noise(cap_plan, 0.05)
                cap_plan = max(10, round(cap_plan, 1))

                # ── Charge (demand in units) ────────────────
                # Charge averages ~80% of planned capacity so deficit
                # is rare; seasonality pushes it above capacity only
                # in peak months, producing ~15% HS shifts overall.
                base_charge = cap_plan * 0.80
                charge_raw = base_charge * season * (1 + site_offset)
                charge_raw = _noise(charge_raw, 0.10)
                charge_units = max(1, round(charge_raw))

                # ── Absences ────────────────────────────────
                abs_rate = _absence_rate(month)
                # Random spike ~3% of shifts
                if random.random() < 0.03:
                    abs_rate += random.uniform(0.05, 0.15)
                abs_h = _noise(cap_plan * abs_rate, 0.15)
                abs_h = _clamp(round(abs_h, 1), 0, cap_plan * 0.4)

                # ── Effective capacity ──────────────────────
                effective_cap = cap_plan - abs_h

                # ── Overtime (HS) ───────────────────────────
                # Triggered when charge exceeds effective capacity
                deficit = charge_units - effective_cap
                hs_h = 0.0
                if deficit > 0 and random.random() < 0.70:
                    hs_h = _noise(deficit * 0.5, 0.15)
                    hs_h = _clamp(round(hs_h, 1), 0, COST_DEFAULTS["cap_hs_shift"])
                elif random.random() < 0.03:
                    # Rare spontaneous HS even without deficit
                    hs_h = round(random.uniform(1, 5), 1)

                # ── Interim ─────────────────────────────────
                interim_h = 0.0
                remaining_deficit = max(0, deficit - hs_h)
                # Interim only when significant absence spike or deficit
                if remaining_deficit > 5:
                    interim_h = _noise(remaining_deficit * 0.4, 0.20)
                    interim_h = _clamp(
                        round(interim_h, 1), 0, COST_DEFAULTS["cap_interim_site"]
                    )
                elif abs_h > cap_plan * 0.10 and random.random() < 0.40:
                    interim_h = _noise(abs_h * 0.3, 0.20)
                    interim_h = _clamp(round(interim_h, 1), 0, 20)
                elif random.random() < 0.03:
                    # Occasional baseline interim usage
                    interim_h = round(random.uniform(1, 8), 1)

                # ── Realised hours ──────────────────────────
                realise_h = effective_cap + hs_h + interim_h
                realise_h = _noise(realise_h, 0.03)
                realise_h = max(0, round(realise_h, 1))

                # ── Internal cost estimate ──────────────────
                c_int = COST_DEFAULTS["c_int"]
                maj_hs = COST_DEFAULTS["maj_hs"]
                c_interim = COST_DEFAULTS["c_interim"]
                cout_interne = (
                    (realise_h - hs_h - interim_h) * c_int
                    + hs_h * c_int * (1 + maj_hs)
                    + interim_h * c_interim
                )
                cout_interne = max(0, round(cout_interne, 2))

                records.append({
                    "site_id": site_id,
                    "date": day.isoformat(),
                    "shift": shift,
                    "competence": "",  # null for MVP
                    "charge_units": charge_units,
                    "capacite_plan_h": cap_plan,
                    "realise_h": realise_h,
                    "abs_h": abs_h,
                    "hs_h": hs_h,
                    "interim_h": interim_h,
                    "cout_interne_est": cout_interne,
                })

    return records


def _write_canonical_records(records: list[dict]) -> None:
    """Write canonical_records.csv."""
    path = OUT_DIR / "canonical_records.csv"
    fieldnames = [
        "site_id", "date", "shift", "competence", "charge_units",
        "capacite_plan_h", "realise_h", "abs_h", "hs_h", "interim_h",
        "cout_interne_est",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"  Written: {path.relative_to(ROOT)} ({len(records)} rows)")


def _write_cost_parameters() -> None:
    """Write cost_parameters.csv — 1 per site + 1 org-wide default."""
    path = OUT_DIR / "cost_parameters.csv"
    fieldnames = [
        "site_id", "version", "c_int", "maj_hs", "c_interim",
        "premium_urgence", "c_backlog", "cap_hs_shift", "cap_interim_site",
        "lead_time_jours", "effective_from", "effective_until",
    ]

    rows = []
    # Org-wide default
    rows.append({
        "site_id": "ORG_DEFAULT",
        "version": 1,
        **COST_DEFAULTS,
        "effective_from": START_DATE.isoformat(),
        "effective_until": END_DATE.isoformat(),
    })

    # Per-site with slight variations
    site_variations = {
        "S_LYON": {"c_int": 20.5, "c_interim": 31.0},
        "S_ORLEANS": {"c_int": 19.0, "c_interim": 28.5},
        "S_LILLE": {"c_int": 19.5, "c_interim": 29.0},
        "S_NANTES": {"c_int": 18.8, "c_interim": 27.5},
        "S_BORDEAUX": {"c_int": 20.0, "c_interim": 30.5},
        "S_MARSEILLE": {"c_int": 21.0, "c_interim": 32.0},
    }
    for site_id in SITES:
        overrides = site_variations.get(site_id, {})
        row = {
            "site_id": site_id,
            "version": 1,
            **COST_DEFAULTS,
            **overrides,
            "effective_from": START_DATE.isoformat(),
            "effective_until": END_DATE.isoformat(),
        }
        rows.append(row)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Written: {path.relative_to(ROOT)} ({len(rows)} rows)")


def _write_sites() -> None:
    """Write sites.csv — reference data for the 6 sites."""
    path = OUT_DIR / "sites.csv"
    fieldnames = ["site_id", "name", "city", "capacite_base_h"]

    rows = []
    for site_id, cfg in SITES.items():
        rows.append({
            "site_id": site_id,
            "name": cfg["name"],
            "city": cfg["city"],
            "capacite_base_h": cfg["capacite_base_h"],
        })

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Written: {path.relative_to(ROOT)} ({len(rows)} rows)")


def _print_summary(records: list[dict]) -> None:
    """Print summary statistics."""
    print()
    print("=" * 55)
    print("  Canonical Data — Summary")
    print("=" * 55)
    print(f"  Total records:  {len(records)}")
    print(f"  Date range:     {START_DATE} -> {END_DATE}")
    print(f"  Sites:          {len(SITES)}")
    print(f"  Shifts/day:     {len(SHIFTS)}")
    print()

    # Per-site counts
    site_counts: dict[str, int] = {}
    for r in records:
        site_counts[r["site_id"]] = site_counts.get(r["site_id"], 0) + 1

    print("  Per-site row counts:")
    for site_id in sorted(site_counts):
        print(f"    {site_id:15s}  {site_counts[site_id]:>6d}")

    # Aggregate stats
    total_hs = sum(r["hs_h"] for r in records)
    total_interim = sum(r["interim_h"] for r in records)
    total_realise = sum(r["realise_h"] for r in records)
    total_abs = sum(r["abs_h"] for r in records)
    total_cout = sum(r["cout_interne_est"] for r in records)

    print()
    print(f"  Total HS hours:       {total_hs:>12,.1f}")
    print(f"  Total interim hours:  {total_interim:>12,.1f}")
    print(f"  Total realised hours: {total_realise:>12,.1f}")
    print(f"  Total absence hours:  {total_abs:>12,.1f}")
    print(f"  Total internal cost:  {total_cout:>12,.2f} EUR")
    print("=" * 55)


def main() -> None:
    """Generate all canonical data files."""
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Generating canonical operational data...")
    print()

    records = _generate_records()
    _write_canonical_records(records)
    _write_cost_parameters()
    _write_sites()
    _print_summary(records)


if __name__ == "__main__":
    main()
