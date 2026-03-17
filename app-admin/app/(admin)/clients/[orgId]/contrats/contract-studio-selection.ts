import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftResponse,
} from "@praedixa/shared-types/api";

export interface ContractStudioSelection {
  contractId: string;
  contractVersion: number;
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
