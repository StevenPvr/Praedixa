import type { DecisionContractActor } from "@praedixa/shared-types/domain";
import type {
  DecisionContractStudioCreateRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioForkMutationRequest,
  DecisionContractStudioListRequest,
  DecisionContractStudioListResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractStudioRollbackRequest,
  DecisionContractStudioSaveRequest,
  DecisionContractStudioTransitionRequest,
} from "@praedixa/shared-types/api";

import {
  buildDecisionContractStudioDetailResponse,
  buildDecisionContractStudioForkDraftResponse,
  buildDecisionContractStudioListResponse,
  buildDecisionContractStudioRollbackCandidateResponse,
} from "./decision-contract-studio.js";
import {
  forkDecisionContractVersion,
  transitionDecisionContract,
  validateDecisionContract,
} from "./decision-contracts.js";
import { materializeDecisionContractTemplate } from "./decision-contract-templates.js";
import {
  DecisionContractRuntimeError,
  assertDraftStatus,
  assertSameLineage,
  assertTransitionSod,
  buildAuditEntry,
  buildRollbackDraft,
  cloneValue,
  normalizeOptionalText,
  normalizeScopeOverrides,
  prepareNewDraftContract,
} from "./decision-contract-runtime-support.js";
import {
  DecisionContractRuntimeStore,
  type StoredContract,
} from "./decision-contract-runtime-store.js";

interface SaveDraftInput {
  organizationId: string;
  workspaceId?: string | null;
  request: DecisionContractStudioSaveRequest;
  actor: DecisionContractActor;
}

interface CreateDraftInput {
  organizationId: string;
  workspaceId?: string | null;
  request: DecisionContractStudioCreateRequest;
  actor: DecisionContractActor;
}

interface TransitionInput {
  organizationId: string;
  contractId: string;
  contractVersion: number;
  request: DecisionContractStudioTransitionRequest;
  actor: DecisionContractActor;
}

interface ForkInput {
  organizationId: string;
  contractId: string;
  contractVersion: number;
  request: DecisionContractStudioForkMutationRequest;
  actor: DecisionContractActor;
}

interface RollbackInput {
  organizationId: string;
  contractId: string;
  contractVersion: number;
  request: DecisionContractStudioRollbackRequest;
  actor: DecisionContractActor;
}

function prepareSavedDraftContract(
  contracts: readonly StoredContract[],
  input: SaveDraftInput,
) {
  const workspaceId = normalizeOptionalText(
    input.workspaceId ?? input.request.contract.workspaceId,
  );
  let contract = cloneValue(input.request.contract);
  assertDraftStatus(contract);
  validateDecisionContract(contract);

  const existing = contracts.find(
    (item) =>
      item.contract.contractId === contract.contractId &&
      item.contract.contractVersion === contract.contractVersion,
  );

  if (!existing) {
    if (contract.contractVersion !== 1) {
      throw new DecisionContractRuntimeError(
        "DECISION_CONTRACT_INITIAL_VERSION_REQUIRED",
        "A new DecisionContract line must start at version 1.",
        409,
      );
    }
    return {
      contract: prepareNewDraftContract(
        contract,
        input.organizationId,
        workspaceId,
        input.actor,
      ),
      existing: null,
      workspaceId,
    };
  }

  assertSameLineage(contract, existing.contract);
  assertDraftStatus(existing.contract);
  contract.organizationId = input.organizationId;
  contract.workspaceId = workspaceId ?? undefined;
  contract.audit = {
    ...existing.contract.audit,
    updatedBy: input.actor.userId,
    updatedAt: input.actor.decidedAt,
    changeReason: input.actor.reason,
    notes: input.actor.notes ?? null,
  };
  return { contract, existing, workspaceId };
}

function toForkDraftResponse(
  sourceContract: StoredContract["contract"],
  targetContractVersion: number,
  draftContract: StoredContract["contract"],
): DecisionContractStudioForkDraftResponse {
  const detail = buildDecisionContractStudioDetailResponse(draftContract);
  return {
    sourceContractId: sourceContract.contractId,
    sourceContractVersion: sourceContract.contractVersion,
    targetContractVersion,
    draftContract,
    badge: detail.badge,
    validation: detail.validation,
    publishReadiness: detail.publishReadiness,
    lineage: detail.lineage,
  };
}

export class DecisionContractRuntimeService {
  private readonly store: DecisionContractRuntimeStore;

