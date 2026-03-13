import { readFileSync } from "node:fs";

const ALLOWED_ENVIRONMENTS = ["staging", "prod"];
const ALLOWED_METHODS = ["GET", "HEAD", "OPTIONS"];
const ALLOWED_SERVICES = [
  "api",
  "landing",
  "webapp",
  "admin",
  "auth",
  "connectors",
];
const ALLOWED_HOST_MODES = ["canonical", "explicit"];
const ALLOWED_SEVERITIES = ["critical", "warning", "info"];
const ALLOWED_PROBE_KINDS = ["http_status"];
const REQUIRED_SOURCE_RUNBOOKS = [
  "docs/runbooks/observability-baseline.md",
  "docs/runbooks/post-deploy-smoke-baseline.md",
];
const REQUIRED_METADATA_FIELDS = [
  "runbook",
  "dashboard",
  "responseOwner",
  "smokeService",
  "symptom",
];
const REQUIRED_SERVICE_COVERAGE = {
  api: 2,
  landing: 1,
  webapp: 1,
  admin: 1,
  auth: 1,
  connectors: 1,
};
const REQUIRED_PROBE_INTENTS = {
  api: ["health", "anonymous_rejection"],
  landing: ["public_homepage"],
  webapp: ["login_page"],
  admin: ["login_page"],
  auth: ["oidc_discovery"],
  connectors: ["health"],
};
const EXPECTED_HOST_MODES = {
  api: { staging: "canonical", prod: "canonical" },
  landing: { staging: "explicit", prod: "canonical" },
  webapp: { staging: "canonical", prod: "canonical" },
  admin: { staging: "canonical", prod: "canonical" },
  auth: { staging: "explicit", prod: "canonical" },
  connectors: { staging: "explicit", prod: "canonical" },
};
const DASHBOARD_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sortedArray(values) {
  return [...values].sort();
}

function validateExactStringArray(value, expectedValues, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }

  const actual = JSON.stringify(sortedArray(value));
  const expected = JSON.stringify(sortedArray(expectedValues));
  if (actual !== expected) {
    errors.push(
      `${label} must equal ${JSON.stringify(sortedArray(expectedValues))}`,
    );
  }
}

function validateExactCoverageMap(value, expectedMap, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const [service, requiredCount] of Object.entries(expectedMap)) {
    if (value[service] !== requiredCount) {
      errors.push(`${label}.${service} must equal ${requiredCount}`);
    }
  }

  for (const service of Object.keys(value)) {
    if (!(service in expectedMap)) {
      errors.push(`${label} contains unsupported service ${service}`);
    }
  }
}

function validateExactIntentMap(value, expectedMap, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const [service, expectedIntents] of Object.entries(expectedMap)) {
    validateExactStringArray(
      value[service],
      expectedIntents,
      `${label}.${service}`,
      errors,
    );
  }

  for (const service of Object.keys(value)) {
    if (!(service in expectedMap)) {
      errors.push(`${label} contains unsupported service ${service}`);
    }
  }
}

function validateTarget(check, env, target, errors) {
  const checkId = check.id ?? "<invalid-id>";
  if (!isRecord(target)) {
    errors.push(`${checkId}.${env}: target must be an object`);
    return;
  }

  const expectedHostMode = EXPECTED_HOST_MODES[check.service]?.[env];
  if (!ALLOWED_HOST_MODES.includes(target.hostMode)) {
    errors.push(
      `${checkId}.${env}: hostMode must be one of ${ALLOWED_HOST_MODES.join(", ")}`,
    );
  } else if (expectedHostMode && target.hostMode !== expectedHostMode) {
    errors.push(
      `${checkId}.${env}: hostMode must stay ${expectedHostMode} for ${check.service}`,
    );
  }

  if (!isNonEmptyString(target.path) || !target.path.startsWith("/")) {
    errors.push(`${checkId}.${env}: path must start with "/"`);
  } else if (target.path.includes("?") || target.path.includes("#")) {
    errors.push(`${checkId}.${env}: path must not include query or hash`);
  }

  if (target.hostMode === "canonical") {
    if (!isNonEmptyString(target.baseUrl)) {
      errors.push(`${checkId}.${env}: canonical targets require a baseUrl`);
      return;
    }

    try {
      const parsed = new URL(target.baseUrl);
      if (parsed.protocol !== "https:") {
        errors.push(`${checkId}.${env}: canonical baseUrl must use https`);
      }
      if (parsed.username || parsed.password) {
        errors.push(
          `${checkId}.${env}: canonical baseUrl must not embed credentials`,
        );
      }
      if (parsed.port) {
        errors.push(`${checkId}.${env}: canonical baseUrl must not pin a port`);
      }
      if (parsed.search || parsed.hash) {
        errors.push(
          `${checkId}.${env}: canonical baseUrl must not include query or hash`,
        );
      }
      if (parsed.pathname && parsed.pathname !== "/") {
        errors.push(
          `${checkId}.${env}: canonical baseUrl must not include a path segment`,
        );
      }
    } catch {
      errors.push(`${checkId}.${env}: canonical baseUrl must be a valid URL`);
    }
    return;
  }

  if (target.baseUrl !== null) {
    errors.push(`${checkId}.${env}: explicit targets must keep baseUrl null`);
  }
}

