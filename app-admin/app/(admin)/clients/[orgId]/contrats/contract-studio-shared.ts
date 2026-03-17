import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioListResponse,
} from "@praedixa/shared-types/api";

export interface ContractStudioSelection {
  contractId: string;
  contractVersion: number;
}

export interface ContractStudioStatusCounts {
  draft: number;
  testing: number;
  published: number;
}

export function buildContractSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function buildSelectionFromList(
  data: DecisionContractStudioListResponse | null,
): ContractStudioSelection | null {
  const first = data?.items[0] ?? null;
  if (!first) {
    return null;
  }
  return {
    contractId: first.contractId,
    contractVersion: first.contractVersion,
  };
}

export function nextSelectionFromResult(
  result:
    | DecisionContractStudioDetailResponse
    | DecisionContractStudioForkDraftResponse
    | null,
): ContractStudioSelection | null {
  if (!result) {
    return null;
  }
  if ("draftContract" in result) {
    return {
      contractId: result.draftContract.contractId,
      contractVersion: result.draftContract.contractVersion,
    };
  }
  return {
    contractId: result.contract.contractId,
    contractVersion: result.contract.contractVersion,
  };
}

export function buildContractStatusCounts(
  data: DecisionContractStudioListResponse | null,
): ContractStudioStatusCounts {
  const counts: ContractStudioStatusCounts = {
    draft: 0,
    testing: 0,
    published: 0,
  };
  for (const item of data?.items ?? []) {
    if (item.status === "draft") {
      counts.draft += 1;
    }
    if (item.status === "testing") {
      counts.testing += 1;
    }
    if (item.status === "published") {
      counts.published += 1;
    }
  }
  return counts;
}
