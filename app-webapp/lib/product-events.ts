"use client";

import type { ProductEvent } from "@praedixa/shared-types";
import { apiPost } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/auth/client";

async function getToken() {
  return getValidAccessToken();
}

export async function trackProductEvents(events: ProductEvent[]) {
  if (events.length === 0) return;

  try {
    const token = await getToken();
    if (!token) return;

    await apiPost<{ accepted: number }>(
      "/api/v1/product-events/batch",
      { events },
      async () => token,
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
      context,
      occurredAt: new Date().toISOString(),
    },
  ]);
}
