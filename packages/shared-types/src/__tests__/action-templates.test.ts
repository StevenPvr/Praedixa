import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  ActionTemplateListRequest,
  ActionTemplateListResponse,
  ActionTemplateResolveRequest,
  ActionTemplateResolveResponse,
} from "../api/action-templates.js";
import type { ActionTemplate } from "../domain/action-template.js";

describe("action-templates API types", () => {
  it("accepts list and resolve request shapes", () => {
    assertType<ActionTemplateListRequest>({
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      includeDeprecated: true,
      search: "ukg",
      tags: ["coverage"],
    });

    assertType<ActionTemplateResolveRequest>({
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      templateId: "wfm.shift.schedule_adjust",
      templateVersion: 2,
    });
  });

  it("keeps responses anchored to ActionTemplate records", () => {
    expectTypeOf<ActionTemplateListResponse["items"]>().toEqualTypeOf<
      readonly ActionTemplate[]
    >();
    expectTypeOf<ActionTemplateResolveResponse>().toHaveProperty("template");
  });
});
