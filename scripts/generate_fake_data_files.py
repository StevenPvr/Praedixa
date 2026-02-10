"""Generate realistic aggregated enterprise datasets for 3 fictitious clients.

Goals:
- 100% aggregated data (site/day and site/month), no individual rows.
- Realistic enterprise signals for HR, operations, finance, admin, and MLOps.
- Forecast data is the only intentionally mock domain.
- Controlled missing values (for DB cleaning robustness) without duplicate rows.

Output structure:
    data/{client-slug}/
      hr/workforce_daily.csv
      hr/hr_monthly.csv
      operations/operations_daily.csv
      finance/labor_cost_daily.csv
      finance/finance_monthly.csv
      quality/quality_incidents_daily.csv
      admin/actions_adoption_daily.csv
      admin/pipeline_observability_daily.csv
      admin/roi_monthly.csv
      mlops/mock_forecasts_daily.csv
      mlops/model_monitoring_daily.csv

Usage:
    .venv/bin/python scripts/generate_fake_data_files.py
"""
# ruff: noqa: S311, PLR0915, PLR2004, PLR0911, T201, E501, RUF046

from __future__ import annotations

import csv
import json
import random
import shutil
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

SEED = 42
random.seed(SEED)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

MISSING_TOKENS_DEFAULT = ["", "NA", "null", "N/A", "-"]


@dataclass(frozen=True)
class CsvFormat:
    delimiter: str
    encoding: str
    date_mode: str  # iso | fr | fr_dash
    decimal_comma: bool


@dataclass(frozen=True)
class SiteProfile:
    code: str
    name: str
    city: str
    base_fte: float
    base_daily_orders: int
    productivity_orders_per_fte: float
    gross_hourly_eur: float
    employer_rate: float
    interim_multiplier: float
    max_interim_share: float
    base_on_time_pct: float
    base_error_rate_pct: float
    base_cycle_min: float
    energy_kwh_base: float
    kwh_per_order: float
    fuel_l_per_order: float
    avg_revenue_per_order: float
    cogs_ratio: float
    fixed_overhead_monthly: float
    transport_subcontract_per_order: float
    cash_conversion_base_days: float
    mape_target_pct: float
    retrain_ape_threshold_pct: float


@dataclass(frozen=True)
class ClientProfile:
    slug: str
    display_name: str
    industry: str
    seasonality_key: str  # balanced | ecommerce | cold_chain
    operating_days: tuple[int, ...]
    absence_base_rate: float
    turnover_monthly_rate: float
    adoption_maturity: float
    savings_per_action_eur: float
    avoided_cost_per_action_eur: float
    platform_fee_per_site_month_eur: float
    platform_variable_fee_per_order_eur: float
    energy_price_kwh_eur: float
    fuel_price_l_eur: float
    forecast_sigma: float
    missing_tokens: tuple[str, ...]
    csv_format: CsvFormat
    sites: tuple[SiteProfile, ...]


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def month_start(d: date) -> date:
    return d.replace(day=1)


def next_month(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)


def month_starts_between(start: date, end: date) -> list[date]:
    out: list[date] = []
    current = month_start(start)
    while current <= end:
        out.append(current)
        current = next_month(current)
    return out


def fmt_date(d: date, mode: str) -> str:
    if mode == "fr":
        return d.strftime("%d/%m/%Y")
    if mode == "fr_dash":
        return d.strftime("%d-%m-%Y")
    return d.isoformat()


def serialize_value(value: object, *, date_mode: str, decimal_comma: bool) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, date):
        return fmt_date(value, date_mode)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        txt = f"{value:.2f}"
        if decimal_comma:
            txt = txt.replace(".", ",")
        return txt
    return str(value)


def write_csv(path: Path, rows: list[dict[str, object]], fmt: CsvFormat) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return 0
    fields = list(rows[0].keys())
    with path.open("w", encoding=fmt.encoding, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter=fmt.delimiter)
        writer.writeheader()
        for row in rows:
            serialized = {
                key: serialize_value(
                    row.get(key),
                    date_mode=fmt.date_mode,
                    decimal_comma=fmt.decimal_comma,
                )
                for key in fields
            }
            writer.writerow(serialized)
    return len(rows)


def ensure_unique(rows: list[dict[str, object]], keys: tuple[str, ...], dataset_name: str) -> None:
    seen: dict[tuple[object, ...], int] = {}
    for idx, row in enumerate(rows):
        key = tuple(row.get(field) for field in keys)
        if key in seen:
            prev = seen[key]
            raise RuntimeError(
                f"Duplicate row in {dataset_name} for key={key} (row {prev} and {idx})"
            )
        seen[key] = idx


def inject_missing(
    rows: list[dict[str, object]],
    field_rates: dict[str, float],
    *,
    tokens: tuple[str, ...],
) -> None:
    for row in rows:
        for field, rate in field_rates.items():
            if field in row and random.random() < rate:
                row[field] = random.choice(tokens or tuple(MISSING_TOKENS_DEFAULT))


