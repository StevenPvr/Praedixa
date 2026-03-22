"""Vendor selection for provider-driven sync runs."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, cast

from app.integrations.connectors.blue_yonder.extractor import (
    pull_blue_yonder_connection,
)
from app.integrations.connectors.cdk.extractor import pull_cdk_connection
from app.integrations.connectors.fourth.extractor import pull_fourth_connection
from app.integrations.connectors.geotab.extractor import pull_geotab_connection
from app.integrations.connectors.manhattan.extractor import (
    pull_manhattan_connection,
)
from app.integrations.connectors.ncr_aloha.extractor import (
    pull_ncr_aloha_connection,
)
from app.integrations.connectors.olo.extractor import pull_olo_connection
from app.integrations.connectors.oracle_tm.extractor import (
    pull_oracle_tm_connection,
)
from app.integrations.connectors.reynolds.extractor import (
    pull_reynolds_connection,
)
from app.integrations.connectors.salesforce.extractor import pull_salesforce_connection
from app.integrations.connectors.sap_tm.extractor import pull_sap_tm_connection
from app.integrations.connectors.toast.extractor import pull_toast_connection
from app.integrations.connectors.ukg.extractor import pull_ukg_connection

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import (
        ConnectorsRuntimeClient,
        RuntimeClaimedSyncRun,
    )
    from app.services.integration_sftp_runtime_worker import RuntimeSyncRunExecutionPlan

ProviderPuller = Callable[..., Awaitable[Any]]
ProviderPullerFactory = Callable[[], ProviderPuller]


@dataclass(frozen=True)
class ProviderPullResult:
    """Summary for provider-driven raw event extraction."""

    fetched_records: int = 0
    accepted_events: int = 0
    duplicate_events: int = 0


_STANDARD_PROVIDER_PULLERS: dict[str, ProviderPullerFactory] = {
    "salesforce": lambda: pull_salesforce_connection,
    "ukg": lambda: pull_ukg_connection,
    "toast": lambda: pull_toast_connection,
    "cdk": lambda: pull_cdk_connection,
    "reynolds": lambda: pull_reynolds_connection,
    "blue_yonder": lambda: pull_blue_yonder_connection,
    "manhattan": lambda: pull_manhattan_connection,
    "ncr_aloha": lambda: pull_ncr_aloha_connection,
    "olo": lambda: pull_olo_connection,
    "fourth": lambda: pull_fourth_connection,
    "oracle_tm": lambda: pull_oracle_tm_connection,
    "sap_tm": lambda: pull_sap_tm_connection,
}


def _should_pull_provider_events(connection: dict[str, Any]) -> bool:
    config = connection.get("config", {})
    if not isinstance(config, dict):
        return True
    typed_config = cast("dict[str, object]", config)
    pull_enabled = typed_config.get("pullEnabled", None)
    return pull_enabled is not False


def _to_provider_pull_result(result: Any) -> ProviderPullResult:
    return ProviderPullResult(
        fetched_records=int(result.fetched_records),
        accepted_events=int(result.accepted_events),
        duplicate_events=int(result.duplicate_events),
    )


async def _pull_standard_provider(
    vendor: str,
    runtime_client: ConnectorsRuntimeClient,
    connection: dict[str, Any],
    access_context: Any,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
) -> Any:
    puller = _STANDARD_PROVIDER_PULLERS[vendor]()
    return await puller(
        runtime_client,
        connection,
        access_context,
        claimed_run,
        worker_id=worker_id,
    )


async def pull_provider_events_for_sync_run(
    runtime_client: ConnectorsRuntimeClient,
    claimed_run: RuntimeClaimedSyncRun,
    *,
    worker_id: str,
    execution_plan: RuntimeSyncRunExecutionPlan | None = None,
) -> ProviderPullResult:
    connection = await runtime_client.get_connection(
        claimed_run.organization_id,
        claimed_run.connection_id,
    )
    if not _should_pull_provider_events(connection):
        return ProviderPullResult()

    vendor = str(connection.get("vendor") or "").strip()
    if vendor not in _STANDARD_PROVIDER_PULLERS and vendor != "geotab":
        return ProviderPullResult()

    access_context = await runtime_client.get_provider_access_context(
        claimed_run.organization_id,
        claimed_run.connection_id,
    )
    if vendor == "geotab":
        result = await pull_geotab_connection(
            runtime_client,
            connection,
            access_context,
            claimed_run,
            execution_plan=execution_plan,
            worker_id=worker_id,
        )
    else:
        result = await _pull_standard_provider(
            vendor,
            runtime_client,
            connection,
            access_context,
            claimed_run,
            worker_id=worker_id,
        )

    return _to_provider_pull_result(result)
