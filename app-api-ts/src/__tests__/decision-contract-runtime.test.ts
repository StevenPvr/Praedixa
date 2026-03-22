import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DecisionContractRuntimeService } from "../services/decision-contract-runtime.js";

function actor(
  userId: string,
  decidedAt: string,
  reason: string,
  notes?: string,
) {
  return {
    userId,
    decidedAt,
    reason,
    ...(notes !== undefined ? { notes } : {}),
  };
}

describe("decision-contract runtime service", () => {
  let service: DecisionContractRuntimeService;

  beforeEach(() => {
    service = new DecisionContractRuntimeService(null);
  });

  afterEach(async () => {
    await service.close();
  });

  it("creates a persisted draft from a template and exposes list/detail history", async () => {
    const detail = await service.createDraftFromTemplate({
      organizationId: "org-1",
      actor: actor(
        "11111111-1111-1111-1111-111111111111",
        "2026-03-16T09:00:00.000Z",
        "bootstrap_coverage_contract",
      ),
      request: {
        templateId: "coverage.site.standard",
        templateVersion: 2,
        contractId: "coverage-core",
        name: "Coverage core",
        reason: "bootstrap_coverage_contract",
        tags: ["coverage", "studio"],
      },
    });

    expect(detail.contract.contractId).toBe("coverage-core");
    expect(detail.contract.status).toBe("draft");
    expect(detail.history[0]).toMatchObject({
      action: "decision_contract_created",
      reason: "bootstrap_coverage_contract",
    });

    const list = await service.listContracts({
      organizationId: "org-1",
      statuses: ["draft"],
    });
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({
      contractId: "coverage-core",
      contractVersion: 1,
      status: "draft",
    });
  });

  it("enforces separation of duties for approval and publication", async () => {
    await service.createDraftFromTemplate({
      organizationId: "org-1",
      actor: actor(
        "11111111-1111-1111-1111-111111111111",
        "2026-03-16T09:00:00.000Z",
        "bootstrap_coverage_contract",
      ),
      request: {
        templateId: "coverage.site.standard",
        templateVersion: 2,
        contractId: "coverage-core",
        name: "Coverage core",
        reason: "bootstrap_coverage_contract",
      },
    });

    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 1,
      actor: actor(
        "11111111-1111-1111-1111-111111111111",
        "2026-03-16T09:10:00.000Z",
        "ready_for_testing",
      ),
      request: {
        transition: "submit_for_testing",
        reason: "ready_for_testing",
      },
    });

    await expect(
      service.transitionContract({
        organizationId: "org-1",
        contractId: "coverage-core",
        contractVersion: 1,
        actor: actor(
          "11111111-1111-1111-1111-111111111111",
          "2026-03-16T09:20:00.000Z",
          "self_approve_attempt",
        ),
        request: {
          transition: "approve",
          reason: "self_approve_attempt",
        },
      }),
    ).rejects.toMatchObject({
      code: "DECISION_CONTRACT_SOD_REQUIRED",
      statusCode: 409,
    });

    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 1,
      actor: actor(
        "22222222-2222-2222-2222-222222222222",
        "2026-03-16T09:30:00.000Z",
        "review_passed",
      ),
      request: {
        transition: "approve",
        reason: "review_passed",
      },
    });

    await expect(
      service.transitionContract({
        organizationId: "org-1",
        contractId: "coverage-core",
        contractVersion: 1,
        actor: actor(
          "22222222-2222-2222-2222-222222222222",
          "2026-03-16T09:40:00.000Z",
          "publish_same_actor",
        ),
        request: {
          transition: "publish",
          reason: "publish_same_actor",
        },
      }),
    ).rejects.toMatchObject({
      code: "DECISION_CONTRACT_SOD_REQUIRED",
      statusCode: 409,
    });
  });

  it("forks, publishes a new version, archives the old one, and creates rollback drafts", async () => {
    await service.createDraftFromTemplate({
      organizationId: "org-1",
      actor: actor(
        "11111111-1111-1111-1111-111111111111",
        "2026-03-16T09:00:00.000Z",
        "bootstrap_coverage_contract",
      ),
      request: {
        templateId: "coverage.site.standard",
        templateVersion: 2,
        contractId: "coverage-core",
        name: "Coverage core",
        reason: "bootstrap_coverage_contract",
      },
    });

    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 1,
      actor: actor(
        "11111111-1111-1111-1111-111111111111",
        "2026-03-16T09:10:00.000Z",
        "ready_for_testing",
      ),
      request: {
        transition: "submit_for_testing",
        reason: "ready_for_testing",
      },
    });
    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 1,
      actor: actor(
        "22222222-2222-2222-2222-222222222222",
        "2026-03-16T09:20:00.000Z",
        "review_passed",
      ),
      request: {
        transition: "approve",
        reason: "review_passed",
      },
    });
    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 1,
      actor: actor(
        "33333333-3333-3333-3333-333333333333",
        "2026-03-16T09:30:00.000Z",
        "go_live_v1",
      ),
      request: {
        transition: "publish",
        reason: "go_live_v1",
      },
    });

    const fork = await service.forkDraft({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 1,
      actor: actor(
        "44444444-4444-4444-4444-444444444444",
        "2026-03-16T09:40:00.000Z",
        "iterate_after_launch",
      ),
      request: {
        reason: "iterate_after_launch",
        name: "Coverage core v2",
      },
    });
    expect(fork.draftContract.contractVersion).toBe(2);

    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 2,
      actor: actor(
        "44444444-4444-4444-4444-444444444444",
        "2026-03-16T09:50:00.000Z",
        "ready_v2",
      ),
      request: {
        transition: "submit_for_testing",
        reason: "ready_v2",
      },
    });
    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 2,
      actor: actor(
        "55555555-5555-5555-5555-555555555555",
        "2026-03-16T10:00:00.000Z",
        "review_v2",
      ),
      request: {
        transition: "approve",
        reason: "review_v2",
      },
    });
    await service.transitionContract({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 2,
      actor: actor(
        "66666666-6666-6666-6666-666666666666",
        "2026-03-16T10:10:00.000Z",
        "go_live_v2",
      ),
      request: {
        transition: "publish",
        reason: "go_live_v2",
      },
    });

    const list = await service.listContracts({
      organizationId: "org-1",
      includeArchived: true,
    });
    expect(
      list.items.map((item) => `${item.contractVersion}:${item.status}`),
    ).toEqual(expect.arrayContaining(["2:published", "1:archived"]));

    const rollback = await service.rollbackDraft({
      organizationId: "org-1",
      contractId: "coverage-core",
      contractVersion: 2,
      actor: actor(
        "77777777-7777-7777-7777-777777777777",
        "2026-03-16T10:20:00.000Z",
        "rollback_after_regression",
      ),
      request: {
        targetVersion: 1,
        reason: "rollback_after_regression",
        name: "Coverage core rollback",
      },
    });

    expect(rollback.targetContractVersion).toBe(1);
    expect(rollback.draftContract.contractVersion).toBe(3);
    expect(rollback.draftContract.audit.rollbackFromVersion).toBe(2);

    const detail = await service.getContractDetail("org-1", {
      contractId: "coverage-core",
      contractVersion: 3,
      compareToVersion: 1,
    });
    expect(detail.history[0]?.action).toBe(
      "decision_contract_rollback_created",
    );
  });
});
