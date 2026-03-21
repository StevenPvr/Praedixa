import { loadConfig } from "./config.js";
import { createAppServer } from "./server.js";
import { initializeDecisionConfigService } from "./services/decision-config.js";
import { initializeDecisionContractRuntimeService } from "./services/decision-contract-runtime.js";
import { initializeOnboardingCamundaRuntime } from "./services/admin-onboarding-camunda.js";

function isLoopbackCamundaUrl(baseUrl: string | null): boolean {
  if (!baseUrl) {
    return false;
  }

  try {
    const parsed = new URL(baseUrl);
    return (
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function formatStartupError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function buildCamundaStartupWarning(
  baseUrl: string | null,
  error: unknown,
): string {
  const nextStep = isLoopbackCamundaUrl(baseUrl)
    ? " Run `pnpm camunda:up`, or set `CAMUNDA_ENABLED=false` if you are not working on onboarding locally."
    : "";
  return (
    "[api] Camunda onboarding runtime unavailable during startup; " +
    "continuing with API boot. Onboarding routes will fail closed until " +
    `Camunda responds. baseUrl=${baseUrl ?? "unset"} cause=${formatStartupError(error)}.` +
    nextStep
  );
}

const config = loadConfig(process.env);
await initializeDecisionConfigService(config.databaseUrl);
await initializeDecisionContractRuntimeService(config.databaseUrl);
try {
  await initializeOnboardingCamundaRuntime(config.camunda);
} catch (error) {
  process.stderr.write(
    `${buildCamundaStartupWarning(config.camunda.baseUrl, error)}\n`,
  );
}
createAppServer(config);