def seasonality_factor(kind: str, month: int) -> float:
    if kind == "ecommerce":
        table = {
            1: 0.94,
            2: 0.96,
            3: 1.00,
            4: 1.02,
            5: 1.04,
            6: 0.98,
            7: 0.80,
            8: 0.78,
            9: 0.95,
            10: 1.08,
            11: 1.28,
            12: 1.42,
        }
        return table[month]
    if kind == "cold_chain":
        table = {
            1: 1.06,
            2: 1.03,
            3: 0.98,
            4: 0.96,
            5: 0.99,
            6: 1.02,
            7: 1.08,
            8: 1.11,
            9: 1.02,
            10: 1.00,
            11: 1.02,
            12: 1.05,
        }
        return table[month]
    table = {
        1: 1.02,
        2: 1.00,
        3: 1.02,
        4: 1.00,
        5: 0.99,
        6: 0.97,
        7: 0.90,
        8: 0.88,
        9: 0.96,
        10: 1.03,
        11: 1.12,
        12: 1.20,
    }
    return table[month]


def weekday_activity_factor(client: ClientProfile, d: date) -> float:
    if d.weekday() not in client.operating_days:
        return 0.10
    if d.weekday() == 5:
        return 0.64
    if d.weekday() == 6:
        return 0.18
    if d.weekday() in (0, 1):
        return 1.05
    return 1.0


def absence_season_factor(month: int) -> float:
    if month in (1, 2):
        return 1.24
    if month in (7, 8):
        return 1.18
    if month == 12:
        return 1.15
    return 1.0


def model_version_for_day(d: date) -> str:
    if d < date(2024, 7, 1):
        return "forecast-v1.0"
    if d < date(2025, 1, 1):
        return "forecast-v1.1"
    if d < date(2025, 7, 1):
        return "forecast-v1.2"
    return "forecast-v1.3"


def build_profiles() -> tuple[ClientProfile, ...]:
    return (
        ClientProfile(
            slug="acme-logistics",
            display_name="Acme Logistics",
            industry="3PL and Warehousing",
            seasonality_key="balanced",
            operating_days=(0, 1, 2, 3, 4, 5),
            absence_base_rate=0.046,
            turnover_monthly_rate=0.012,
            adoption_maturity=0.77,
            savings_per_action_eur=290.0,
            avoided_cost_per_action_eur=180.0,
            platform_fee_per_site_month_eur=4200.0,
            platform_variable_fee_per_order_eur=0.018,
            energy_price_kwh_eur=0.168,
            fuel_price_l_eur=1.69,
            forecast_sigma=0.085,
            missing_tokens=("", "NA", "null"),
            csv_format=CsvFormat(
                delimiter=";",
                encoding="utf-8-sig",
                date_mode="fr",
                decimal_comma=True,
            ),
            sites=(
                SiteProfile(
                    code="LYO",
                    name="Lyon Hub",
                    city="Lyon",
                    base_fte=360,
                    base_daily_orders=16800,
                    productivity_orders_per_fte=56,
                    gross_hourly_eur=18.8,
                    employer_rate=0.42,
                    interim_multiplier=1.55,
                    max_interim_share=0.24,
                    base_on_time_pct=97.6,
                    base_error_rate_pct=0.62,
                    base_cycle_min=2.8,
                    energy_kwh_base=5100,
                    kwh_per_order=0.024,
                    fuel_l_per_order=0.041,
                    avg_revenue_per_order=6.4,
                    cogs_ratio=0.60,
                    fixed_overhead_monthly=265000,
                    transport_subcontract_per_order=0.52,
                    cash_conversion_base_days=42,
                    mape_target_pct=8.0,
                    retrain_ape_threshold_pct=12.5,
                ),
                SiteProfile(
                    code="MRS",
                    name="Marseille Hub",
                    city="Marseille",
                    base_fte=305,
                    base_daily_orders=13900,
                    productivity_orders_per_fte=54,
                    gross_hourly_eur=18.2,
                    employer_rate=0.41,
                    interim_multiplier=1.58,
                    max_interim_share=0.22,
                    base_on_time_pct=97.2,
                    base_error_rate_pct=0.68,
                    base_cycle_min=3.0,
                    energy_kwh_base=4550,
                    kwh_per_order=0.026,
                    fuel_l_per_order=0.045,
                    avg_revenue_per_order=6.2,
                    cogs_ratio=0.61,
                    fixed_overhead_monthly=233000,
                    transport_subcontract_per_order=0.55,
                    cash_conversion_base_days=45,
                    mape_target_pct=8.5,
                    retrain_ape_threshold_pct=13.0,
                ),
                SiteProfile(
                    code="CDG",
                    name="Paris North Hub",
                    city="Roissy",
                    base_fte=415,
                    base_daily_orders=19600,
                    productivity_orders_per_fte=58,
                    gross_hourly_eur=19.4,
                    employer_rate=0.42,
                    interim_multiplier=1.52,
                    max_interim_share=0.25,
                    base_on_time_pct=97.8,
                    base_error_rate_pct=0.57,
                    base_cycle_min=2.6,
                    energy_kwh_base=5900,
                    kwh_per_order=0.023,
                    fuel_l_per_order=0.039,
                    avg_revenue_per_order=6.7,
                    cogs_ratio=0.59,
                    fixed_overhead_monthly=312000,
                    transport_subcontract_per_order=0.49,
                    cash_conversion_base_days=39,
                    mape_target_pct=7.8,
                    retrain_ape_threshold_pct=12.0,
                ),
            ),
        ),
        ClientProfile(
            slug="transfroid-express",
            display_name="TransFroid Express",
            industry="Cold Chain Transport",
            seasonality_key="cold_chain",
            operating_days=(0, 1, 2, 3, 4, 5),
            absence_base_rate=0.051,
            turnover_monthly_rate=0.014,
            adoption_maturity=0.71,
            savings_per_action_eur=340.0,
            avoided_cost_per_action_eur=320.0,
            platform_fee_per_site_month_eur=3600.0,
            platform_variable_fee_per_order_eur=0.025,
            energy_price_kwh_eur=0.176,
            fuel_price_l_eur=1.75,
            forecast_sigma=0.095,
            missing_tokens=("", "N/A", "null"),
            csv_format=CsvFormat(
                delimiter=";",
                encoding="utf-8",
                date_mode="fr_dash",
                decimal_comma=True,
            ),
            sites=(
                SiteProfile(
                    code="RGS",
                    name="Rungis Platform",
                    city="Rungis",
                    base_fte=148,
                    base_daily_orders=3600,
                    productivity_orders_per_fte=33,
                    gross_hourly_eur=19.8,
                    employer_rate=0.43,
                    interim_multiplier=1.62,
                    max_interim_share=0.28,
                    base_on_time_pct=96.4,
                    base_error_rate_pct=0.83,
                    base_cycle_min=5.2,
                    energy_kwh_base=4200,
                    kwh_per_order=0.082,
                    fuel_l_per_order=0.093,
                    avg_revenue_per_order=10.8,
                    cogs_ratio=0.67,
                    fixed_overhead_monthly=154000,
                    transport_subcontract_per_order=0.89,
                    cash_conversion_base_days=49,
                    mape_target_pct=9.2,
                    retrain_ape_threshold_pct=13.5,
                ),
                SiteProfile(
                    code="BDX",
                    name="Bordeaux Depot",
                    city="Bordeaux",
                    base_fte=122,
                    base_daily_orders=2800,
                    productivity_orders_per_fte=31,
                    gross_hourly_eur=19.1,
                    employer_rate=0.42,
                    interim_multiplier=1.64,
                    max_interim_share=0.27,
                    base_on_time_pct=95.9,
                    base_error_rate_pct=0.92,
                    base_cycle_min=5.6,
                    energy_kwh_base=3680,
                    kwh_per_order=0.089,
                    fuel_l_per_order=0.101,
                    avg_revenue_per_order=10.3,
                    cogs_ratio=0.69,
                    fixed_overhead_monthly=133000,
                    transport_subcontract_per_order=0.94,
                    cash_conversion_base_days=53,
                    mape_target_pct=9.8,
                    retrain_ape_threshold_pct=14.0,
                ),
            ),
        ),
        ClientProfile(
            slug="petit-colis",
            display_name="Petit Colis SARL",
            industry="E-commerce Fulfillment",
            seasonality_key="ecommerce",
            operating_days=(0, 1, 2, 3, 4, 5),
            absence_base_rate=0.043,
            turnover_monthly_rate=0.017,
            adoption_maturity=0.64,
            savings_per_action_eur=165.0,
            avoided_cost_per_action_eur=105.0,
            platform_fee_per_site_month_eur=1750.0,
            platform_variable_fee_per_order_eur=0.032,
            energy_price_kwh_eur=0.162,
            fuel_price_l_eur=1.67,
            forecast_sigma=0.115,
            missing_tokens=("", "-", "NA"),
            csv_format=CsvFormat(
                delimiter=",",
                encoding="utf-8",
                date_mode="iso",
                decimal_comma=False,
            ),
            sites=(
                SiteProfile(
                    code="LIL",
                    name="Lille Fulfillment",
                    city="Lille",
                    base_fte=68,
                    base_daily_orders=1180,
                    productivity_orders_per_fte=42,
                    gross_hourly_eur=16.6,
                    employer_rate=0.40,
                    interim_multiplier=1.50,
                    max_interim_share=0.30,
                    base_on_time_pct=95.8,
                    base_error_rate_pct=1.22,
                    base_cycle_min=4.4,
                    energy_kwh_base=1120,
                    kwh_per_order=0.032,
                    fuel_l_per_order=0.028,
                    avg_revenue_per_order=4.7,
                    cogs_ratio=0.57,
                    fixed_overhead_monthly=42000,
                    transport_subcontract_per_order=0.61,
                    cash_conversion_base_days=34,
                    mape_target_pct=11.5,
                    retrain_ape_threshold_pct=16.0,
                ),
            ),
        ),
    )


