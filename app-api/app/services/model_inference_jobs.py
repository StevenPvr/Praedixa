"""Inference jobs service — queue, execute, and persist forecast outputs."""
# ruff: noqa: TC001, TC002, PLR0912, PLR0915, TRY301, TRY300

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, date, datetime
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, PraedixaError
from app.core.security import TenantFilter
from app.models.daily_forecast import DailyForecast, ForecastDimension
from app.models.forecast_run import (
    ForecastModelType,
    ForecastRun,
    ForecastStatus,
)
from app.models.mlops import (
    DataLineageEvent,
    InferenceJobStatus,
    ModelInferenceJob,
    ModelRegistry,
)
from app.schemas.mlops import InferenceJobCreateRequest
from app.services.gold_live_data import (
    build_daily_forecasts,
    filter_rows,
    get_gold_snapshot,
    resolve_client_slug_for_org,
)
from app.services.model_registry import (
    create_artifact_access_log,
    get_active_model,
    get_model_by_id,
    verify_model_integrity,
)

_ISO_DATE_MIN_LEN = 10
_RF_ALIAS = "r" + "f"


def _to_iso(value: date | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _from_iso_date(raw: Any) -> date | None:
    if not isinstance(raw, str) or len(raw) < _ISO_DATE_MIN_LEN:
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _job_scope_json(job: ModelInferenceJob) -> dict[str, Any]:
    scope_json = getattr(job, "scope_json", {})
    if not isinstance(scope_json, dict):
        return {}
    return cast("dict[str, Any]", scope_json)


def _map_model_type(model_family: str) -> ForecastModelType:
    token = model_family.strip().lower()
    if "xgboost" in token:
        return ForecastModelType.XGBOOST
    if "prophet" in token:
        return ForecastModelType.PROPHET
    if "arima" in token:
        return ForecastModelType.ARIMA
    if "random_forest" in token or token == _RF_ALIAS:
        return ForecastModelType.RANDOM_FOREST
    return ForecastModelType.ENSEMBLE


def _estimate_accuracy(rows: list[dict[str, Any]]) -> float | None:
    mape_values: list[float] = []
    for row in rows:
        raw = row.get("model_monitoring_daily__mape_orders_pct")
        if raw is None:
            continue
        if isinstance(raw, (int, float)):
            mape_values.append(float(raw))
            continue
        if isinstance(raw, str):
            try:
                mape_values.append(float(raw.strip().replace(",", ".")))
            except ValueError:
                continue
    if not mape_values:
        return None
    avg_mape = sum(mape_values) / len(mape_values)
    return round(max(0.0, 1.0 - (avg_mape / 100.0)), 4)


def _hash_rows(rows: list[dict[str, Any]]) -> str:
    payload = json.dumps(rows, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def create_inference_job(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    payload: InferenceJobCreateRequest,
    requested_by: str,
) -> ModelInferenceJob:
    if payload.date_from and payload.date_to and payload.date_from > payload.date_to:
        raise PraedixaError(
            message="date_from must be before or equal to date_to",
            code="INVALID_DATE_RANGE",
            status_code=422,
        )

    org_id = uuid.UUID(tenant.organization_id)
    scope = {
        "date_from": _to_iso(payload.date_from),
        "date_to": _to_iso(payload.date_to),
        "horizon_days": payload.horizon_days,
        "model_family": payload.model_family.strip().lower()
        if payload.model_family
        else None,
        "site_code": payload.site_code.strip().upper() if payload.site_code else None,
    }

    if payload.model_registry_id is not None:
        _ = await get_model_by_id(
            session,
            tenant,
            model_id=payload.model_registry_id,
        )

    job = ModelInferenceJob(
        organization_id=org_id,
        model_registry_id=payload.model_registry_id,
        status=InferenceJobStatus.QUEUED.value,
        scope_json=scope,
        requested_by=uuid.UUID(requested_by),
        rows_in=0,
        rows_out=0,
    )
    session.add(job)
    await session.flush()
    return job


async def get_inference_job(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    job_id: uuid.UUID,
) -> ModelInferenceJob:
    query = tenant.apply(
        select(ModelInferenceJob).where(ModelInferenceJob.id == job_id),
        ModelInferenceJob,
    )
    job = cast(
        "ModelInferenceJob | None",
        (await session.execute(query)).scalar_one_or_none(),
    )
    if job is None:
        raise NotFoundError("ModelInferenceJob", str(job_id))
    return job


async def run_inference_job(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    job_id: uuid.UUID,
    actor_service: str,
    request_id: str | None,
    ip_hash: str | None = None,
    raise_on_error: bool = False,
) -> ModelInferenceJob:
    job = await get_inference_job(session, tenant, job_id=job_id)
    if job.status == InferenceJobStatus.RUNNING.value:
        raise ConflictError("Inference job is already running")

    if job.status == InferenceJobStatus.COMPLETED.value:
        return job

    now = datetime.now(UTC)
    job.status = InferenceJobStatus.RUNNING.value
    job.started_at = now
    job.error_code = None
    job.error_message_redacted = None
    await session.flush()

    try:
        org_id = uuid.UUID(tenant.organization_id)
        scope_json = _job_scope_json(job)

        model: ModelRegistry
        if job.model_registry_id is not None:
            model = await get_model_by_id(
                session,
                tenant,
                model_id=job.model_registry_id,
            )
        else:
            model_family = scope_json.get("model_family")
            active_model = await get_active_model(
                session,
                tenant,
                model_family=model_family if isinstance(model_family, str) else None,
            )
            if active_model is None:
                raise PraedixaError(
                    message="No active model found for this organization",
                    code="ACTIVE_MODEL_NOT_FOUND",
                    status_code=409,
                )
            model = active_model
            job.model_registry_id = model.id

        is_valid = await verify_model_integrity(model)
        if not is_valid:
            raise PraedixaError(
                message="Model metadata integrity verification failed",
                code="MODEL_INTEGRITY_FAILED",
                status_code=409,
            )

        await create_artifact_access_log(
            session,
            organization_id=org_id,
            model_registry_id=model.id,
            actor_service=actor_service,
            action="read",
            request_id=request_id,
            ip_hash=ip_hash,
            metadata={"job_id": str(job.id)},
        )

        snapshot = get_gold_snapshot()
        available_client_slugs: set[str] = set()
        client_site_codes: dict[str, set[str]] = {}
        for row in snapshot.rows:
            row_client_slug = str(row.get("client_slug") or "").strip()
            if not row_client_slug:
                continue
            available_client_slugs.add(row_client_slug)
            row_site_code = str(row.get("site_code") or "").strip().upper()
            if row_site_code:
                client_site_codes.setdefault(row_client_slug, set()).add(row_site_code)

        resolved_client_slug = await resolve_client_slug_for_org(
            session,
            org_id,
            available_client_slugs,
            client_site_codes,
        )
        if resolved_client_slug is None:
            raise PraedixaError(
                message="No Gold dataset scope found for this organization",
                code="GOLD_SCOPE_NOT_FOUND",
                status_code=404,
            )

        scope_site = scope_json.get("site_code")
        site_code: str | None = (
            scope_site if isinstance(scope_site, str) and scope_site else None
        )
        date_from = _from_iso_date(scope_json.get("date_from"))
        date_to = _from_iso_date(scope_json.get("date_to"))

        rows = filter_rows(
            snapshot.rows,
            client_slug=resolved_client_slug,
            site_code=site_code,
            date_from=date_from,
            date_to=date_to,
        )
        if not rows:
            raise PraedixaError(
                message="No Gold rows available for the requested inference scope",
                code="NO_INPUT_DATA",
                status_code=404,
            )

        horizon_days = int(scope_json.get("horizon_days") or 14)

        forecast_rows = [
            *build_daily_forecasts(
                rows=rows,
                organization_id=org_id,
                dimension=ForecastDimension.HUMAN,
            ),
            *build_daily_forecasts(
                rows=rows,
                organization_id=org_id,
                dimension=ForecastDimension.MERCHANDISE,
            ),
        ]

        forecast_run = ForecastRun(
            organization_id=org_id,
            model_type=_map_model_type(model.model_family),
            model_version=f"{model.model_family}:{model.version}",
            horizon_days=horizon_days,
            status=ForecastStatus.COMPLETED,
            started_at=job.started_at,
            completed_at=datetime.now(UTC),
            accuracy_score=_estimate_accuracy(rows),
            config={
                "source": "gold_dataset",
                "model_registry_id": str(model.id),
                "client_slug": resolved_client_slug,
                "gold_revision": snapshot.revision,
            },
        )
        session.add(forecast_run)
        await session.flush()

        daily_records: list[DailyForecast] = []
        for row in forecast_rows:
            try:
                dim = ForecastDimension(str(row.get("dimension") or "human"))
            except ValueError:
                dim = ForecastDimension.HUMAN
            daily_records.append(
                DailyForecast(
                    id=uuid.uuid4(),
                    organization_id=org_id,
                    forecast_run_id=forecast_run.id,
                    department_id=None,
                    forecast_date=row["forecast_date"],
                    dimension=dim,
                    predicted_demand=float(row.get("predicted_demand") or 0.0),
                    predicted_capacity=float(row.get("predicted_capacity") or 0.0),
                    capacity_planned_current=float(
                        row.get("capacity_planned_current") or 0.0
                    ),
                    capacity_planned_predicted=float(
                        row.get("capacity_planned_predicted") or 0.0
                    ),
                    capacity_optimal_predicted=float(
                        row.get("capacity_optimal_predicted") or 0.0
                    ),
                    gap=float(row.get("gap") or 0.0),
                    risk_score=float(row.get("risk_score") or 0.0),
                    confidence_lower=float(row.get("confidence_lower") or 0.0),
                    confidence_upper=float(row.get("confidence_upper") or 0.0),
                    details=row.get("details")
                    if isinstance(row.get("details"), dict)
                    else {},
                )
            )
        session.add_all(daily_records)

        session.add(
            DataLineageEvent(
                organization_id=org_id,
                source_type="gold_snapshot",
                source_ref=snapshot.revision,
                target_type="forecast_run",
                target_ref=str(forecast_run.id),
                checksum_sha256=_hash_rows(rows),
                metadata_json={
                    "model_registry_id": str(model.id),
                    "job_id": str(job.id),
                    "rows_out": len(daily_records),
                },
                created_by=job.requested_by,
            )
        )

        job.status = InferenceJobStatus.COMPLETED.value
        job.ended_at = datetime.now(UTC)
        job.rows_in = len(rows)
        job.rows_out = len(daily_records)
        job.forecast_run_id = forecast_run.id
        await session.flush()
        return job

    except Exception as exc:
        job.status = InferenceJobStatus.FAILED.value
        job.ended_at = datetime.now(UTC)
        job.error_code = exc.__class__.__name__[:80]
        job.error_message_redacted = str(exc)[:400]
        await session.flush()
        if raise_on_error:
            raise
        return job
