import { describe, expect, it } from "vitest";

import { parseIdempotencyKeyHeader } from "../routes.js";

describe("sync route safeguards", () => {
  it("requires a single valid idempotency key", () => {
    expect(parseIdempotencyKeyHeader(undefined)).toEqual({
      ok: false,
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "Idempotency-Key header is required",
    });

    expect(parseIdempotencyKeyHeader(["abc", "def"])).toEqual({
      ok: false,
      code: "INVALID_IDEMPOTENCY_KEY",
      message: "Idempotency-Key header must be provided exactly once",
    });

    expect(parseIdempotencyKeyHeader("bad value")).toEqual({
      ok: false,
      code: "INVALID_IDEMPOTENCY_KEY",
      message:
        "Idempotency-Key must be 8-128 chars and use only letters, numbers, colon, underscore or hyphen",
    });

    expect(parseIdempotencyKeyHeader("sync-key_001")).toEqual({
      ok: true,
      value: "sync-key_001",
    });
  });
});
