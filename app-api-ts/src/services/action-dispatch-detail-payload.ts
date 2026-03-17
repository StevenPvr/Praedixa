import { createHash } from "node:crypto";

import type {
  ActionDispatchDetailPayloadRef,
  ActionDispatchDetailPayloadRefSource,
} from "@praedixa/shared-types/api";

function sortUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function getPayloadKind(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value === "object" ? "object" : typeof value;
}

function collectPayloadShape(
  value: unknown,
  path: string,
  fieldPaths: Set<string>,
  descriptors: Set<string>,
): void {
  const kind = getPayloadKind(value);
  const descriptorPath = path.length > 0 ? path : "$";
  descriptors.add(`${descriptorPath}:${kind}`);

  if (path.length > 0) {
    fieldPaths.add(path);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPayloadShape(item, `${path}[]`, fieldPaths, descriptors);
    }
    return;
  }

  if (kind !== "object") {
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const childPath = path.length > 0 ? `${path}.${key}` : key;
    collectPayloadShape(
      (value as Record<string, unknown>)[key],
      childPath,
      fieldPaths,
      descriptors,
    );
  }
}

export function buildPayloadRef(
  source: ActionDispatchDetailPayloadRefSource,
  payload?: Record<string, unknown>,
): ActionDispatchDetailPayloadRef {
  if (payload == null) {
    return {
      source,
      available: false,
      fieldCount: 0,
      fieldPaths: [],
    };
  }

  const fieldPaths = new Set<string>();
  const descriptors = new Set<string>();
  collectPayloadShape(payload, "", fieldPaths, descriptors);
  const sortedPaths = sortUnique([...fieldPaths]);
  const fingerprint = createHash("sha256")
    .update(sortUnique([...descriptors]).join("\n"))
    .digest("hex")
    .slice(0, 16);

  return {
    source,
    available: true,
    fingerprint,
    fieldCount: sortedPaths.length,
    fieldPaths: sortedPaths,
  };
}
