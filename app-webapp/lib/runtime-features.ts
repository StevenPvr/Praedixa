export const WEBAPP_RUNTIME_FEATURES = {
  messagingWorkspace: true,
  operationalDecisionHistory: false,
  userPreferencesPersistence: true,
} as const;

export function unavailableFeatureMessage(label: string): string {
  return `${label} n'est pas encore industrialise dans le runtime webapp. La surface reste fail-close tant que la route persistante n'est pas branchee.`;
}
