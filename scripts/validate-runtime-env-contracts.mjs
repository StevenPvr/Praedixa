#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

import {
  defaultOutputPath,
  deriveRuntimeEnvContracts,
  stringifyRuntimeEnvContracts,
} from "./runtime-env-contracts.mjs";
import {
  loadRuntimeEnvInventory,
  validateRuntimeEnvInventory,
} from "./runtime-env-inventory.mjs";
import {
  loadRuntimeSecretInventory,
  validateRuntimeSecretInventory,
} from "./validate-runtime-secret-inventory.mjs";

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeGroup(group) {
  return {
    mode: group.mode,
    keys: uniqueSorted(group.keys ?? []),
    purpose: group.purpose,
  };
}

function collectGroups(groups, flagName, requiredValue) {
  return (groups ?? [])
    .filter((group) => group?.[flagName] === requiredValue)
    .map((group) => normalizeGroup(group));
}

function collectGroupKeys(groups) {
  return uniqueSorted(groups.flatMap((group) => group.keys ?? []));
}

function validateDerivedRuntimeEnvContracts(payload, { secretInventory, envInventory }) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["derived runtime env contracts must be a JSON object"];
  }

  if (payload.contract_type !== "runtime-env-contracts") {
    errors.push(
      `contract_type must be "runtime-env-contracts" (got ${String(
        payload.contract_type ?? "<empty>",
      )})`,
    );
  }

  if (payload.schema_version !== "2") {
    errors.push(
      `schema_version must be "2" (got ${String(
        payload.schema_version ?? "<empty>",
      )})`,
    );
  }

  if (!Array.isArray(payload.services)) {
    errors.push("services must be an array");
    return errors;
  }

  const actualByServiceId = new Map(
    payload.services.map((service) => [service.service_id, service]),
  );
  const envInventoryByServiceId = new Map(
    envInventory.services.map((service) => [service.service_id, service]),
  );

  for (const sourceService of secretInventory.services) {
    const actualService = actualByServiceId.get(sourceService.service_id);
    const envService = envInventoryByServiceId.get(sourceService.service_id);
    const label = `services[${sourceService.service_id}]`;

    if (!actualService) {
      errors.push(`${label} missing from generated contract`);
      continue;
    }

    const requiredSecretGroups = collectGroups(
      sourceService.secret_groups,
      "required_in_preflight",
      true,
    );
    const optionalSecretGroups = collectGroups(
      sourceService.secret_groups,
      "required_in_preflight",
      false,
    );
    const requiredEnvGroups = collectGroups(
      envService?.env_groups,
      "required_in_runtime",
      true,
    );
    const optionalEnvGroups = collectGroups(
      envService?.env_groups,
      "required_in_runtime",
      false,
    );
    const publicOrigin = sourceService.public_origin
      ? {
          expected_origin: sourceService.public_origin.expected_origin,
          env_keys: uniqueSorted(sourceService.public_origin.env_keys ?? []),
          required_in_preflight:
            sourceService.public_origin.required_in_preflight === true,
        }
      : null;
    const allSecretKeys = collectGroupKeys([
      ...requiredSecretGroups,
      ...optionalSecretGroups,
    ]);
    const allEnvKeys = uniqueSorted([
      ...collectGroupKeys([...requiredEnvGroups, ...optionalEnvGroups]),
      ...(publicOrigin?.env_keys ?? []),
    ]);

    const runtimeContract = actualService.runtime_contract;
    if (!runtimeContract || typeof runtimeContract !== "object") {
      errors.push(`${label}.runtime_contract missing`);
      continue;
    }

    const requiredFields = [
      "required_secret_groups",
      "optional_secret_groups",
      "required_env_groups",
      "optional_env_groups",
      "all_secret_keys",
      "all_env_keys",
      "all_runtime_keys",
    ];
    for (const field of requiredFields) {
      if (!(field in runtimeContract)) {
        errors.push(`${label}.runtime_contract.${field} missing`);
      }
    }

    const removedFields = [
      "required_secret_keys",
      "optional_secret_keys",
      "required_env_keys",
      "optional_env_keys",
      "required_runtime_keys",
      "optional_runtime_keys",
    ];
    for (const field of removedFields) {
      if (field in runtimeContract) {
        errors.push(`${label}.runtime_contract.${field} must not be generated anymore`);
      }
    }

    const actualPublicOrigin = runtimeContract.public_origin ?? null;
    if (JSON.stringify(actualPublicOrigin) !== JSON.stringify(publicOrigin)) {
      errors.push(`${label}.runtime_contract.public_origin does not preserve inventory semantics`);
    }

    if (
      JSON.stringify(runtimeContract.required_secret_groups ?? []) !==
      JSON.stringify(requiredSecretGroups)
    ) {
      errors.push(`${label}.runtime_contract.required_secret_groups drifted from runtime-secrets-inventory`);
    }

    if (
      JSON.stringify(runtimeContract.optional_secret_groups ?? []) !==
      JSON.stringify(optionalSecretGroups)
    ) {
      errors.push(`${label}.runtime_contract.optional_secret_groups drifted from runtime-secrets-inventory`);
    }

    if (
      JSON.stringify(runtimeContract.required_env_groups ?? []) !==
      JSON.stringify(requiredEnvGroups)
    ) {
      errors.push(`${label}.runtime_contract.required_env_groups drifted from runtime-env-inventory`);
    }

    if (
      JSON.stringify(runtimeContract.optional_env_groups ?? []) !==
      JSON.stringify(optionalEnvGroups)
    ) {
      errors.push(`${label}.runtime_contract.optional_env_groups drifted from runtime-env-inventory`);
    }

    if (
      JSON.stringify(runtimeContract.all_secret_keys ?? []) !==
      JSON.stringify(allSecretKeys)
    ) {
      errors.push(`${label}.runtime_contract.all_secret_keys drifted from grouped secret semantics`);
    }

    if (
      JSON.stringify(runtimeContract.all_env_keys ?? []) !==
      JSON.stringify(allEnvKeys)
    ) {
      errors.push(`${label}.runtime_contract.all_env_keys drifted from env/public-origin semantics`);
    }

    if (
      JSON.stringify(runtimeContract.all_runtime_keys ?? []) !==
      JSON.stringify(uniqueSorted([...allSecretKeys, ...allEnvKeys]))
    ) {
      errors.push(`${label}.runtime_contract.all_runtime_keys drifted from grouped runtime semantics`);
    }
  }

  if (actualByServiceId.size !== secretInventory.services.length) {
    errors.push(
      `generated services count mismatch: expected ${secretInventory.services.length}, got ${actualByServiceId.size}`,
    );
  }

  return errors;
}

