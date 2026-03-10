"""Model registry service — secure registration and activation flows."""
# ruff: noqa: TC001, TC002

from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime
from typing import Any, cast
from urllib.parse import urlparse

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, PraedixaError
from app.core.key_management import (
    KEY_TYPE_FIT_PARAMS_HMAC,
    KeyManagementError,
    KeyProvider,
    get_key_provider,
)
from app.core.security import TenantFilter
from app.models.mlops import (
    ModelArtifactAccessLog,
    ModelRegistry,
    ModelRegistryStatus,
)
from app.schemas.mlops import ModelRegisterRequest

_ALLOWED_ARTIFACT_SCHEMES = frozenset({"s3", "scw", "https", "file"})
_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_SHA256_HEX_LEN = 64


def _canonical_payload(
    *,
    model_family: str,
    version: str,
    artifact_uri: str,
    sha256: str,
    onnx_opset: int | None,
    features_schema_json: dict[str, Any],
    metrics_json: dict[str, Any],
) -> bytes:
    payload = {
        "artifact_uri": artifact_uri,
        "features_schema_json": features_schema_json,
        "metrics_json": metrics_json,
        "model_family": model_family,
        "onnx_opset": onnx_opset,
        "sha256": sha256,
        "version": version,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _normalize_sha256(value: str) -> str:
    token = value.strip().lower()
    if len(token) != _SHA256_HEX_LEN:
        raise PraedixaError(
            message="Invalid sha256 length",
            code="INVALID_SHA256",
            status_code=422,
        )
    if any(ch not in "0123456789abcdef" for ch in token):
        raise PraedixaError(
            message="Invalid sha256 format",
            code="INVALID_SHA256",
            status_code=422,
        )
    return token


def _validate_artifact_uri(uri: str) -> str:
    token = uri.strip()
    if not token:
        raise PraedixaError(
            message="artifact_uri cannot be empty",
            code="INVALID_ARTIFACT_URI",
            status_code=422,
        )

    parsed = urlparse(token)
    scheme = parsed.scheme.lower()
    if scheme not in _ALLOWED_ARTIFACT_SCHEMES:
        raise PraedixaError(
            message="artifact_uri scheme is not allowed",
            code="INVALID_ARTIFACT_URI",
            status_code=422,
            details={"allowed_schemes": ",".join(sorted(_ALLOWED_ARTIFACT_SCHEMES))},
        )

    if settings.is_production and scheme == "file":
        raise PraedixaError(
            message="file:// artifact_uri is forbidden in production",
            code="INVALID_ARTIFACT_URI",
            status_code=422,
        )

    if scheme in {"s3", "scw"}:
        if not parsed.netloc or not parsed.path or parsed.path == "/":
            raise PraedixaError(
                message="artifact_uri must include bucket and key",
                code="INVALID_ARTIFACT_URI",
                status_code=422,
            )
        return token

    if scheme == "https":
        host = (parsed.hostname or "").lower()
        if not host or host in _LOCAL_HOSTS:
            raise PraedixaError(
                message="artifact_uri host is invalid",
                code="INVALID_ARTIFACT_URI",
                status_code=422,
            )
        return token

    # file://
    if not parsed.path:
        raise PraedixaError(
            message="artifact_uri file path missing",
            code="INVALID_ARTIFACT_URI",
            status_code=422,
        )
    return token


async def _maybe_close_provider(provider: KeyProvider) -> None:
    close_fn = getattr(provider, "close", None)
    if close_fn is None:
        return
    await close_fn()


async def _get_hmac_digest(
    *,
    provider: KeyProvider,
    organization_id: uuid.UUID,
    payload: bytes,
) -> str:
    hmac_key = await provider.get_hmac_key(
        organization_id,
        KEY_TYPE_FIT_PARAMS_HMAC,
    )
    return hmac.new(hmac_key, payload, hashlib.sha256).hexdigest()


async def create_artifact_access_log(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
    model_registry_id: uuid.UUID,
    actor_service: str,
    action: str,
    request_id: str | None,
    ip_hash: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    session.add(
        ModelArtifactAccessLog(
            organization_id=organization_id,
            model_registry_id=model_registry_id,
            actor_service=actor_service[:80],
            action=action[:50],
            request_id=request_id[:64] if request_id else None,
            ip_hash=ip_hash[:64] if ip_hash else None,
            metadata_json=metadata or {},
        )
    )
    await session.flush()


async def get_model_by_id(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    model_id: uuid.UUID,
) -> ModelRegistry:
    query = tenant.apply(
        select(ModelRegistry).where(ModelRegistry.id == model_id),
        ModelRegistry,
    )
    model = cast(
        "ModelRegistry | None",
        (await session.execute(query)).scalar_one_or_none(),
    )
    if model is None:
        raise NotFoundError("ModelRegistry", str(model_id))
    return model


async def register_model(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    payload: ModelRegisterRequest,
    created_by: str,
    request_id: str | None,
    actor_service: str,
    ip_hash: str | None = None,
) -> ModelRegistry:
    org_id = uuid.UUID(tenant.organization_id)
    clean_uri = _validate_artifact_uri(payload.artifact_uri)
    clean_sha = _normalize_sha256(payload.sha256)
    model_family = payload.model_family.strip().lower()
    version = payload.version.strip()

    exists_q = tenant.apply(
        select(ModelRegistry.id).where(
            ModelRegistry.model_family == model_family,
            ModelRegistry.version == version,
        ),
        ModelRegistry,
    )
    if (await session.execute(exists_q)).scalar_one_or_none() is not None:
        msg = (
            "Model version already exists for "
            f"family='{model_family}' version='{version}'"
        )
        raise ConflictError(msg)

    provider = get_key_provider(settings)
    try:
        digest_payload = _canonical_payload(
            model_family=model_family,
            version=version,
            artifact_uri=clean_uri,
            sha256=clean_sha,
            onnx_opset=payload.onnx_opset,
            features_schema_json=payload.features_schema_json,
            metrics_json=payload.metrics_json,
        )
        metadata_hmac = await _get_hmac_digest(
            provider=provider,
            organization_id=org_id,
            payload=digest_payload,
        )
    except KeyManagementError as exc:
        raise PraedixaError(
            message="Key provider configuration error",
            code="KEY_PROVIDER_ERROR",
            status_code=500,
            details={"cause": str(exc)[:200]},
        ) from exc
    finally:
        await _maybe_close_provider(provider)

    model = ModelRegistry(
        organization_id=org_id,
        model_family=model_family,
        version=version,
        status=ModelRegistryStatus.DRAFT.value,
        artifact_uri=clean_uri,
        sha256=clean_sha,
        metadata_hmac=metadata_hmac,
        onnx_opset=payload.onnx_opset,
        features_schema_json=payload.features_schema_json,
        metrics_json=payload.metrics_json,
        created_by=uuid.UUID(created_by),
    )
    session.add(model)
    await session.flush()

    await create_artifact_access_log(
        session,
        organization_id=org_id,
        model_registry_id=model.id,
        actor_service=actor_service,
        action="register",
        request_id=request_id,
        ip_hash=ip_hash,
        metadata={"status": model.status},
    )
    return model


async def verify_model_integrity(model: ModelRegistry) -> bool:
    org_id = model.organization_id
    provider = get_key_provider(settings)
    try:
        digest_payload = _canonical_payload(
            model_family=model.model_family,
            version=model.version,
            artifact_uri=model.artifact_uri,
            sha256=model.sha256,
            onnx_opset=model.onnx_opset,
            features_schema_json=model.features_schema_json,
            metrics_json=model.metrics_json,
        )
        expected = await _get_hmac_digest(
            provider=provider,
            organization_id=org_id,
            payload=digest_payload,
        )
    except KeyManagementError as exc:
        raise PraedixaError(
            message="Key provider configuration error",
            code="KEY_PROVIDER_ERROR",
            status_code=500,
            details={"cause": str(exc)[:200]},
        ) from exc
    finally:
        await _maybe_close_provider(provider)

    return hmac.compare_digest(expected, model.metadata_hmac)


async def activate_model(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    model_id: uuid.UUID,
    request_id: str | None,
    actor_service: str,
    ip_hash: str | None = None,
) -> ModelRegistry:
    model = await get_model_by_id(session, tenant, model_id=model_id)
    is_valid = await verify_model_integrity(model)
    if not is_valid:
        raise PraedixaError(
            message="Model metadata integrity check failed",
            code="MODEL_INTEGRITY_FAILED",
            status_code=409,
        )

    await session.execute(
        update(ModelRegistry)
        .where(
            ModelRegistry.organization_id == tenant.organization_id,
            ModelRegistry.model_family == model.model_family,
            ModelRegistry.id != model.id,
            ModelRegistry.status == ModelRegistryStatus.ACTIVE.value,
        )
        .values(status=ModelRegistryStatus.ARCHIVED.value, activated_at=None)
    )

    model.status = ModelRegistryStatus.ACTIVE.value
    model.activated_at = datetime.now(UTC)
    await session.flush()

    await create_artifact_access_log(
        session,
        organization_id=model.organization_id,
        model_registry_id=model.id,
        actor_service=actor_service,
        action="activate",
        request_id=request_id,
        ip_hash=ip_hash,
        metadata={"model_family": model.model_family},
    )
    return model


async def get_active_model(
    session: AsyncSession,
    tenant: TenantFilter,
    *,
    model_family: str | None = None,
) -> ModelRegistry | None:
    query = tenant.apply(
        select(ModelRegistry)
        .where(ModelRegistry.status == ModelRegistryStatus.ACTIVE.value)
        .order_by(
            ModelRegistry.activated_at.desc().nulls_last(),
            ModelRegistry.created_at.desc(),
        )
        .limit(1),
        ModelRegistry,
    )
    if model_family:
        query = query.where(ModelRegistry.model_family == model_family.strip().lower())

    return cast(
        "ModelRegistry | None",
        (await session.execute(query)).scalar_one_or_none(),
    )
