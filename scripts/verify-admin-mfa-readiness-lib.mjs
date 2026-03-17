import { readFileSync } from "node:fs";

export function loadRealmExport(pathname) {
  return JSON.parse(readFileSync(pathname, "utf8"));
}

export function loadBrowserFlowPolicy(pathname) {
  return JSON.parse(readFileSync(pathname, "utf8"));
}

export function findRealmRole(realmExport, roleName) {
  return (
    realmExport?.roles?.realm?.find((entry) => entry?.name === roleName) ?? null
  );
}

export function findClient(realmExport, clientId) {
  return (
    realmExport?.clients?.find((entry) => entry?.clientId === clientId) ?? null
  );
}

function clientHasProtocolMapper(client, mapperName, protocolMapper) {
  return (
    client?.protocolMappers?.some(
      (entry) =>
        entry?.name === mapperName &&
        entry?.protocolMapper === protocolMapper &&
        entry?.config?.["access.token.claim"] === "true",
    ) ?? false
  );
}

export function findRequiredAction(realmExport, alias) {
  return (
    realmExport?.requiredActions?.find((entry) => entry?.alias === alias) ??
    null
  );
}

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readFlowExecutions(flowSnapshot) {
  if (Array.isArray(flowSnapshot)) {
    return flowSnapshot;
  }
  if (Array.isArray(flowSnapshot?.executions)) {
    return flowSnapshot.executions;
  }
  return null;
}

function readExecutionDisplayName(execution) {
  return (
    execution?.displayName ??
    execution?.display_name ??
    execution?.alias ??
    execution?.flowAlias ??
    null
  );
}

function readExecutionLevel(execution) {
  const rawLevel = execution?.level ?? execution?.depth ?? null;
  return Number.isInteger(rawLevel) ? rawLevel : null;
}

function readExecutionAuthenticationFlow(execution) {
  return (
    execution?.authenticationFlow ?? execution?.authentication_flow ?? null
  );
}

function matchesExecution(execution, expected) {
  if (!isObject(execution)) {
    return false;
  }

  if (readExecutionDisplayName(execution) !== expected.display_name) {
    return false;
  }

  return readExecutionLevel(execution) === expected.level;
}

export function validateAdminMfaPolicy(policy) {
  const errors = [];

  if (policy?.schema_version !== "1") {
    errors.push("admin MFA browser flow policy schema_version must be 1");
  }

  if (typeof policy?.realm_browser_flow_alias !== "string") {
    errors.push(
      "admin MFA browser flow policy must declare realm_browser_flow_alias",
    );
  }

  if (
    !Array.isArray(policy?.required_actions) ||
    policy.required_actions.length < 1
  ) {
    errors.push("admin MFA browser flow policy must declare required_actions");
  }

  const otpPolicy = policy?.otp_policy;
  if (!isObject(otpPolicy)) {
    errors.push("admin MFA browser flow policy must declare otp_policy");
  } else {
    if (typeof otpPolicy.type !== "string" || otpPolicy.type.length === 0) {
      errors.push("admin MFA browser flow policy otp_policy must declare type");
    }
    if (
      typeof otpPolicy.algorithm !== "string" ||
      otpPolicy.algorithm.length === 0
    ) {
      errors.push(
        "admin MFA browser flow policy otp_policy must declare algorithm",
      );
    }
    if (!Number.isInteger(otpPolicy.digits) || otpPolicy.digits < 1) {
      errors.push(
        "admin MFA browser flow policy otp_policy must declare digits",
      );
    }
    if (!Number.isInteger(otpPolicy.period) || otpPolicy.period < 1) {
      errors.push(
        "admin MFA browser flow policy otp_policy must declare period",
      );
    }
    if (
      !Number.isInteger(otpPolicy.look_ahead_window) ||
      otpPolicy.look_ahead_window < 0
    ) {
      errors.push(
        "admin MFA browser flow policy otp_policy must declare look_ahead_window",
      );
    }
    if (typeof otpPolicy.code_reusable !== "boolean") {
      errors.push(
        "admin MFA browser flow policy otp_policy must declare code_reusable",
      );
    }
  }

  const requiredExecutionChecks = policy?.required_execution_checks;
  if (
    !Array.isArray(requiredExecutionChecks) ||
    requiredExecutionChecks.length < 1
  ) {
    errors.push(
      "admin MFA browser flow policy must declare required_execution_checks",
    );
  } else {
    for (const check of requiredExecutionChecks) {
      if (!isObject(check)) {
        errors.push("required execution checks must be objects");
        continue;
      }
      if (
        typeof check.display_name !== "string" ||
        check.display_name.length === 0
      ) {
        errors.push("required execution checks must declare display_name");
      }
      if (
        typeof check.requirement !== "string" ||
        check.requirement.length === 0
      ) {
        errors.push("required execution checks must declare requirement");
      }
      if (!Number.isInteger(check.level) || check.level < 0) {
        errors.push(
          "required execution checks must declare a non-negative level",
        );
      }
      if (
        check.authentication_flow != null &&
        typeof check.authentication_flow !== "boolean"
      ) {
        errors.push(
          "required execution checks must use boolean authentication_flow when present",
        );
      }
    }
  }

  const optionalExecutionChecks = policy?.optional_execution_checks;
  if (
    optionalExecutionChecks != null &&
    !Array.isArray(optionalExecutionChecks)
  ) {
    errors.push("optional_execution_checks must be an array when present");
  }

  return errors;
}