function validateProbe(check, errors) {
  const checkId = check.id ?? "<invalid-id>";
  if (!isRecord(check.probe)) {
    errors.push(`${checkId}: probe must be an object`);
    return;
  }

  if (!ALLOWED_PROBE_KINDS.includes(check.probe.kind)) {
    errors.push(
      `${checkId}: probe.kind must be one of ${ALLOWED_PROBE_KINDS.join(", ")}`,
    );
  }

  if (!isNonEmptyString(check.probe.intent)) {
    errors.push(`${checkId}: probe.intent must be a non-empty string`);
    return;
  }

  const allowedIntents = REQUIRED_PROBE_INTENTS[check.service] ?? [];
  if (!allowedIntents.includes(check.probe.intent)) {
    errors.push(
      `${checkId}: probe.intent must be one of ${allowedIntents.join(", ")} for ${check.service}`,
    );
  }
}

function validateMetadata(check, document, errors) {
  const checkId = check.id ?? "<invalid-id>";
  if (!isRecord(check.metadata)) {
    errors.push(`${checkId}: metadata must be an object`);
    return;
  }

  for (const field of REQUIRED_METADATA_FIELDS) {
    if (!isNonEmptyString(check.metadata[field])) {
      errors.push(`${checkId}: metadata.${field} must be a non-empty string`);
    }
  }

  if (
    isNonEmptyString(check.metadata.runbook) &&
    !document.sourceRunbooks.includes(check.metadata.runbook)
  ) {
    errors.push(
      `${checkId}: metadata.runbook must be listed in sourceRunbooks`,
    );
  }

  if (
    isNonEmptyString(check.metadata.dashboard) &&
    !DASHBOARD_SLUG_PATTERN.test(check.metadata.dashboard)
  ) {
    errors.push(`${checkId}: metadata.dashboard must be a slug`);
  }

  if (
    isNonEmptyString(check.metadata.smokeService) &&
    check.metadata.smokeService !== check.service
  ) {
    errors.push(`${checkId}: metadata.smokeService must match service`);
  }
}

function validateServiceCoverage(checks, errors) {
  const coverage = new Map(ALLOWED_SERVICES.map((service) => [service, 0]));
  const intents = new Map(
    ALLOWED_SERVICES.map((service) => [service, new Set()]),
  );

  for (const check of checks) {
    if (ALLOWED_SERVICES.includes(check.service)) {
      coverage.set(check.service, (coverage.get(check.service) ?? 0) + 1);
    }

    if (ALLOWED_SERVICES.includes(check.service) && isRecord(check.probe)) {
      if (isNonEmptyString(check.probe.intent)) {
        intents.get(check.service)?.add(check.probe.intent);
      }
    }
  }

  for (const [service, minimumCount] of Object.entries(
    REQUIRED_SERVICE_COVERAGE,
  )) {
    if ((coverage.get(service) ?? 0) < minimumCount) {
      errors.push(
        `service ${service} must define at least ${minimumCount} synthetic checks`,
      );
    }
  }

  for (const [service, requiredIntents] of Object.entries(
    REQUIRED_PROBE_INTENTS,
  )) {
    const declaredIntents = intents.get(service) ?? new Set();
    for (const intent of requiredIntents) {
      if (!declaredIntents.has(intent)) {
        errors.push(`service ${service} is missing probe intent ${intent}`);
      }
    }
  }
}

