#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRuntimeSecretInventory } from "./validate-runtime-secret-inventory.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const defaultInventoryPath = path.resolve(
  scriptDir,
  "../docs/deployment/runtime-env-inventory.json",
);

const expectedServiceIds = new Set([
  "landing-staging",
  "landing-prod",
  "webapp-staging",
  "webapp-prod",
  "admin-staging",
  "admin-prod",
  "api-staging",
  "api-prod",
  "auth-prod",
]);

const validEnvironments = new Set(["staging", "prod"]);
const validModes = new Set(["all_of", "any_of"]);
const requiredFrontendKeys = new Set([
  "NEXT_PUBLIC_API_URL",
  "AUTH_OIDC_ISSUER_URL",
  "AUTH_OIDC_CLIENT_ID",
  "AUTH_OIDC_SCOPE",
]);

export function loadRuntimeEnvInventory(filePath = defaultInventoryPath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function collectServiceEnvKeys(groups) {
  return new Set((groups ?? []).flatMap((group) => group.keys ?? []));
}

function validateEnvGroups({ errors, label, groups }) {
  if (!Array.isArray(groups)) {
    errors.push(`${label}.env_groups must be an array`);
    return;
  }

  const seenKeys = new Set();
  for (const [groupIndex, group] of groups.entries()) {
    const groupLabel = `${label}.env_groups[${groupIndex}]`;

    if (!group || typeof group !== "object" || Array.isArray(group)) {
      errors.push(`${groupLabel} must be an object`);
      continue;
    }

    if (!validModes.has(group.mode)) {
      errors.push(`${groupLabel}.mode must be all_of or any_of`);
    }

    if (typeof group.required_in_runtime !== "boolean") {
      errors.push(`${groupLabel}.required_in_runtime must be a boolean`);
    }

    if (typeof group.purpose !== "string" || group.purpose.length === 0) {
      errors.push(`${groupLabel}.purpose must be a non-empty string`);
    }

    if (!Array.isArray(group.keys)) {
      errors.push(`${groupLabel}.keys must be an array`);
      continue;
    }

    if (group.keys.length === 0) {
      errors.push(`${groupLabel}.keys must not be empty`);
      continue;
    }

    const groupKeys = new Set();
    for (const key of group.keys) {
      if (typeof key !== "string" || !/^[A-Z0-9_]+$/.test(key)) {
        errors.push(`${groupLabel}.keys entries must be SCREAMING_SNAKE_CASE`);
        continue;
      }
      if (groupKeys.has(key)) {
        errors.push(`${groupLabel}.keys contains duplicate key ${key}`);
      }
      if (seenKeys.has(key)) {
        errors.push(`${label} repeats env key ${key} across multiple groups`);
      }
      groupKeys.add(key);
      seenKeys.add(key);
    }
  }
}

export function validateRuntimeEnvInventory(
  inventory,
  { secretInventory = loadRuntimeSecretInventory() } = {},
) {
  const errors = [];

  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return ["inventory must be a JSON object"];
  }

  if (inventory.inventory_type !== "runtime-env") {
    errors.push(
      `inventory_type must be "runtime-env" (got ${String(
        inventory.inventory_type ?? "<empty>",
      )})`,
    );
  }

  if (inventory.schema_version !== "1") {
    errors.push(
      `schema_version must be "1" (got ${String(
        inventory.schema_version ?? "<empty>",
      )})`,
    );
  }

  if (!Array.isArray(inventory.services) || inventory.services.length === 0) {
    errors.push("services must be a non-empty array");
    return errors;
  }

  const seenServiceIds = new Set();
  const secretServices = new Map(
    secretInventory.services.map((service) => [service.service_id, service]),
  );

  for (const [index, service] of inventory.services.entries()) {
    const label = `services[${index}]`;

    if (!service || typeof service !== "object" || Array.isArray(service)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    if (typeof service.service_id !== "string" || service.service_id.length === 0) {
      errors.push(`${label}.service_id must be a non-empty string`);
      continue;
    }

    if (seenServiceIds.has(service.service_id)) {
      errors.push(`duplicate service_id ${service.service_id}`);
      continue;
    }
    seenServiceIds.add(service.service_id);

    if (!expectedServiceIds.has(service.service_id)) {
      errors.push(`${label}.service_id references unknown service ${service.service_id}`);
    }

    if (
      typeof service.environment !== "string" ||
      !validEnvironments.has(service.environment)
    ) {
      errors.push(`${label}.environment must be staging or prod`);
    }

    if (typeof service.service !== "string" || service.service.length === 0) {
      errors.push(`${label}.service must be a non-empty string`);
    }

    validateEnvGroups({ errors, label, groups: service.env_groups });

    const matchingSecretService = secretServices.get(service.service_id);
    if (!matchingSecretService) {
      errors.push(`${label}.service_id is missing from runtime-secrets-inventory`);
      continue;
    }

    if (matchingSecretService.environment !== service.environment) {
      errors.push(`${label}.environment must match runtime-secrets-inventory`);
    }

    if (matchingSecretService.service !== service.service) {
      errors.push(`${label}.service must match runtime-secrets-inventory`);
    }

    const serviceEnvKeys = collectServiceEnvKeys(service.env_groups);
    const publicOriginKeys = new Set(matchingSecretService.public_origin?.env_keys ?? []);
    for (const key of publicOriginKeys) {
      if (serviceEnvKeys.has(key)) {
        errors.push(
          `${label}.env_groups must not redeclare public_origin env key ${key}`,
        );
      }
    }

    if (service.service === "webapp" || service.service === "admin") {
      for (const requiredKey of requiredFrontendKeys) {
        if (!serviceEnvKeys.has(requiredKey)) {
          errors.push(`${label}.env_groups must include ${requiredKey}`);
        }
      }
    }
  }

  for (const expectedServiceId of expectedServiceIds) {
    if (!seenServiceIds.has(expectedServiceId)) {
      errors.push(`services must include ${expectedServiceId}`);
    }
  }

  return errors;
}
