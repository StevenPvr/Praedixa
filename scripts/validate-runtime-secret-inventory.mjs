#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultInventoryPath = path.resolve(
  scriptDir,
  "../docs/deployment/runtime-secrets-inventory.json",
);
const defaultMatrixPath = path.resolve(
  scriptDir,
  "../docs/deployment/environment-secrets-owners-matrix.md",
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
const frontendServices = new Set(["webapp", "admin"]);

export function loadRuntimeSecretInventory(filePath = defaultInventoryPath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function parseRuntimeSecretDocRefs(markdown) {
  const refs = [];
  const start = markdown.indexOf("## Surface matrix");
  const end = markdown.indexOf("## Variable and secret sets");
  if (start === -1 || end === -1 || end <= start) {
    return refs;
  }

  const section = markdown.slice(start, end);
  const extractInlineCode = (value) =>
    Array.from(value.matchAll(/`([^`]+)`/g), (match) => match[1]);

  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("| `")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 8) {
      continue;
    }

    const [serviceId] = extractInlineCode(cells[0]);
    const namespaceAndContainer = extractInlineCode(cells[2]);
    const [secretPathPrefix] = extractInlineCode(cells[7]);
    const containerName = namespaceAndContainer[1];

    if (!serviceId || !containerName || !secretPathPrefix) {
      continue;
    }

    refs.push({
      serviceId,
      containerName,
      secretPathPrefix,
    });
  }
  return refs;
}

function validateKeyGroups({ errors, label, groups, fieldName }) {
  if (!Array.isArray(groups) || groups.length === 0) {
    errors.push(`${label}.${fieldName} must be a non-empty array`);
    return;
  }

  const seenKeys = new Set();
  for (const [groupIndex, group] of groups.entries()) {
    const groupLabel = `${label}.${fieldName}[${groupIndex}]`;

    if (!group || typeof group !== "object" || Array.isArray(group)) {
      errors.push(`${groupLabel} must be an object`);
      continue;
    }

    if (!validModes.has(group.mode)) {
      errors.push(`${groupLabel}.mode must be all_of or any_of`);
    }

    if (typeof group.required_in_preflight !== "boolean") {
      errors.push(`${groupLabel}.required_in_preflight must be a boolean`);
    }

    if (typeof group.purpose !== "string" || group.purpose.length === 0) {
      errors.push(`${groupLabel}.purpose must be a non-empty string`);
    }

    if (!Array.isArray(group.keys) || group.keys.length === 0) {
      errors.push(`${groupLabel}.keys must be a non-empty array`);
      continue;
    }

    const normalizedKeys = new Set();
    for (const key of group.keys) {
      if (typeof key !== "string" || !/^[A-Z0-9_]+$/.test(key)) {
        errors.push(
          `${groupLabel}.keys entries must be SCREAMING_SNAKE_CASE strings`,
        );
        continue;
      }
      if (normalizedKeys.has(key)) {
        errors.push(`${groupLabel} contains duplicate key ${key}`);
      }
      if (seenKeys.has(key)) {
        errors.push(
          `${label} repeats ${fieldName} key ${key} across multiple groups`,
        );
      }
      normalizedKeys.add(key);
      seenKeys.add(key);
    }
  }
}