const secretInventory = loadRuntimeSecretInventory();
const secretErrors = validateRuntimeSecretInventory(secretInventory);
if (secretErrors.length > 0) {
  console.error(
    [
      "[runtime-env-contracts] Runtime secret inventory invalid",
      ...secretErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
  process.exit(1);
}

const envInventory = loadRuntimeEnvInventory();
const envErrors = validateRuntimeEnvInventory(envInventory, { secretInventory });
if (envErrors.length > 0) {
  console.error(
    [
      "[runtime-env-contracts] Runtime env inventory invalid",
      ...envErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
  process.exit(1);
}

const expected = await stringifyRuntimeEnvContracts(
  deriveRuntimeEnvContracts({ inventory: secretInventory, envInventory }),
);

if (!existsSync(defaultOutputPath)) {
  console.error(
    `[runtime-env-contracts] Missing generated contract: ${defaultOutputPath}`,
  );
  process.exit(1);
}

const actual = readFileSync(defaultOutputPath, "utf8");
const actualPayload = JSON.parse(actual);
const semanticErrors = validateDerivedRuntimeEnvContracts(actualPayload, {
  secretInventory,
  envInventory,
});

if (semanticErrors.length > 0) {
  console.error(
    [
      `[runtime-env-contracts] Generated contract semantics invalid: ${defaultOutputPath}`,
      ...semanticErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
  process.exit(1);
}

if (actual !== expected) {
  console.error(
    [
      `[runtime-env-contracts] Generated contract drift detected: ${defaultOutputPath}`,
      "Re-run: node scripts/generate-runtime-env-contracts.mjs",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`[runtime-env-contracts] OK (${defaultOutputPath})`);