  constructor(databaseUrl: string | null) {
    this.store = new DecisionContractRuntimeStore(databaseUrl);
  }

  private async loadContracts(
    organizationId: string,
    workspaceId?: string | null,
  ) {
    return this.store.listStoredContracts(organizationId, workspaceId);
  }

  async listContracts(
    request: DecisionContractStudioListRequest,
  ): Promise<DecisionContractStudioListResponse> {
    if (!request.organizationId) {
      throw new DecisionContractRuntimeError(
        "DECISION_CONTRACT_ORGANIZATION_REQUIRED",
        "organizationId is required to list DecisionContracts.",
      );
    }

    const contracts = (
      await this.loadContracts(request.organizationId, request.workspaceId)
    ).map((item) => item.contract);
    return buildDecisionContractStudioListResponse(contracts, request);
  }

  async getContractDetail(
    organizationId: string,
    request: {
      contractId: string;
      contractVersion: number;
      compareToVersion?: number;
    },
  ): Promise<DecisionContractStudioDetailResponse> {
    const contracts = await this.loadContracts(organizationId);
    const current = this.store.findStoredContract(
      contracts,
      request.contractId,
      request.contractVersion,
    );
    const compareTo =
      request.compareToVersion == null
        ? undefined
        : this.store.findStoredContract(
            contracts,
            request.contractId,
            request.compareToVersion,
          ).contract;
    const history = await this.store.listAuditEntries(
      organizationId,
      request.contractId,
    );
    return buildDecisionContractStudioDetailResponse(
      current.contract,
      compareTo,
      history,
    );
  }

  async saveDraft(
    input: SaveDraftInput,
  ): Promise<DecisionContractStudioDetailResponse> {
    const contracts = await this.loadContracts(input.organizationId);
    const prepared = prepareSavedDraftContract(contracts, input);
    validateDecisionContract(prepared.contract);
    await this.store.persistStoredContract(prepared.contract);
    await this.store.appendAuditEntry(
      buildAuditEntry(
        prepared.contract,
        prepared.existing
          ? "decision_contract_saved"
          : "decision_contract_created",
        input.actor.reason,
        input.actor.userId,
      ),
      input.organizationId,
      prepared.workspaceId,
      prepared.contract.contractId,
    );
    return this.getContractDetail(input.organizationId, {
      contractId: prepared.contract.contractId,
      contractVersion: prepared.contract.contractVersion,
      compareToVersion: prepared.contract.audit.previousVersion ?? undefined,
    });
  }

  async createDraftFromTemplate(
    input: CreateDraftInput,
  ): Promise<DecisionContractStudioDetailResponse> {
    const contract = materializeDecisionContractTemplate({
      ...input.request,
      scopeOverrides: normalizeScopeOverrides(input.request.scopeOverrides),
      actor: input.actor,
    });
    return this.saveDraft({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      actor: input.actor,
      request: { contract },
    });
  }

  private async persistSupersededPublishedVersions(
    organizationId: string,
    currentContract: StoredContract["contract"],
    actor: DecisionContractActor,
  ) {
    const contracts = await this.loadContracts(organizationId);
    const superseded = contracts
      .filter((item) => item.contract.contractId === currentContract.contractId)
      .filter(
        (item) =>
          item.contract.contractVersion !== currentContract.contractVersion,
      )
      .filter((item) => item.contract.status === "published");

    for (const item of superseded) {
      const archived = transitionDecisionContract(item.contract, "archive", {
        userId: actor.userId,
        decidedAt: actor.decidedAt,
        reason: `superseded_by_v${currentContract.contractVersion}`,
        notes: actor.notes,
      });
      await this.store.persistStoredContract(archived);
      await this.store.appendAuditEntry(
        buildAuditEntry(
          archived,
          "decision_contract_archived",
          archived.audit.changeReason,
          actor.userId,
          { supersededByVersion: currentContract.contractVersion },
        ),
        organizationId,
        normalizeOptionalText(archived.workspaceId),
        archived.contractId,
      );
    }
  }

