import { describe, it, expectTypeOf, assertType } from "vitest";
import type {
  ScenarioOptionType,
  ScenarioOption,
  ParetoFrontierResponse,
} from "../domain/scenario";
import type { TenantEntity, UUID } from "../utils/common";

describe("ScenarioOptionType", () => {
  it("accepts all valid option types", () => {
    assertType<ScenarioOptionType>("hs");
    assertType<ScenarioOptionType>("interim");
    assertType<ScenarioOptionType>("realloc_intra");
    assertType<ScenarioOptionType>("realloc_inter");
    assertType<ScenarioOptionType>("service_adjust");
    assertType<ScenarioOptionType>("outsource");
  });

  it("is a string subtype", () => {
    expectTypeOf<ScenarioOptionType>().toBeString();
  });
});

describe("ScenarioOption", () => {
  it("extends TenantEntity", () => {
    expectTypeOf<ScenarioOption>().toMatchTypeOf<TenantEntity>();
  });

  it("has all required fields", () => {
    expectTypeOf<ScenarioOption>().toHaveProperty("coverageAlertId");
    expectTypeOf<ScenarioOption>().toHaveProperty("costParameterId");
    expectTypeOf<ScenarioOption>().toHaveProperty("optionType");
    expectTypeOf<ScenarioOption>().toHaveProperty("label");
    expectTypeOf<ScenarioOption>().toHaveProperty("coutTotalEur");
    expectTypeOf<ScenarioOption>().toHaveProperty("serviceAttenduPct");
    expectTypeOf<ScenarioOption>().toHaveProperty("heuresCouvertes");
    expectTypeOf<ScenarioOption>().toHaveProperty("isParetoOptimal");
    expectTypeOf<ScenarioOption>().toHaveProperty("isRecommended");
    expectTypeOf<ScenarioOption>().toHaveProperty("contraintesJson");
  });

  it("optionType is ScenarioOptionType", () => {
    expectTypeOf<
      ScenarioOption["optionType"]
    >().toEqualTypeOf<ScenarioOptionType>();
  });

  it("contraintesJson is a record", () => {
    expectTypeOf<ScenarioOption["contraintesJson"]>().toEqualTypeOf<
      Record<string, unknown>
    >();
  });

  it("boolean flags are boolean", () => {
    expectTypeOf<ScenarioOption["isParetoOptimal"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ScenarioOption["isRecommended"]>().toEqualTypeOf<boolean>();
  });
});

describe("ParetoFrontierResponse", () => {
  it("has alertId as UUID", () => {
    expectTypeOf<ParetoFrontierResponse["alertId"]>().toEqualTypeOf<UUID>();
  });

  it("options and paretoFrontier are ScenarioOption arrays", () => {
    expectTypeOf<ParetoFrontierResponse["options"]>().toEqualTypeOf<
      ScenarioOption[]
    >();
    expectTypeOf<ParetoFrontierResponse["paretoFrontier"]>().toEqualTypeOf<
      ScenarioOption[]
    >();
  });

  it("recommended is nullable ScenarioOption", () => {
    expectTypeOf<
      ParetoFrontierResponse["recommended"]
    >().toEqualTypeOf<ScenarioOption | null>();
  });
});
