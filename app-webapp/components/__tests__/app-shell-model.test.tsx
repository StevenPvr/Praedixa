import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatHeaderDate, useHeaderDate } from "../app-shell-model";

describe("useHeaderDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates after mount and refreshes after midnight", async () => {
    vi.setSystemTime(new Date("2026-03-21T23:59:58.000Z"));

    const { result } = renderHook(() => useHeaderDate("fr"));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(formatHeaderDate("fr"));

    vi.setSystemTime(new Date("2026-03-22T00:00:01.000Z"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    expect(result.current).toBe(formatHeaderDate("fr"));
  });
});
