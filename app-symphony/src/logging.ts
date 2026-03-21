import process from "node:process";

import {
  createTelemetryCorrelation,
  createTelemetryLogger,
} from "@praedixa/telemetry";

import { createRequestId } from "./utils.js";

export function createSymphonyLogger(
  service = "symphony",
  env = "development",
) {
  return createTelemetryLogger({
    service,
    env,
    write({ level, serialized }) {
      const target = level === "error" ? process.stderr : process.stdout;
      target.write(`${serialized}\n`);
    },
  });
}

export function createLogCorrelation(actionId?: string) {
  return createTelemetryCorrelation({
    requestId: createRequestId("symphony"),
    actionId: actionId ?? null,
  });
}
