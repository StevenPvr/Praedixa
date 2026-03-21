"""Mapping helpers for Salesforce pull -> connector raw events."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.integration_runtime_worker import RuntimeClaimedSyncRun

_DEFAULT_API_VERSION = "v61.0"

_DEFAULT_SOQL_BY_OBJECT = {
    "Account": (
        "SELECT Id, Name, Industry, BillingCity, BillingCountry, OwnerId, "
        "LastModifiedDate FROM Account"
    ),
    "Opportunity": (
        "SELECT Id, Name, StageName, Amount, CloseDate, AccountId, OwnerId, "
        "LastModifiedDate FROM Opportunity"
    ),
    "Case": (
        "SELECT Id, CaseNumber, Priority, Status, Origin, AccountId, ContactId, "
        "OwnerId, LastModifiedDate FROM Case"
    ),
    "Task": (
        "SELECT Id, Subject, Status, ActivityDate, WhatId, WhoId, OwnerId, "
        "LastModifiedDate FROM Task"
    ),
}


@dataclass(frozen=True)
class SalesforceObjectQuery:
    source_object: str
    soql: str


def resolve_salesforce_api_version(config: dict[str, object]) -> str:
    raw_version = config.get("salesforceApiVersion")
    if not isinstance(raw_version, str) or not raw_version.strip():
        return _DEFAULT_API_VERSION
    normalized = raw_version.strip()
    return normalized if normalized.startswith("v") else f"v{normalized}"


def _normalize_salesforce_datetime(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.endswith("+00:00"):
        return normalized[:-6] + "Z"
    return normalized


def _build_last_modified_where(
    claimed_run: RuntimeClaimedSyncRun,
) -> str | None:
    if claimed_run.force_full_sync:
        return None

    start = _normalize_salesforce_datetime(claimed_run.source_window_start)
    end = _normalize_salesforce_datetime(claimed_run.source_window_end)
    filters: list[str] = []
    if start is not None:
        filters.append(f"LastModifiedDate >= {start}")
    if end is not None:
        filters.append(f"LastModifiedDate <= {end}")
    if not filters:
        return None
    return " AND ".join(filters)


def build_salesforce_queries(
    source_objects: tuple[str, ...],
    claimed_run: RuntimeClaimedSyncRun,
) -> tuple[SalesforceObjectQuery, ...]:
    where_clause = _build_last_modified_where(claimed_run)
    queries: list[SalesforceObjectQuery] = []
    for source_object in source_objects:
        base_query = _DEFAULT_SOQL_BY_OBJECT[source_object]
        soql = base_query
        if where_clause is not None:
            soql = f"{base_query} WHERE {where_clause}"
        queries.append(
            SalesforceObjectQuery(
                source_object=source_object,
                soql=f"{soql} ORDER BY LastModifiedDate ASC",
            )
        )
    return tuple(queries)


def map_salesforce_record_to_event(
    source_object: str,
    record: dict[str, object],
) -> dict[str, object]:
    record_id = str(record.get("Id") or "").strip()
    if not record_id:
        raise ValueError(f"Salesforce {source_object} record is missing Id")

    source_updated_at = record.get("LastModifiedDate")
    source_updated_at_value = (
        str(source_updated_at).strip() if source_updated_at is not None else None
    )
    event_id = (
        f"salesforce:{source_object}:{record_id}:{source_updated_at_value or 'na'}"
    )

    return {
        "eventId": event_id,
        "sourceObject": source_object,
        "sourceRecordId": record_id,
        "sourceUpdatedAt": source_updated_at_value,
        "contentType": "application/json",
        "payload": {
            "provider": "salesforce",
            "sourceObject": source_object,
            "record": record,
        },
    }
