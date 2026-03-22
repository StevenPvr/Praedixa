"use client";

import type { ProductEvent } from "@praedixa/shared-types";
import { apiPost } from "@/lib/api/client";

async function getToken() {
  return null;
}

export async function trackProductEvents(events: ProductEvent[]) {
  if (events.length === 0) return;

  try {
    await apiPost<{ accepted: number }>(
      "/api/v1/product-events/batch",
      { events },
      getToken,
    );
  } catch {
    // UX telemetry must never block the primary workflow.
  }
}

export async function trackProductEvent(
  name: ProductEvent["name"],
  context?: Record<string, unknown>,
) {
  await trackProductEvents([
    {
      name,
      ...(context ? { context } : {}),
      occurredAt: new Date().toISOString(),
    },
  ]);
}
