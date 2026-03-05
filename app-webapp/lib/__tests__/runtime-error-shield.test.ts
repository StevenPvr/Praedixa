import { describe, expect, it } from "vitest";
import { isKnownExternalRuntimeError } from "../runtime-error-shield";

describe("isKnownExternalRuntimeError", () => {
  it("matches the WebKit detectLanguage signature", () => {
    expect(
      isKnownExternalRuntimeError(
        "u().i18n.detectLanguage is not a function. (In 'u().i18n.detectLanguage(p)', 'u().i18n.detectLanguage' is undefined)",
      ),
    ).toBe(true);
  });

  it("matches Safari-style undefined object message", () => {
    expect(
      isKnownExternalRuntimeError(
        "undefined is not an object (evaluating 'u().i18n.detectLanguage(p)')",
      ),
    ).toBe(true);
  });

  it("does not swallow unrelated runtime errors", () => {
    expect(
      isKnownExternalRuntimeError(
        "undefined is not an object (evaluating 'row.targetPeriod.startDate')",
      ),
    ).toBe(false);
  });
});