  async transitionContract(
    input: TransitionInput,
  ): Promise<DecisionContractStudioDetailResponse> {
    const contracts = await this.loadContracts(input.organizationId);
    const stored = this.store.findStoredContract(
      contracts,
      input.contractId,
      input.contractVersion,
    );
    assertTransitionSod(stored.contract, input.request.transition, input.actor);
    const next = transitionDecisionContract(
      stored.contract,
      input.request.transition,
      input.actor,
    );
    await this.store.persistStoredContract(next);
    if (input.request.transition === "publish") {
      await this.persistSupersededPublishedVersions(
        input.organizationId,
        next,
        input.actor,
      );
    }
    await this.store.appendAuditEntry(
      buildAuditEntry(
        next,
        `decision_contract_transition_${input.request.transition}`,
        input.request.reason,
        input.actor.userId,
      ),
      input.organizationId,
      normalizeOptionalText(next.workspaceId),
      next.contractId,
    );
    return this.getContractDetail(input.organizationId, {
      contractId: next.contractId,
      contractVersion: next.contractVersion,
      compareToVersion: next.audit.previousVersion ?? undefined,
    });
  }

  async forkDraft(
    input: ForkInput,
  ): Promise<DecisionContractStudioForkDraftResponse> {
    const contracts = await this.loadContracts(input.organizationId);
    const stored = this.store.findStoredContract(
      contracts,
      input.contractId,
      input.contractVersion,
    );
    const forked = forkDecisionContractVersion(stored.contract, {
      actor: input.actor,
      name: input.request.name,
      description: input.request.description,
    });
    forked.organizationId = input.organizationId;
    forked.workspaceId = stored.workspaceId ?? undefined;
    await this.store.persistStoredContract(forked);
    await this.store.appendAuditEntry(
      buildAuditEntry(
        forked,
        "decision_contract_forked",
        input.request.reason,
        input.actor.userId,
        { sourceContractVersion: stored.contract.contractVersion },
      ),
      input.organizationId,
      normalizeOptionalText(forked.workspaceId),
      forked.contractId,
    );
    return buildDecisionContractStudioForkDraftResponse(stored.contract, {
      contractId: stored.contract.contractId,
      contractVersion: stored.contract.contractVersion,
      actor: input.actor,
      name: input.request.name,
      description: input.request.description,
    });
  }

  async listRollbackCandidates(
    organizationId: string,
    contractId: string,
    contractVersion: number,
  ): Promise<DecisionContractStudioRollbackCandidateResponse> {
    const contracts = await this.loadContracts(organizationId);
    const current = this.store.findStoredContract(
      contracts,
      contractId,
      contractVersion,
    );
    return buildDecisionContractStudioRollbackCandidateResponse(
      current.contract,
      contracts.map((item) => item.contract),
    );
  }

  async rollbackDraft(
    input: RollbackInput,
  ): Promise<DecisionContractStudioForkDraftResponse> {
    const contracts = await this.loadContracts(input.organizationId);
    const current = this.store.findStoredContract(
      contracts,
      input.contractId,
      input.contractVersion,
    );
    const target = this.store.findStoredContract(
      contracts,
      input.contractId,
      input.request.targetVersion,
    );
    const draft = buildRollbackDraft(
      current.contract,
      target.contract,
      this.store.findLatestVersion(contracts, input.contractId),
      input.actor,
      input.request.name,
      input.request.description,
    );
    draft.organizationId = input.organizationId;
    draft.workspaceId = current.workspaceId ?? undefined;
    validateDecisionContract(draft);
    await this.store.persistStoredContract(draft);
    await this.store.appendAuditEntry(
      buildAuditEntry(
        draft,
        "decision_contract_rollback_created",
        input.request.reason,
        input.actor.userId,
        {
          sourceContractVersion: current.contract.contractVersion,
          targetContractVersion: target.contract.contractVersion,
        },
      ),
      input.organizationId,
      normalizeOptionalText(draft.workspaceId),
      draft.contractId,
    );
    return toForkDraftResponse(
      current.contract,
      target.contract.contractVersion,
      draft,
    );
  }

  async close(): Promise<void> {
    await this.store.close();
  }
}

let singleton: DecisionContractRuntimeService | null = null;

export async function initializeDecisionContractRuntimeService(
  databaseUrl: string | null,
): Promise<void> {
  singleton = new DecisionContractRuntimeService(databaseUrl);
  await singleton
    .listContracts({
      organizationId: "11111111-1111-1111-1111-111111111111",
    })
    .catch(() => undefined);
}

export function getDecisionContractRuntimeService(): DecisionContractRuntimeService {
  if (!singleton) {
    singleton = new DecisionContractRuntimeService(
      process.env.DATABASE_URL?.trim() || null,
    );
  }
  return singleton;
}

export async function closeDecisionContractRuntimeService(): Promise<void> {
  if (singleton) {
    await singleton.close();
    singleton = null;
  }
}
