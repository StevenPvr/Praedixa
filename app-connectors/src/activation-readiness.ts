import type {
  ConnectorActivationReadiness,
  ConnectorActivationReadinessIssue,
  ConnectorCatalogItem,
  ConnectorConnection,
} from "./types.js";

type EvaluateConnectionActivationReadinessInput = {
  catalogItem: ConnectorCatalogItem;
  connection: ConnectorConnection;
  missingRequiredConfigFields: string[];
  missingCredentialFields: string[];
  hasStoredCredentials: boolean;
  hasOauthEndpoints: boolean;
  hasLiveProbeStrategy: boolean;
  hasProbeTarget: boolean;
  hasValidEndpointConfiguration: boolean;
};

function blockingIssue(
  code: ConnectorActivationReadinessIssue["code"],
  message: string,
  field: string | null = null,
): ConnectorActivationReadinessIssue {
  return { code, field, message };
}

function buildRecommendedNextStep(
  connection: ConnectorConnection,
  blockingIssues: readonly ConnectorActivationReadinessIssue[],
): string {
  const firstIssue = blockingIssues[0];
  if (firstIssue == null) {
    if (connection.lastTestedAt == null) {
      return "Run the connection test to promote the connection to active.";
    }
    if (connection.status !== "active") {
      return "Promote the connection to active before scheduling syncs.";
    }
    return "Connection is ready for activation and sync dispatch.";
  }

  switch (firstIssue.code) {
    case "disabled_connection":
      return "Re-enable the connection before activation.";
    case "missing_required_config":
      return `Populate the missing connector config field "${firstIssue.field ?? "unknown"}".`;
    case "missing_stored_credentials":
      return "Store the connector credentials before activation.";
    case "missing_oauth_endpoints":
      return "Configure OAuth authorization/token endpoints or rely on catalog defaults for this vendor.";
    case "missing_live_probe_strategy":
      return "Do not promote this connection yet: implement a live probe strategy for this auth mode first.";
    case "authorization_required":
      return "Complete the OAuth authorization flow before testing the connection.";
    case "authorization_pending":
      return "Finish the pending OAuth authorization before testing the connection.";
    case "missing_probe_target":
      return "Provide a baseUrl or config.testEndpoint so the runtime can run a live readiness probe.";
    case "connection_not_tested":
      return "Run the connection test to validate credentials and mark the connection active.";
    case "connection_not_active":
      return "Activate the connection before dispatching syncs.";
    case "invalid_endpoint_configuration":
      return "Fix the connector endpoint configuration so every outbound URL matches the runtime policy.";
  }
}

export function evaluateConnectionActivationReadiness(
  input: EvaluateConnectionActivationReadinessInput,
): ConnectorActivationReadiness {
  const blockingIssues: ConnectorActivationReadinessIssue[] = [];
  const warnings: ConnectorActivationReadinessIssue[] = [];

  if (!input.hasValidEndpointConfiguration) {
    blockingIssues.push(
      blockingIssue(
        "invalid_endpoint_configuration",
        "Connector endpoint configuration no longer matches the runtime outbound policy.",
      ),
    );
  }

  if (input.connection.status === "disabled") {
    blockingIssues.push(
      blockingIssue(
        "disabled_connection",
        "Connection is disabled and cannot be activated.",
      ),
    );
  }

  for (const field of input.missingRequiredConfigFields) {
    blockingIssues.push(
      blockingIssue(
        "missing_required_config",
        `Missing required connector config field "${field}".`,
        field,
      ),
    );
  }

  if (!input.hasStoredCredentials) {
    blockingIssues.push(
      blockingIssue(
        "missing_stored_credentials",
        "Stored connector credentials are required before activation.",
      ),
    );
  }

  if (input.connection.authMode === "oauth2" && !input.hasOauthEndpoints) {
    blockingIssues.push(
      blockingIssue(
        "missing_oauth_endpoints",
        "OAuth connectors require authorizationEndpoint and tokenEndpoint before activation.",
      ),
    );
  }

  if (!input.hasLiveProbeStrategy) {
    blockingIssues.push(
      blockingIssue(
        "missing_live_probe_strategy",
        `Auth mode "${input.connection.authMode}" does not have a live runtime probe strategy yet.`,
      ),
    );
  }

  const authorizationReady =
    input.connection.authMode !== "oauth2" ||
    input.connection.authorizationState === "authorized";

  if (input.connection.authMode === "oauth2") {
    if (input.connection.authorizationState === "not_started") {
      blockingIssues.push(
        blockingIssue(
          "authorization_required",
          "OAuth authorization has not started yet.",
        ),
      );
    }
    if (input.connection.authorizationState === "awaiting_authorization") {
      blockingIssues.push(
        blockingIssue(
          "authorization_pending",
          "OAuth authorization is still pending.",
        ),
      );
    }
  }

  if (!input.hasProbeTarget) {
    blockingIssues.push(
      blockingIssue(
        "missing_probe_target",
        "A baseUrl or config.testEndpoint is required for a live readiness probe.",
      ),
    );
  }

  const connectionTestBlockingCodes: ReadonlySet<
    ConnectorActivationReadinessIssue["code"]
  > = new Set([
    "disabled_connection",
    "missing_required_config",
    "missing_stored_credentials",
    "missing_oauth_endpoints",
    "missing_live_probe_strategy",
    "authorization_required",
    "authorization_pending",
    "missing_probe_target",
    "invalid_endpoint_configuration",
  ]);

  const isReadyForAuthorizationStart =
    input.connection.authMode === "oauth2" &&
    !blockingIssues.some((issue) =>
      new Set([
        "disabled_connection",
        "missing_required_config",
        "missing_stored_credentials",
        "missing_oauth_endpoints",
        "invalid_endpoint_configuration",
      ]).has(issue.code),
    ) &&
    input.connection.authorizationState === "not_started";

  const isReadyForConnectionTest =
    !blockingIssues.some((issue) =>
      connectionTestBlockingCodes.has(issue.code),
    ) && authorizationReady;

  if (input.connection.lastTestedAt == null) {
    warnings.push(
      blockingIssue(
        "connection_not_tested",
        "Connection has not been tested yet.",
      ),
    );
  }

  if (input.connection.status !== "active") {
    warnings.push(
      blockingIssue("connection_not_active", "Connection is not active yet."),
    );
  }

  const isReadyForSync =
    isReadyForConnectionTest &&
    input.connection.lastTestedAt != null &&
    input.connection.status === "active";

  return {
    connectionId: input.connection.id,
    vendor: input.connection.vendor,
    authMode: input.connection.authMode,
    runtimeEnvironment: input.connection.runtimeEnvironment,
    missingRequiredConfigFields: [...input.missingRequiredConfigFields],
    missingCredentialFields: [...input.missingCredentialFields],
    blockingIssues,
    warnings,
    isReadyForAuthorizationStart,
    isReadyForConnectionTest,
    isReadyForSync,
    recommendedNextStep: buildRecommendedNextStep(
      input.connection,
      blockingIssues,
    ),
  };
}