def generate_client_data(
    client: ClientProfile,
    *,
    start: date,
    end: date,
) -> dict[str, list[dict[str, object]]]:
    workforce_daily: list[dict[str, object]] = []
    operations_daily: list[dict[str, object]] = []
    labor_cost_daily: list[dict[str, object]] = []
    quality_incidents_daily: list[dict[str, object]] = []
    actions_adoption_daily: list[dict[str, object]] = []
    pipeline_observability_daily: list[dict[str, object]] = []
    mock_forecasts_daily: list[dict[str, object]] = []
    model_monitoring_daily: list[dict[str, object]] = []

    backlog_by_site: dict[str, int] = {
        site.code: int(site.base_daily_orders * 0.06) for site in client.sites
    }

    monthly_acc = defaultdict(
        lambda: {
            "day_count": 0,
            "planned_fte_sum": 0.0,
            "absent_fte_sum": 0.0,
            "training_hours_sum": 0.0,
            "orders_received_sum": 0.0,
            "orders_processed_sum": 0.0,
            "on_time_weighted_sum": 0.0,
            "labor_cost_sum": 0.0,
            "energy_kwh_sum": 0.0,
            "fuel_liters_sum": 0.0,
            "recommended_actions_sum": 0,
            "executed_actions_sum": 0,
            "quality_incidents_sum": 0,
            "safety_incidents_sum": 0,
            "cold_chain_breaches_sum": 0,
        }
    )

    for d in daterange(start, end):
        for site in client.sites:
            season = seasonality_factor(client.seasonality_key, d.month)
            day_factor = weekday_activity_factor(client, d)
            demand_noise = 0.93 + random.random() * 0.14
            demand_factor = season * day_factor * demand_noise

            orders_received = max(0, int(round(site.base_daily_orders * demand_factor)))
            previous_backlog = backlog_by_site[site.code]
            effective_demand = orders_received + int(previous_backlog * 0.65)

            required_fte = effective_demand / max(site.productivity_orders_per_fte, 1.0)
            planned_fte = max(4.0, site.base_fte * (0.95 + random.random() * 0.10))

            absence_rate = clamp(
                client.absence_base_rate
                * absence_season_factor(d.month)
                * (0.92 + random.random() * 0.20),
                0.01,
                0.24,
            )
            absent_fte = planned_fte * absence_rate
            available_fte = max(0.0, planned_fte - absent_fte)

            fte_gap = max(0.0, required_fte - available_fte)
            interim_cap = planned_fte * site.max_interim_share
            interim_fte = min(interim_cap, fte_gap * (0.72 + random.random() * 0.20))
            residual_gap = max(0.0, fte_gap - interim_fte)
            overtime_hours = residual_gap * (5.4 + random.random() * 1.8)

            effective_fte = available_fte + interim_fte + (overtime_hours / 7.2) * 0.82
            productivity_noise = 0.94 + random.random() * 0.12
            process_capacity = effective_fte * site.productivity_orders_per_fte * productivity_noise
            orders_processed = int(max(0.0, min(process_capacity, orders_received + previous_backlog)))
            backlog = max(0, previous_backlog + orders_received - orders_processed)
            backlog_by_site[site.code] = backlog

            strain = max(0.0, required_fte - (available_fte + interim_fte)) / max(required_fte, 1.0)

            on_time_pct = clamp(
                site.base_on_time_pct
                - strain * 10.0
                - (backlog / max(site.base_daily_orders, 1)) * 14.0
                + random.gauss(0.0, 0.6),
                78.0,
                99.9,
            )
            picking_error_pct = clamp(
                site.base_error_rate_pct
                * (1.0 + strain * 2.0 + max(season - 1.0, 0.0) * 0.55)
                + random.gauss(0.0, 0.05),
                0.05,
                4.20,
            )
            cycle_minutes = clamp(
                site.base_cycle_min
                * (1.0 + strain * 0.45 + max(season - 1.0, 0.0) * 0.20 + random.gauss(0.0, 0.03)),
                site.base_cycle_min * 0.68,
                site.base_cycle_min * 1.85,
            )
            complaints = max(
                0,
                int(round(orders_processed * (picking_error_pct / 100.0) * 0.18 + random.random() * 4)),
            )

            energy_kwh = max(
                0.0,
                site.energy_kwh_base * day_factor * (0.94 + random.random() * 0.12)
                + orders_processed * site.kwh_per_order,
            )
            fuel_liters = max(
                0.0,
                orders_processed * site.fuel_l_per_order * (0.90 + random.random() * 0.18),
            )
            co2_kg = energy_kwh * 0.055 + fuel_liters * 2.62

            safety_incidents = 1 if random.random() < clamp(0.0009 + strain * 0.018, 0.0002, 0.04) else 0
            quality_incidents = max(
                0,
                int(round(orders_processed * (picking_error_pct / 100.0) * 0.09 + random.random() * 2)),
            )
            cold_chain_breaches = 0
            if client.seasonality_key == "cold_chain":
                breach_prob = clamp(
                    0.004
                    + (0.003 if d.month in (7, 8) else 0.0)
                    + strain * 0.01,
                    0.001,
                    0.07,
                )
                cold_chain_breaches = 1 if random.random() < breach_prob else 0

            downtime_minutes = max(
                0,
                int(
                    round(
                        (safety_incidents + quality_incidents * 0.25 + cold_chain_breaches * 1.4)
                        * random.uniform(8, 30)
                    )
                ),
            )

            training_hours = 0.0
            if d.day in (5, 12, 19, 26):
                training_hours = max(0.0, planned_fte * random.uniform(0.03, 0.12))

            regular_hours = available_fte * 7.2
            wage_eur = regular_hours * site.gross_hourly_eur
            employer_contrib_eur = wage_eur * site.employer_rate
            overtime_cost_eur = overtime_hours * site.gross_hourly_eur * 1.35
            interim_cost_eur = interim_fte * 7.2 * site.gross_hourly_eur * site.interim_multiplier
            training_cost_eur = training_hours * site.gross_hourly_eur * 1.18
            total_labor_cost_eur = (
                wage_eur
                + employer_contrib_eur
                + overtime_cost_eur
                + interim_cost_eur
                + training_cost_eur
            )
            cost_per_processed_order_eur = total_labor_cost_eur / max(orders_processed, 1)

            recommended_actions_count = max(
                0,
                int(
                    round(
                        1
                        + strain * 6
                        + (1 if backlog > site.base_daily_orders * 0.18 else 0)
                        + random.uniform(0, 2)
                    )
                ),
            )
            accept_prob = clamp(
                client.adoption_maturity - strain * 0.14 + random.gauss(0.0, 0.04),
                0.25,
                0.97,
            )
            accepted_actions_count = sum(
                1 for _ in range(recommended_actions_count) if random.random() < accept_prob
            )
            execute_prob = clamp(0.90 - strain * 0.16 + random.gauss(0.0, 0.03), 0.20, 0.98)
            executed_actions_count = sum(
                1 for _ in range(accepted_actions_count) if random.random() < execute_prob
            )
            adoption_rate_pct = (
                accepted_actions_count / recommended_actions_count * 100
                if recommended_actions_count > 0
                else 0.0
            )
            execution_rate_pct = (
                executed_actions_count / accepted_actions_count * 100
                if accepted_actions_count > 0
                else 0.0
            )
            avg_time_to_decide_min = clamp(
                18 + strain * 40 + (1 - client.adoption_maturity) * 22 + random.gauss(0.0, 5.0),
                5,
                120,
            )

            source_files_received = random.randint(3, 6) + (1 if d.weekday() == 1 else 0)
            ingestion_jobs_total = random.randint(2, 5)
            fail_prob = clamp(0.01 + strain * 0.06 + (0.02 if quality_incidents > 5 else 0.0), 0.0, 0.5)
            ingestion_jobs_failed = sum(
                1 for _ in range(ingestion_jobs_total) if random.random() < fail_prob
            )
            ingestion_jobs_success = ingestion_jobs_total - ingestion_jobs_failed
            quality_anomalies_count = int(
                round(picking_error_pct * 2.2 + max(0.0, random.gauss(2.0, 1.6)) + ingestion_jobs_failed * 3)
            )
            rows_ingested = int(
                round(orders_processed * random.uniform(0.45, 0.85) + planned_fte * random.uniform(4, 9))
            )
            rows_rejected = int(round(quality_anomalies_count * random.uniform(1.0, 4.0)))
            freshness_lag_minutes = int(
                round(random.uniform(15, 80) + ingestion_jobs_failed * 35 + quality_anomalies_count * 1.8)
            )

            model_version = model_version_for_day(d)
            forecasted_orders = int(max(0, round(orders_received * (1 + random.gauss(0.0, client.forecast_sigma)))))
            interval_width = int(max(30, round(abs(forecasted_orders) * (0.08 + random.random() * 0.06))))
            confidence_low_orders = max(0, forecasted_orders - interval_width)
            confidence_high_orders = forecasted_orders + interval_width
            forecasted_absence_rate_pct = clamp(absence_rate * 100 * (1 + random.gauss(0.0, 0.12)), 0.5, 25.0)
            predicted_required_fte = forecasted_orders / max(site.productivity_orders_per_fte, 1.0)
            predicted_service_risk_pct = clamp(
                (predicted_required_fte - planned_fte) / max(predicted_required_fte, 1.0) * 100
                + random.gauss(12.0, 7.0),
                0.0,
                100.0,
            )

            mape_orders_pct = abs(forecasted_orders - orders_received) / max(orders_received, 1) * 100
            bias_orders_pct = (forecasted_orders - orders_received) / max(orders_received, 1) * 100
            data_drift_score = clamp(
                abs(season - 1.0) * 0.55 + random.uniform(0.02, 0.22) + quality_anomalies_count / 120,
                0.0,
                1.0,
            )
            concept_drift_score = clamp(
                abs(mape_orders_pct - site.mape_target_pct) / 100 + random.uniform(0.01, 0.18),
                0.0,
                1.0,
            )
            feature_coverage_pct = clamp(
                99.5 - quality_anomalies_count * 0.28 - ingestion_jobs_failed * 1.8 + random.gauss(0.0, 0.4),
                82.0,
                100.0,
            )
            retrain_recommended = (
                "yes"
                if (
                    mape_orders_pct > site.retrain_ape_threshold_pct
                    or data_drift_score > 0.62
                    or concept_drift_score > 0.68
                )
                else "no"
            )
            inference_latency_ms = clamp(26 + random.gauss(0.0, 6.0) + data_drift_score * 22, 10, 180)

            workforce_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "planned_fte": round(planned_fte, 2),
                    "absent_fte": round(absent_fte, 2),
                    "present_fte": round(max(0.0, available_fte), 2),
                    "interim_fte": round(interim_fte, 2),
                    "overtime_hours": round(overtime_hours, 2),
                    "training_hours": round(training_hours, 2),
                    "required_fte": round(required_fte, 2),
                }
            )

            operations_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "orders_received": orders_received,
                    "orders_processed": orders_processed,
                    "backlog_orders": backlog,
                    "on_time_rate_pct": round(on_time_pct, 2),
                    "picking_error_rate_pct": round(picking_error_pct, 2),
                    "avg_processing_minutes": round(cycle_minutes, 2),
                    "energy_kwh": round(energy_kwh, 2),
                    "fuel_liters": round(fuel_liters, 2),
                    "co2_kg": round(co2_kg, 2),
                    "customer_complaints": complaints,
                }
            )

            labor_cost_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "wage_eur": round(wage_eur, 2),
                    "employer_contrib_eur": round(employer_contrib_eur, 2),
                    "overtime_cost_eur": round(overtime_cost_eur, 2),
                    "interim_cost_eur": round(interim_cost_eur, 2),
                    "training_cost_eur": round(training_cost_eur, 2),
                    "total_labor_cost_eur": round(total_labor_cost_eur, 2),
                    "cost_per_processed_order_eur": round(cost_per_processed_order_eur, 2),
                }
            )

            quality_incidents_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "safety_incidents": safety_incidents,
                    "quality_incidents": quality_incidents,
                    "cold_chain_breaches": cold_chain_breaches,
                    "downtime_minutes": downtime_minutes,
                    "root_cause_cluster": random.choice(
                        [
                            "process_discipline",
                            "supplier_issue",
                            "equipment_failure",
                            "staffing_gap",
                            "temperature_excursion",
                        ]
                    ),
                }
            )

            actions_adoption_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "recommended_actions_count": recommended_actions_count,
                    "accepted_actions_count": accepted_actions_count,
                    "executed_actions_count": executed_actions_count,
                    "adoption_rate_pct": round(adoption_rate_pct, 2),
                    "execution_rate_pct": round(execution_rate_pct, 2),
                    "avg_time_to_decide_min": round(avg_time_to_decide_min, 2),
                }
            )

            pipeline_observability_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "source_files_received": source_files_received,
                    "ingestion_jobs_success": ingestion_jobs_success,
                    "ingestion_jobs_failed": ingestion_jobs_failed,
                    "quality_anomalies_count": quality_anomalies_count,
                    "rows_ingested": rows_ingested,
                    "rows_rejected": rows_rejected,
                    "freshness_lag_minutes": freshness_lag_minutes,
                }
            )

            mock_forecasts_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "model_version": model_version,
                    "forecasted_orders": forecasted_orders,
                    "forecasted_absence_rate_pct": round(forecasted_absence_rate_pct, 2),
                    "predicted_required_fte": round(predicted_required_fte, 2),
                    "predicted_service_risk_pct": round(predicted_service_risk_pct, 2),
                    "confidence_low_orders": confidence_low_orders,
                    "confidence_high_orders": confidence_high_orders,
                }
            )

            model_monitoring_daily.append(
                {
                    "date": d,
                    "site_code": site.code,
                    "site_name": site.name,
                    "model_version": model_version,
                    "mape_orders_pct": round(mape_orders_pct, 2),
                    "bias_orders_pct": round(bias_orders_pct, 2),
                    "data_drift_score": round(data_drift_score, 3),
                    "concept_drift_score": round(concept_drift_score, 3),
                    "feature_coverage_pct": round(feature_coverage_pct, 2),
                    "retrain_recommended": retrain_recommended,
                    "inference_latency_ms": round(inference_latency_ms, 2),
                }
            )

            mk = (site.code, month_start(d))
            acc = monthly_acc[mk]
            acc["day_count"] += 1
            acc["planned_fte_sum"] += planned_fte
            acc["absent_fte_sum"] += absent_fte
            acc["training_hours_sum"] += training_hours
            acc["orders_received_sum"] += orders_received
            acc["orders_processed_sum"] += orders_processed
            acc["on_time_weighted_sum"] += on_time_pct * max(orders_processed, 1)
            acc["labor_cost_sum"] += total_labor_cost_eur
            acc["energy_kwh_sum"] += energy_kwh
            acc["fuel_liters_sum"] += fuel_liters
            acc["recommended_actions_sum"] += recommended_actions_count
            acc["executed_actions_sum"] += executed_actions_count
            acc["quality_incidents_sum"] += quality_incidents
            acc["safety_incidents_sum"] += safety_incidents
            acc["cold_chain_breaches_sum"] += cold_chain_breaches

    hr_monthly: list[dict[str, object]] = []
    finance_monthly: list[dict[str, object]] = []
    roi_monthly: list[dict[str, object]] = []

    for m in month_starts_between(start, end):
        for site in client.sites:
            acc = monthly_acc[(site.code, m)]
            if acc["day_count"] == 0:
                continue

            avg_headcount_fte = acc["planned_fte_sum"] / acc["day_count"]
            absenteeism_rate_pct = (
                acc["absent_fte_sum"] / max(acc["planned_fte_sum"], 1.0) * 100
            )

            turnover_base = client.turnover_monthly_rate
            if m.month in (7, 8):
                turnover_base *= 1.15
            if m.month in (11, 12):
                turnover_base *= 1.08
            exits_fte = int(round(avg_headcount_fte * turnover_base * random.uniform(0.90, 1.15)))
            hires_fte = int(round(exits_fte * random.uniform(0.92, 1.12)))
            turnover_rate_pct = exits_fte / max(avg_headcount_fte, 1.0) * 100

            hr_monthly.append(
                {
                    "month": m,
                    "site_code": site.code,
                    "site_name": site.name,
                    "headcount_fte_avg": round(avg_headcount_fte, 2),
                    "hires_fte": hires_fte,
                    "exits_fte": exits_fte,
                    "turnover_rate_pct": round(turnover_rate_pct, 2),
                    "absenteeism_rate_pct": round(absenteeism_rate_pct, 2),
                    "training_hours": round(acc["training_hours_sum"], 2),
                }
            )

            on_time_avg = acc["on_time_weighted_sum"] / max(acc["orders_processed_sum"], 1.0)
            service_bonus_factor = 0.90 + on_time_avg / 100 * 0.12
            revenue_eur = (
                acc["orders_processed_sum"] * site.avg_revenue_per_order * service_bonus_factor
            )
            cogs_eur = revenue_eur * site.cogs_ratio * random.uniform(0.97, 1.03)
            labor_cost_eur = acc["labor_cost_sum"]
            energy_cost_eur = acc["energy_kwh_sum"] * client.energy_price_kwh_eur
            transport_cost_eur = (
                acc["fuel_liters_sum"] * client.fuel_price_l_eur
                + acc["orders_processed_sum"] * site.transport_subcontract_per_order
            )
            gross_margin_eur = (
                revenue_eur
                - cogs_eur
                - labor_cost_eur
                - energy_cost_eur
                - transport_cost_eur
            )
            ebitda_eur = gross_margin_eur - site.fixed_overhead_monthly
            cash_conversion_days = clamp(
                site.cash_conversion_base_days
                + random.gauss(0, 3)
                + (1.0 - on_time_avg / 100.0) * 12,
                18,
                95,
            )

            finance_monthly.append(
                {
                    "month": m,
                    "site_code": site.code,
                    "site_name": site.name,
                    "revenue_eur": round(revenue_eur, 2),
                    "cogs_eur": round(cogs_eur, 2),
                    "labor_cost_eur": round(labor_cost_eur, 2),
                    "energy_cost_eur": round(energy_cost_eur, 2),
                    "transport_cost_eur": round(transport_cost_eur, 2),
                    "gross_margin_eur": round(gross_margin_eur, 2),
                    "ebitda_eur": round(ebitda_eur, 2),
                    "cash_conversion_days": round(cash_conversion_days, 2),
                }
            )

            actions_executed = int(acc["executed_actions_sum"])
            savings_eur = (
                actions_executed
                * client.savings_per_action_eur
                * random.uniform(0.85, 1.20)
            )
            extra_revenue_eur = max(0.0, (on_time_avg - site.base_on_time_pct) * revenue_eur * 0.0025)
            incident_pressure = (
                acc["quality_incidents_sum"]
                + 4 * acc["safety_incidents_sum"]
                + 6 * acc["cold_chain_breaches_sum"]
            )
            avoided_cost_eur = (
                actions_executed
                * client.avoided_cost_per_action_eur
                * (0.70 + min(0.60, incident_pressure / max(1.0, acc["orders_processed_sum"]) * 120))
            )
            platform_fee_eur = (
                client.platform_fee_per_site_month_eur
                + acc["orders_processed_sum"] * client.platform_variable_fee_per_order_eur
            )
            net_gain_eur = savings_eur + extra_revenue_eur + avoided_cost_eur - platform_fee_eur
            roi_pct = net_gain_eur / max(platform_fee_eur, 1.0) * 100
            payback_days = (
                30.0 * platform_fee_eur / max(net_gain_eur, 1.0)
                if net_gain_eur > 0
                else 999.0
            )

            roi_monthly.append(
                {
                    "month": m,
                    "site_code": site.code,
                    "site_name": site.name,
                    "actions_executed": actions_executed,
                    "savings_eur": round(savings_eur, 2),
                    "extra_revenue_eur": round(extra_revenue_eur, 2),
                    "avoided_cost_eur": round(avoided_cost_eur, 2),
                    "platform_fee_eur": round(platform_fee_eur, 2),
                    "net_gain_eur": round(net_gain_eur, 2),
                    "roi_pct": round(roi_pct, 2),
                    "payback_days": round(payback_days, 2),
                }
            )

    datasets = {
        "workforce_daily": workforce_daily,
        "operations_daily": operations_daily,
        "labor_cost_daily": labor_cost_daily,
        "quality_incidents_daily": quality_incidents_daily,
        "actions_adoption_daily": actions_adoption_daily,
        "pipeline_observability_daily": pipeline_observability_daily,
        "mock_forecasts_daily": mock_forecasts_daily,
        "model_monitoring_daily": model_monitoring_daily,
        "hr_monthly": hr_monthly,
        "finance_monthly": finance_monthly,
        "roi_monthly": roi_monthly,
    }

    inject_missing(
        datasets["workforce_daily"],
        {
            "interim_fte": 0.016,
            "overtime_hours": 0.013,
            "training_hours": 0.018,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["operations_daily"],
        {
            "avg_processing_minutes": 0.012,
            "energy_kwh": 0.010,
            "customer_complaints": 0.017,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["labor_cost_daily"],
        {
            "training_cost_eur": 0.028,
            "overtime_cost_eur": 0.013,
            "cost_per_processed_order_eur": 0.010,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["quality_incidents_daily"],
        {
            "downtime_minutes": 0.020,
            "root_cause_cluster": 0.026,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["actions_adoption_daily"],
        {
            "avg_time_to_decide_min": 0.014,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["pipeline_observability_daily"],
        {
            "freshness_lag_minutes": 0.013,
            "rows_rejected": 0.012,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["mock_forecasts_daily"],
        {
            "forecasted_absence_rate_pct": 0.015,
            "predicted_service_risk_pct": 0.012,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["model_monitoring_daily"],
        {
            "feature_coverage_pct": 0.018,
            "inference_latency_ms": 0.010,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["hr_monthly"],
        {
            "training_hours": 0.019,
            "turnover_rate_pct": 0.013,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["finance_monthly"],
        {
            "transport_cost_eur": 0.019,
            "cash_conversion_days": 0.012,
        },
        tokens=client.missing_tokens,
    )
    inject_missing(
        datasets["roi_monthly"],
        {
            "avoided_cost_eur": 0.018,
            "payback_days": 0.010,
        },
        tokens=client.missing_tokens,
    )

    return datasets


def write_client_data(client: ClientProfile, datasets: dict[str, list[dict[str, object]]]) -> list[tuple[str, int]]:
    out_dir = DATA / client.slug
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    file_map: list[tuple[str, str, str, tuple[str, ...]]] = [
        ("workforce_daily", "hr", "workforce_daily.csv", ("date", "site_code")),
        ("hr_monthly", "hr", "hr_monthly.csv", ("month", "site_code")),
        (
            "operations_daily",
            "operations",
            "operations_daily.csv",
            ("date", "site_code"),
        ),
        (
            "labor_cost_daily",
            "finance",
            "labor_cost_daily.csv",
            ("date", "site_code"),
        ),
        (
            "finance_monthly",
            "finance",
            "finance_monthly.csv",
            ("month", "site_code"),
        ),
        (
            "quality_incidents_daily",
            "quality",
            "quality_incidents_daily.csv",
            ("date", "site_code"),
        ),
        (
            "actions_adoption_daily",
            "admin",
            "actions_adoption_daily.csv",
            ("date", "site_code"),
        ),
        (
            "pipeline_observability_daily",
            "admin",
            "pipeline_observability_daily.csv",
            ("date", "site_code"),
        ),
        (
            "roi_monthly",
            "admin",
            "roi_monthly.csv",
            ("month", "site_code"),
        ),
        (
            "mock_forecasts_daily",
            "mlops",
            "mock_forecasts_daily.csv",
            ("date", "site_code"),
        ),
        (
            "model_monitoring_daily",
            "mlops",
            "model_monitoring_daily.csv",
            ("date", "site_code", "model_version"),
        ),
    ]

    stats: list[tuple[str, int]] = []
    for dataset_name, subdir, filename, unique_keys in file_map:
        rows = datasets[dataset_name]
        ensure_unique(rows, unique_keys, f"{client.slug}/{filename}")
        count = write_csv(out_dir / subdir / filename, rows, client.csv_format)
        stats.append((f"{subdir}/{filename}", count))

    return stats


def write_metadata(clients: tuple[ClientProfile, ...]) -> None:
    dataset_catalog = {
        "workforce_daily": {
            "grain": "site-day",
            "purpose": "staffing capacity and productivity drivers",
        },
        "operations_daily": {
            "grain": "site-day",
            "purpose": "volume, service level, backlog, and throughput",
        },
        "labor_cost_daily": {
            "grain": "site-day",
            "purpose": "loaded labor cost and unit economics",
        },
        "quality_incidents_daily": {
            "grain": "site-day",
            "purpose": "quality and safety operational risk",
        },
        "actions_adoption_daily": {
            "grain": "site-day",
            "purpose": "adoption and execution of recommended actions",
        },
        "pipeline_observability_daily": {
            "grain": "site-day",
            "purpose": "ingestion and data quality monitoring signals",
        },
        "hr_monthly": {
            "grain": "site-month",
            "purpose": "workforce stability KPIs",
        },
        "finance_monthly": {
            "grain": "site-month",
            "purpose": "P&L oriented metrics for admin/client follow-up",
        },
        "roi_monthly": {
            "grain": "site-month",
            "purpose": "proof-of-value by site and client",
        },
        "mock_forecasts_daily": {
            "grain": "site-day",
            "purpose": "forecast inputs (intentionally mock)",
        },
        "model_monitoring_daily": {
            "grain": "site-day",
            "purpose": "MLOps quality and drift visibility",
        },
    }

    meta: dict[str, object] = {
        "dataset_policy": {
            "individual_data_allowed": False,
            "aggregation_only": True,
            "mock_data_allowed": ["forecasts"],
            "notes": "All non-forecast metrics are generated from enterprise-like operational assumptions.",
        },
        "dataset_catalog": dataset_catalog,
        "benchmarks": {
            "insee_emploi_salarie": "https://www.insee.fr/fr/statistiques/7617857",
            "insee_temps_travail": "https://www.insee.fr/fr/statistiques/8017883",
            "insee_cout_travail": "https://www.insee.fr/fr/statistiques/1375188",
            "assurance_maladie_atmp_rapport": "https://assurance-maladie.ameli.fr/etudes-et-donnees/rapport-annuel-assurance-maladie-risques-professionnels-2024",
            "fevad_bilan_ecommerce_2024": "https://www.fevad.com/bilan-du-e-commerce-en-2024-175-milliards-deuros-de-chiffre-daffaires-et-22-milliards-de-transactions/",
        },
        "clients": {},
    }

    clients_node: dict[str, object] = {}
    for client in clients:
        clients_node[client.slug] = {
            "display_name": client.display_name,
            "industry": client.industry,
            "sites": [
                {
                    "code": site.code,
                    "name": site.name,
                    "city": site.city,
                    "base_fte": site.base_fte,
                    "base_daily_orders": site.base_daily_orders,
                }
                for site in client.sites
            ],
            "assumptions": {
                "absence_base_rate": client.absence_base_rate,
                "turnover_monthly_rate": client.turnover_monthly_rate,
                "adoption_maturity": client.adoption_maturity,
                "seasonality": client.seasonality_key,
            },
        }
    meta["clients"] = clients_node

    path = DATA / "clients_metadata.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)


def main() -> None:
    start = date(2024, 1, 1)
    end = date(2025, 12, 31)
    clients = build_profiles()

    print(f"Generating aggregated enterprise datasets ({start} -> {end})\n")

    all_stats: dict[str, list[tuple[str, int]]] = {}
    for client in clients:
        print(f"  [{client.slug}]")
        datasets = generate_client_data(client, start=start, end=end)
        stats = write_client_data(client, datasets)
        all_stats[client.slug] = stats
        for file_name, n in stats:
            print(f"    {file_name:<45} {n:>6,} rows")
        print()

    write_metadata(clients)

    total_files = sum(len(items) for items in all_stats.values()) + 1
    total_rows = sum(n for items in all_stats.values() for _, n in items)
    print("=" * 70)
    print(f"  {total_files} files, {total_rows:,} total rows in {DATA}")
    print("=" * 70)


if __name__ == "__main__":
    main()