export function parseSyntheticMonitoringBaseline(source) {
  return JSON.parse(source);
}

export function loadSyntheticMonitoringBaseline(path) {
  return parseSyntheticMonitoringBaseline(readFileSync(path, "utf8"));
}

export function validateSyntheticMonitoringBaseline(document) {
  const errors = [];
  if (!isRecord(document)) {
    return ["document must be an object"];
  }

  if (!isPositiveInteger(document.version)) {
    errors.push("version must be a positive integer");
  }

  if (!isNonEmptyString(document.owner)) {
    errors.push("owner must be a non-empty string");
  }

  if (
    !Array.isArray(document.sourceRunbooks) ||
    document.sourceRunbooks.length === 0
  ) {
    errors.push("sourceRunbooks must be a non-empty array");
  } else {
    for (const runbook of REQUIRED_SOURCE_RUNBOOKS) {
      if (!document.sourceRunbooks.includes(runbook)) {
        errors.push(`sourceRunbooks must include ${runbook}`);
      }
    }
  }

  validateExactCoverageMap(
    document.requiredServiceCoverage,
    REQUIRED_SERVICE_COVERAGE,
    "requiredServiceCoverage",
    errors,
  );
  validateExactIntentMap(
    document.requiredProbeIntents,
    REQUIRED_PROBE_INTENTS,
    "requiredProbeIntents",
    errors,
  );
  validateExactStringArray(
    document.requiredMetadataFields,
    REQUIRED_METADATA_FIELDS,
    "requiredMetadataFields",
    errors,
  );

  if (!Array.isArray(document.checks) || document.checks.length === 0) {
    errors.push("checks must be a non-empty array");
    return errors;
  }

  const seenIds = new Set();
  for (const check of document.checks) {
    if (!isRecord(check)) {
      errors.push("each check must be an object");
      continue;
    }

    const checkId = isNonEmptyString(check.id) ? check.id : "<invalid-id>";
    if (!isNonEmptyString(check.id)) {
      errors.push("check.id must be a non-empty string");
    } else if (seenIds.has(check.id)) {
      errors.push(`duplicate check id: ${check.id}`);
    } else {
      seenIds.add(check.id);
    }

    if (!ALLOWED_SERVICES.includes(check.service)) {
      errors.push(
        `${checkId}: service must be one of ${ALLOWED_SERVICES.join(", ")}`,
      );
    }

    if (!ALLOWED_METHODS.includes(check.method)) {
      errors.push(
        `${checkId}: method must be one of ${ALLOWED_METHODS.join(", ")}`,
      );
    }

    if (!ALLOWED_SEVERITIES.includes(check.severity)) {
      errors.push(
        `${checkId}: severity must be one of ${ALLOWED_SEVERITIES.join(", ")}`,
      );
    }

    if (!isPositiveInteger(check.expectedStatus)) {
      errors.push(`${checkId}: expectedStatus must be a positive integer`);
    }
    if (!isPositiveInteger(check.timeoutSeconds)) {
      errors.push(`${checkId}: timeoutSeconds must be a positive integer`);
    }
    if (!isPositiveInteger(check.cadenceSeconds)) {
      errors.push(`${checkId}: cadenceSeconds must be a positive integer`);
    }
    if (
      isPositiveInteger(check.timeoutSeconds) &&
      isPositiveInteger(check.cadenceSeconds) &&
      check.timeoutSeconds > check.cadenceSeconds
    ) {
      errors.push(`${checkId}: timeoutSeconds must stay <= cadenceSeconds`);
    }
    if (!isNonEmptyString(check.description)) {
      errors.push(`${checkId}: description must be a non-empty string`);
    }

    validateProbe(check, errors);
    validateMetadata(check, document, errors);

    if (!isRecord(check.targets)) {
      errors.push(`${checkId}: targets must be an object`);
      continue;
    }

    for (const env of ALLOWED_ENVIRONMENTS) {
      if (!(env in check.targets)) {
        errors.push(`${checkId}: missing ${env} target`);
        continue;
      }
      validateTarget(check, env, check.targets[env], errors);
    }
  }

  validateServiceCoverage(document.checks, errors);
  return errors;
}
