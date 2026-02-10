/**
 * Admin API endpoint paths.
 *
 * CRITICAL: Always use encodeURIComponent() for path params
 * when calling these endpoints from hooks.
 */

const V1 = "/api/v1/admin";

export const ADMIN_ENDPOINTS = {
  // Monitoring
  platformKPIs: `${V1}/monitoring/platform`,
  trends: `${V1}/monitoring/trends`,
  errors: `${V1}/monitoring/errors`,
  orgMetrics: (orgId: string) =>
    `${V1}/monitoring/organizations/${encodeURIComponent(orgId)}`,
  orgMirror: (orgId: string) =>
    `${V1}/monitoring/organizations/${encodeURIComponent(orgId)}/mirror`,

  // Organizations
  organizations: `${V1}/organizations`,
  organization: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}`,
  orgHierarchy: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/hierarchy`,
  orgSuspend: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/suspend`,
  orgReactivate: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/reactivate`,
  orgChurn: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/churn`,

  // Users
  orgUsers: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users`,
  orgUser: (orgId: string, userId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}`,
  orgUserRole: (orgId: string, userId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/role`,
  orgUserInvite: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users/invite`,
  orgUserDeactivate: (orgId: string, userId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/deactivate`,
  orgUserReactivate: (orgId: string, userId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/reactivate`,

  // Billing
  orgBilling: (orgId: string) =>
    `${V1}/billing/organizations/${encodeURIComponent(orgId)}`,
  orgChangePlan: (orgId: string) =>
    `${V1}/billing/organizations/${encodeURIComponent(orgId)}/change-plan`,
  orgPlanHistory: (orgId: string) =>
    `${V1}/billing/organizations/${encodeURIComponent(orgId)}/history`,

  // Audit
  auditLog: `${V1}/audit-log`,

  // Onboarding
  onboardingList: `${V1}/onboarding`,
  onboardingStart: `${V1}/onboarding`,
  onboardingStep: (onboardingId: string, step: number) =>
    `${V1}/onboarding/${encodeURIComponent(onboardingId)}/step/${encodeURIComponent(String(step))}`,
  // Monitoring (operational)
  monitoringAlertsSummary: `${V1}/monitoring/alerts/summary`,
  monitoringAlertsByOrg: `${V1}/monitoring/alerts/by-org`,
  monitoringScenariosSummary: `${V1}/monitoring/scenarios/summary`,
  monitoringDecisionsSummary: `${V1}/monitoring/decisions/summary`,
  monitoringDecisionsOverrides: `${V1}/monitoring/decisions/overrides`,
  monitoringDecisionsAdoption: `${V1}/monitoring/decisions/adoption`,
  monitoringProofPacksSummary: `${V1}/monitoring/proof-packs/summary`,
  monitoringCanonicalCoverage: `${V1}/monitoring/canonical-coverage`,
  monitoringCostParamsMissing: `${V1}/monitoring/cost-params/missing`,
  monitoringRoiByOrg: `${V1}/monitoring/roi/by-org`,

  // Per-org operational
  orgCanonical: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/canonical`,
  orgCanonicalQuality: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/canonical/quality`,
  orgCostParams: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/cost-params`,
  orgAlerts: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/alerts`,
  orgScenarios: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/scenarios`,
  orgProofPacks: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/proof-packs`,
  orgIngestionLog: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/ingestion-log`,
  orgDatasetData: (orgId: string, datasetId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/datasets/${encodeURIComponent(datasetId)}/data`,
  orgDatasetFeatures: (orgId: string, datasetId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/datasets/${encodeURIComponent(datasetId)}/features`,

  // Conversations (admin)
  conversations: `${V1}/conversations`,
  orgConversations: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/conversations`,
  conversationMessages: (convId: string) =>
    `${V1}/conversations/${encodeURIComponent(convId)}/messages`,
  conversationStatus: (convId: string) =>
    `${V1}/conversations/${encodeURIComponent(convId)}`,
  conversationsUnread: `${V1}/conversations/unread-count`,
} as const;
