const localIntegrationsWorkspaceEnabled =
  process.env.NODE_ENV !== "development" ||
  process.env["NEXT_PUBLIC_ADMIN_INTEGRATIONS_WORKSPACE"] === "1";

export const ADMIN_WORKSPACE_FEATURE_GATES = {
  forecastingWorkspace: false,
  datasetsWorkspace: false,
  ingestionLogWorkspace: true,
  messagesWorkspace: false,
  integrationsWorkspace: localIntegrationsWorkspaceEnabled,
} as const;

export function featureUnavailableMessage(label: string): string {
  return `${label} n'est pas encore industrialise dans le runtime admin local. La page reste fail-close tant que la route persistante n'est pas branchee.`;
}

export function integrationsUnavailableMessage(): string {
  return "Les integrations client restent fail-close en developpement local tant que le runtime connecteurs et son token ne sont pas explicitement actives.";
}