export function validateAdminMfaReadiness(realmExport, policy) {
  const errors = [];
  const otpPolicy = policy?.otp_policy ?? {};

  errors.push(...validateAdminMfaPolicy(policy));

  if (realmExport?.otpPolicyType !== otpPolicy.type) {
    errors.push(
      `otpPolicyType must be set to ${otpPolicy.type ?? "<missing>"}`,
    );
  }
  if (realmExport?.otpPolicyAlgorithm !== otpPolicy.algorithm) {
    errors.push(
      `otpPolicyAlgorithm must be set to ${otpPolicy.algorithm ?? "<missing>"}`,
    );
  }
  if (realmExport?.otpPolicyDigits !== otpPolicy.digits) {
    errors.push(
      `otpPolicyDigits must be set to ${otpPolicy.digits ?? "<missing>"}`,
    );
  }
  if (realmExport?.otpPolicyPeriod !== otpPolicy.period) {
    errors.push(
      `otpPolicyPeriod must be set to ${otpPolicy.period ?? "<missing>"} seconds`,
    );
  }
  if (realmExport?.otpPolicyLookAheadWindow !== otpPolicy.look_ahead_window) {
    errors.push(
      `otpPolicyLookAheadWindow must be set to ${otpPolicy.look_ahead_window ?? "<missing>"}`,
    );
  }
  if (realmExport?.otpPolicyCodeReusable !== otpPolicy.code_reusable) {
    errors.push(
      `otpPolicyCodeReusable must be ${otpPolicy.code_reusable ?? "<missing>"}`,
    );
  }

  if (realmExport?.browserFlow !== policy?.realm_browser_flow_alias) {
    errors.push(
      `browserFlow must stay bound to ${policy?.realm_browser_flow_alias ?? "<missing-policy-alias>"}`,
    );
  }

  for (const alias of policy?.required_actions ?? []) {
    const action = findRequiredAction(realmExport, alias);
    if (action == null) {
      errors.push(`requiredActions must declare ${alias}`);
      continue;
    }
    if (action.providerId !== alias) {
      errors.push(`${alias} required action must use providerId ${alias}`);
    }
    if (action.enabled !== true) {
      errors.push(`${alias} required action must be enabled`);
    }
  }

  const adminClient = findClient(realmExport, "praedixa-admin");
  if (adminClient == null || adminClient.enabled !== true) {
    errors.push("praedixa-admin client must exist and stay enabled");
  } else if (!clientHasProtocolMapper(adminClient, "claim-amr", "oidc-amr-mapper")) {
    errors.push(
      "praedixa-admin client must expose claim-amr via oidc-amr-mapper on the access token",
    );
  }

  if (findRealmRole(realmExport, "super_admin") == null) {
    errors.push("super_admin realm role must exist");
  }

  return errors;
}

export function validateLiveBrowserFlowExecutions(
  flowSnapshot,
  policy,
  realmExport,
) {
  const errors = [];
  errors.push(...validateAdminMfaPolicy(policy));

  const executions = readFlowExecutions(flowSnapshot);
  if (executions == null) {
    errors.push(
      "live browser flow snapshot must be an array or { executions: [...] }",
    );
    return errors;
  }

  if (
    realmExport?.browserFlow != null &&
    realmExport.browserFlow !== policy?.realm_browser_flow_alias
  ) {
    errors.push(
      `realm browserFlow ${realmExport.browserFlow} does not match policy alias ${policy?.realm_browser_flow_alias ?? "<missing>"}`,
    );
  }

  for (const expected of policy?.required_execution_checks ?? []) {
    const execution = executions.find((entry) =>
      matchesExecution(entry, expected),
    );
    if (execution == null) {
      errors.push(
        `browser flow is missing ${expected.display_name} at level ${expected.level}`,
      );
      continue;
    }

    if (execution.requirement !== expected.requirement) {
      errors.push(
        `${expected.display_name} must stay ${expected.requirement} (current: ${execution.requirement ?? "<missing>"})`,
      );
    }

    if (
      expected.authentication_flow != null &&
      readExecutionAuthenticationFlow(execution) !==
        expected.authentication_flow
    ) {
      errors.push(
        `${expected.display_name} authentication_flow must be ${expected.authentication_flow}`,
      );
    }
  }

  for (const expected of policy?.optional_execution_checks ?? []) {
    const execution = executions.find((entry) =>
      matchesExecution(entry, expected),
    );
    if (execution == null) {
      continue;
    }
    if (
      expected.requirement != null &&
      execution.requirement != null &&
      execution.requirement !== expected.requirement
    ) {
      errors.push(
        `${expected.display_name} must stay ${expected.requirement} when present (current: ${execution.requirement})`,
      );
    }
  }

  return errors;
}