function validatePublicOrigin({ errors, label, publicOrigin }) {
  if (
    !publicOrigin ||
    typeof publicOrigin !== "object" ||
    Array.isArray(publicOrigin)
  ) {
    errors.push(`${label}.public_origin must be an object`);
    return;
  }

  if (typeof publicOrigin.required_in_preflight !== "boolean") {
    errors.push(
      `${label}.public_origin.required_in_preflight must be a boolean`,
    );
  }

  if (
    typeof publicOrigin.purpose !== "string" ||
    publicOrigin.purpose.length === 0
  ) {
    errors.push(`${label}.public_origin.purpose must be a non-empty string`);
  }

  if (
    !Array.isArray(publicOrigin.env_keys) ||
    publicOrigin.env_keys.length === 0
  ) {
    errors.push(`${label}.public_origin.env_keys must be a non-empty array`);
  } else {
    const seenEnvKeys = new Set();
    for (const key of publicOrigin.env_keys) {
      if (typeof key !== "string" || !/^[A-Z0-9_]+$/.test(key)) {
        errors.push(
          `${label}.public_origin.env_keys entries must be SCREAMING_SNAKE_CASE strings`,
        );
        continue;
      }
      if (seenEnvKeys.has(key)) {
        errors.push(
          `${label}.public_origin.env_keys contains duplicate key ${key}`,
        );
      }
      seenEnvKeys.add(key);
    }

    if (!seenEnvKeys.has("AUTH_APP_ORIGIN")) {
      errors.push(
        `${label}.public_origin.env_keys must include AUTH_APP_ORIGIN`,
      );
    }
  }

  if (
    typeof publicOrigin.expected_origin !== "string" ||
    publicOrigin.expected_origin.length === 0
  ) {
    errors.push(
      `${label}.public_origin.expected_origin must be a non-empty string`,
    );
    return;
  }

  try {
    const parsed = new URL(publicOrigin.expected_origin);
    if (parsed.protocol !== "https:") {
      errors.push(`${label}.public_origin.expected_origin must use https`);
    }
    if (parsed.username || parsed.password) {
      errors.push(
        `${label}.public_origin.expected_origin must not include credentials`,
      );
    }
    if (parsed.port) {
      errors.push(
        `${label}.public_origin.expected_origin must not include an explicit port`,
      );
    }
    if ((parsed.pathname || "/") !== "/") {
      errors.push(
        `${label}.public_origin.expected_origin must not include a path`,
      );
    }
    if (parsed.search || parsed.hash) {
      errors.push(
        `${label}.public_origin.expected_origin must not include query or fragment`,
      );
    }
  } catch {
    errors.push(`${label}.public_origin.expected_origin must be a valid URL`);
  }
}

