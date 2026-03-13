import { describe, expect, it } from "vitest";

import {
  listActionTemplates,
  resolveActionTemplate,
} from "../services/action-templates.js";

describe("action templates service", () => {
  it("lists active templates deterministically by default", () => {
    expect(
      listActionTemplates().map((template) => template.templateId),
    ).toEqual([
      "messaging.slack.notify_team",
      "ticketing.jira.create_task",
      "wfm.shift.schedule_adjust",
    ]);
  });

  it("includes deprecated versions only when explicitly requested", () => {
    const templates = listActionTemplates({
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      includeDeprecated: true,
    });

    expect(
      templates.map((template) => ({
        templateId: template.templateId,
        templateVersion: template.templateVersion,
        status: template.status,
      })),
    ).toEqual([
      {
        templateId: "wfm.shift.schedule_adjust",
        templateVersion: 2,
        status: "active",
      },
      {
        templateId: "wfm.shift.schedule_adjust",
        templateVersion: 1,
        status: "deprecated",
      },
    ]);
  });

  it("resolves the latest active template for an action type and destination type", () => {
    expect(
      resolveActionTemplate({
        actionType: "schedule.adjust",
        destinationType: "wfm.shift",
      }),
    ).toMatchObject({
      templateId: "wfm.shift.schedule_adjust",
      templateVersion: 2,
      status: "active",
      dryRun: {
        supported: true,
        mode: "connector_validation",
        requiresSandbox: true,
      },
      fallback: {
        supported: true,
        channel: "task_copy",
        humanRequired: true,
      },
    });
  });

  it("fails closed when a requested template family is unknown", () => {
    expect(() =>
      resolveActionTemplate({
        templateId: "missing.template",
        actionType: "schedule.adjust",
        destinationType: "wfm.shift",
      }),
    ).toThrow(/Unknown action template/);
  });

  it("fails closed when a requested template is incompatible with the action type", () => {
    expect(() =>
      resolveActionTemplate({
        templateId: "messaging.slack.notify_team",
        actionType: "schedule.adjust",
        destinationType: "messaging.slack",
      }),
    ).toThrow(/incompatible with action type/);
  });

  it("fails closed when a requested template is incompatible with the destination type", () => {
    expect(() =>
      resolveActionTemplate({
        templateId: "wfm.shift.schedule_adjust",
        templateVersion: 2,
        actionType: "schedule.adjust",
        destinationType: "ticketing.jira",
      }),
    ).toThrow(/incompatible with destination type/);
  });

  it("returns defensive copies so callers cannot mutate the catalog", () => {
    const first = listActionTemplates({
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
    })[0]!;
    const second = listActionTemplates({
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
    })[0]!;

    const retryableErrorCodes = [...first.retryPolicy.retryableErrorCodes];
    retryableErrorCodes.push("MUTATION");
    first.retryPolicy.retryableErrorCodes = retryableErrorCodes;

    first.tags = [...(first.tags ?? []), "mutated"];
    first.payloadSchemaHints[0]!.description = "mutated";

    expect(second.retryPolicy.retryableErrorCodes).not.toContain("MUTATION");
    expect(second.tags).not.toContain("mutated");
    expect(second.payloadSchemaHints[0]!.description).not.toBe("mutated");
  });

  it("fails closed when no compatible template exists", () => {
    expect(() =>
      resolveActionTemplate({
        actionType: "schedule.adjust",
        destinationType: "messaging.slack",
      }),
    ).toThrow(/No action template supports/);
  });
});
