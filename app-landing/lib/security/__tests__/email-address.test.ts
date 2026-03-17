import { describe, expect, it } from "vitest";

import {
  isSemanticallyValidEmailAddress,
  validateSemanticEmailAddress,
} from "../email-address";

describe("semantic email validation", () => {
  it("accepts realistic business and public inboxes", () => {
    expect(isSemanticallyValidEmailAddress("Jean.Dupont+ops@Acme.fr")).toBe(
      true,
    );
    expect(isSemanticallyValidEmailAddress("team@sub.acme.co.uk")).toBe(true);
    expect(isSemanticallyValidEmailAddress("ops@praedixa.com")).toBe(true);
    expect(isSemanticallyValidEmailAddress("someone@gmail.com")).toBe(true);
  });

  it("rejects placeholder local parts", () => {
    expect(validateSemanticEmailAddress("test@acme.fr")).toMatchObject({
      valid: false,
      reason: "placeholder_local_part",
    });
    expect(validateSemanticEmailAddress("noreply@acme.fr")).toMatchObject({
      valid: false,
      reason: "placeholder_local_part",
    });
  });

  it("rejects reserved and disposable domains", () => {
    expect(validateSemanticEmailAddress("jean@example.com")).toMatchObject({
      valid: false,
      reason: "reserved_domain",
    });
    expect(validateSemanticEmailAddress("jean@acme.local")).toMatchObject({
      valid: false,
      reason: "reserved_domain",
    });
    expect(validateSemanticEmailAddress("jean@mailinator.com")).toMatchObject({
      valid: false,
      reason: "disposable_domain",
    });
  });

  it("rejects malformed addresses", () => {
    expect(validateSemanticEmailAddress("bad-email")).toMatchObject({
      valid: false,
      reason: "invalid_format",
    });
    expect(validateSemanticEmailAddress("jean..dupont@acme.fr")).toMatchObject({
      valid: false,
      reason: "invalid_format",
    });
    expect(validateSemanticEmailAddress("jean@acme")).toMatchObject({
      valid: false,
      reason: "invalid_format",
    });
  });
});