export function validateRuntimeSecretInventory(inventory, options = {}) {
  const errors = [];
  const checkMatrixSync = options.checkMatrixSync ?? true;
  const matrixMarkdown = checkMatrixSync
    ? (options.matrixMarkdown ??
      readFileSync(options.matrixPath ?? defaultMatrixPath, "utf8"))
    : "";

  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return ["inventory must be a JSON object"];
  }

  if (inventory.inventory_type !== "runtime-secrets") {
    errors.push(
      `inventory_type must be "runtime-secrets" (got ${String(
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
  const seenContainers = new Set();
  const actualServiceIds = new Set();

  for (const [index, service] of inventory.services.entries()) {
    const label = `services[${index}]`;

    if (!service || typeof service !== "object" || Array.isArray(service)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    const {
      service_id: serviceId,
      environment,
      service: serviceName,
      namespace_name: namespaceName,
      container_name: containerName,
      secret_path_prefix: secretPathPrefix,
      owner,
      reviewers,
      rotation_sla_days: rotationSlaDays,
      preflight_required: preflightRequired,
      secret_groups: secretGroups,
      public_origin: publicOrigin,
    } = service;

    if (typeof serviceId !== "string" || serviceId.length === 0) {
      errors.push(`${label}.service_id must be a non-empty string`);
    } else {
      actualServiceIds.add(serviceId);
      if (seenServiceIds.has(serviceId)) {
        errors.push(`duplicate service_id: ${serviceId}`);
      }
      seenServiceIds.add(serviceId);
    }

    if (!validEnvironments.has(environment)) {
      errors.push(`${label}.environment must be staging or prod`);
    }

    if (typeof serviceName !== "string" || serviceName.length === 0) {
      errors.push(`${label}.service must be a non-empty string`);
    }

    if (typeof namespaceName !== "string" || namespaceName.length === 0) {
      errors.push(`${label}.namespace_name must be a non-empty string`);
    }

    if (typeof containerName !== "string" || containerName.length === 0) {
      errors.push(`${label}.container_name must be a non-empty string`);
    } else if (seenContainers.has(containerName)) {
      errors.push(`duplicate container_name: ${containerName}`);
    } else {
      seenContainers.add(containerName);
    }

    if (typeof owner !== "string" || owner.length === 0) {
      errors.push(`${label}.owner must be a non-empty string`);
    }

    if (!Array.isArray(reviewers) || reviewers.length === 0) {
      errors.push(`${label}.reviewers must be a non-empty array`);
    } else if (
      reviewers.some(
        (reviewer) => typeof reviewer !== "string" || reviewer.length === 0,
      )
    ) {
      errors.push(`${label}.reviewers entries must be non-empty strings`);
    }

    if (
      !Number.isInteger(rotationSlaDays) ||
      Number(rotationSlaDays) <= 0 ||
      Number(rotationSlaDays) > 365
    ) {
      errors.push(
        `${label}.rotation_sla_days must be an integer between 1 and 365`,
      );
    }

    if (typeof preflightRequired !== "boolean") {
      errors.push(`${label}.preflight_required must be a boolean`);
    }

    const expectedPathPrefix =
      typeof environment === "string" && typeof containerName === "string"
        ? `/praedixa/${environment}/${containerName}/runtime`
        : null;
    if (typeof secretPathPrefix !== "string" || secretPathPrefix.length === 0) {
      errors.push(`${label}.secret_path_prefix must be a non-empty string`);
    } else if (expectedPathPrefix && secretPathPrefix !== expectedPathPrefix) {
      errors.push(
        `${label}.secret_path_prefix must equal ${expectedPathPrefix}`,
      );
    }

    validateKeyGroups({
      errors,
      label,
      groups: secretGroups,
      fieldName: "secret_groups",
    });

    if (frontendServices.has(serviceName)) {
      validatePublicOrigin({
        errors,
        label,
        publicOrigin,
      });
    }
  }

  for (const expectedServiceId of expectedServiceIds) {
    if (!actualServiceIds.has(expectedServiceId)) {
      errors.push(`missing required service_id ${expectedServiceId}`);
    }
  }

  for (const actualServiceId of actualServiceIds) {
    if (!expectedServiceIds.has(actualServiceId)) {
      errors.push(`unexpected service_id ${actualServiceId}`);
    }
  }

  if (checkMatrixSync) {
    const docRefs = parseRuntimeSecretDocRefs(matrixMarkdown);
    if (docRefs.length === 0) {
      errors.push(
        "docs/deployment/environment-secrets-owners-matrix.md is missing runtime secret inventory refs",
      );
    }

    const inventoryById = new Map(
      inventory.services.map((service) => [service.service_id, service]),
    );

    const seenDocRefs = new Set();
    for (const docRef of docRefs) {
      seenDocRefs.add(docRef.serviceId);
      const service = inventoryById.get(docRef.serviceId);
      if (!service) {
        errors.push(
          `doc ref ${docRef.serviceId} does not exist in runtime secret inventory`,
        );
        continue;
      }
      if (service.container_name !== docRef.containerName) {
        errors.push(
          `doc ref ${docRef.serviceId} container mismatch (${docRef.containerName} != ${service.container_name})`,
        );
      }
      if (service.secret_path_prefix !== docRef.secretPathPrefix) {
        errors.push(
          `doc ref ${docRef.serviceId} path mismatch (${docRef.secretPathPrefix} != ${service.secret_path_prefix})`,
        );
      }
    }

    for (const serviceId of actualServiceIds) {
      if (!seenDocRefs.has(serviceId)) {
        errors.push(
          `missing doc ref for runtime secret inventory service ${serviceId}`,
        );
      }
    }
  }

  return errors;
}

function parseArgs(argv) {
  const args = {
    inventoryPath: defaultInventoryPath,
    matrixPath: defaultMatrixPath,
    format: "summary",
    checkMatrixSync: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--inventory":
        args.inventoryPath = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--matrix":
        args.matrixPath = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--format":
        args.format = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--structure-only":
        args.checkMatrixSync = false;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.format !== "summary" && args.format !== "json") {
    throw new Error(
      `Unsupported format: ${args.format} (expected summary|json)`,
    );
  }

  return args;
}

function runCli() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `[runtime-secrets] ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(2);
  }

  const inventory = loadRuntimeSecretInventory(args.inventoryPath);
  const errors = validateRuntimeSecretInventory(inventory, {
    matrixPath: args.matrixPath,
    checkMatrixSync: args.checkMatrixSync,
  });

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[runtime-secrets] ${error}`);
    }
    process.exit(1);
  }

  if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
    return;
  }

  const secretKeyCount = inventory.services.reduce(
    (total, service) =>
      total +
      service.secret_groups.reduce(
        (serviceTotal, group) => serviceTotal + group.keys.length,
        0,
      ),
    0,
  );
  console.log(
    `[runtime-secrets] OK: ${inventory.services.length} services, ${secretKeyCount} declared keys validated in ${args.inventoryPath}${args.checkMatrixSync ? "" : " (structure-only)"}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
