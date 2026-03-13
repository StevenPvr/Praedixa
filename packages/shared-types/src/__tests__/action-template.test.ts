import { assertType, describe, expectTypeOf, it } from "vitest";

import type {
  ActionTemplate,
  ActionTemplateDryRunMode,
  ActionTemplateIdempotencyMode,
  ActionTemplateIdempotencyScope,
  ActionTemplatePayloadKind,
  ActionTemplateStatus,
} from "../domain/action-template.js";
import type {
  ActionDispatchRetryPolicy,
  ActionTemplateRef,
  ActionFallbackChannel,
} from "../domain/action-dispatch.js";
import type { DecisionApprovalRequirement } from "../domain/decision-contract.js";

describe("ActionTemplateStatus", () => {
  it("keeps lifecycle visibility explicit", () => {
    assertType<ActionTemplateStatus>("active");
    assertType<ActionTemplateStatus>("deprecated");
  });
});

describe("ActionTemplatePayloadKind", () => {
  it("supports strict payload hint primitives", () => {
    assertType<ActionTemplatePayloadKind>("string");
    assertType<ActionTemplatePayloadKind>("integer");
    assertType<ActionTemplatePayloadKind>("number");
    assertType<ActionTemplatePayloadKind>("boolean");
    assertType<ActionTemplatePayloadKind>("enum");
    assertType<ActionTemplatePayloadKind>("object");
    assertType<ActionTemplatePayloadKind>("array");
  });
});

describe("ActionTemplateIdempotencyPolicy", () => {
  it("keeps idempotency expectations explicit", () => {
    assertType<ActionTemplateIdempotencyMode>("required");
    assertType<ActionTemplateIdempotencyMode>("optional");
    assertType<ActionTemplateIdempotencyScope>("action");
    assertType<ActionTemplateIdempotencyScope>("recommendation");
    assertType<ActionTemplateIdempotencyScope>("contract_version");
    assertType<ActionTemplateIdempotencyScope>("payload_hash");
  });
});

describe("ActionTemplateDryRunCapability", () => {
  it("captures dry-run execution shapes", () => {
    assertType<ActionTemplateDryRunMode>("payload_preview");
    assertType<ActionTemplateDryRunMode>("connector_validation");
    assertType<ActionTemplateDryRunMode>("sandbox_dispatch");
  });
});

describe("ActionTemplate", () => {
  it("keeps approvals, retry policy, dry-run, fallback, and idempotency typed", () => {
    expectTypeOf<ActionTemplateRef>().toHaveProperty("templateId");
    expectTypeOf<ActionTemplateRef>().toHaveProperty("templateVersion");
    expectTypeOf<ActionTemplate["requiredApprovals"]>().toEqualTypeOf<
      readonly DecisionApprovalRequirement[]
    >();
    expectTypeOf<
      ActionTemplate["retryPolicy"]
    >().toEqualTypeOf<ActionDispatchRetryPolicy>();
    expectTypeOf<
      NonNullable<ActionTemplate["fallback"]["channel"]>
    >().toEqualTypeOf<ActionFallbackChannel>();
  });

  it("accepts a fully versioned action template shape", () => {
    const template = {
      kind: "ActionTemplate",
      schemaVersion: "1.0.0",
      templateId: "wfm.shift.schedule_adjust",
      templateVersion: 2,
      name: "WFM shift adjustment",
      status: "active",
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      destinationSystem: "ukg",
      payloadSchemaHints: [
        {
          path: "site_code",
          kind: "string",
          required: true,
        },
        {
          path: "reason_code",
          kind: "enum",
          required: true,
          allowedValues: ["coverage_gap", "absence"],
        },
      ],
      requiredApprovals: [
        {
          ruleId: "ops_manager",
          approverRole: "ops_manager",
          minStepOrder: 1,
        },
      ],
      retryPolicy: {
        maxAttempts: 2,
        retryableErrorCodes: ["UKG_RATE_LIMIT"],
        backoffStrategy: "exponential",
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      },
      idempotencyPolicy: {
        mode: "required",
        scope: "recommendation",
        keyTemplate: "{{contractId}}:{{recommendationId}}:{{destinationType}}",
        ttlHours: 72,
      },
      dryRun: {
        supported: true,
        mode: "payload_preview",
      },
      fallback: {
        supported: true,
        channel: "task_copy",
        humanRequired: true,
      },
    } satisfies ActionTemplate;

    expectTypeOf(template).toEqualTypeOf<ActionTemplate>();
  });
});
