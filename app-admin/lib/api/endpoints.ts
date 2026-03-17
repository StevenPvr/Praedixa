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
  orgOverview: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/overview`,
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
  decisionContractTemplates: `${V1}/decision-contract-templates`,
  decisionContractTemplatePreview: `${V1}/decision-contract-templates/instantiate-preview`,
  decisionCompatibilityEvaluate: `${V1}/decision-compatibility/evaluate`,

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
  orgDecisionContracts: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-contracts`,
  orgDecisionContractDetail: (
    orgId: string,
    contractId: string,
    contractVersion: number,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(String(contractVersion))}`,
  orgDecisionContractTransition: (
    orgId: string,
    contractId: string,
    contractVersion: number,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(String(contractVersion))}/transition`,
  orgDecisionContractFork: (
    orgId: string,
    contractId: string,
    contractVersion: number,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(String(contractVersion))}/fork`,
  orgDecisionContractRollbackCandidates: (
    orgId: string,
    contractId: string,
    contractVersion: number,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(String(contractVersion))}/rollback-candidates`,
  orgDecisionContractRollback: (
    orgId: string,
    contractId: string,
    contractVersion: number,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(String(contractVersion))}/rollback`,
  orgDecisionConfigResolved: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-config/resolved`,
  orgDecisionConfigVersions: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-config/versions`,
  orgDecisionConfigVersionCancel: (orgId: string, versionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-config/versions/${encodeURIComponent(versionId)}/cancel`,
  orgDecisionConfigVersionRollback: (orgId: string, versionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/decision-config/versions/${encodeURIComponent(versionId)}/rollback`,
  orgAlertScenarioRecompute: (orgId: string, alertId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/alerts/${encodeURIComponent(alertId)}/scenarios/recompute`,
  orgAlerts: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/alerts`,
  orgScenarios: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/scenarios`,
  orgApprovalsInbox: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/approval-inbox`,
  orgApprovalDecision: (orgId: string, approvalId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/approvals/${encodeURIComponent(approvalId)}/decision`,
  orgActionDispatchDetail: (orgId: string, actionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/action-dispatches/${encodeURIComponent(actionId)}`,
  orgActionDispatchDecision: (orgId: string, actionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/action-dispatches/${encodeURIComponent(actionId)}/decision`,
  orgActionDispatchFallback: (orgId: string, actionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/action-dispatches/${encodeURIComponent(actionId)}/fallback`,
  orgLedgerDetail: (orgId: string, ledgerId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/ledgers/${encodeURIComponent(ledgerId)}`,
  orgLedgerDecision: (orgId: string, ledgerId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/ledgers/${encodeURIComponent(ledgerId)}/decision`,
  orgMlMonitoringSummary: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/ml-monitoring/summary`,
  orgMlMonitoringDrift: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/ml-monitoring/drift`,
  orgProofPacks: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/proof-packs`,
  orgProofPackShareLink: (orgId: string, proofPackId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/proof-packs/${encodeURIComponent(proofPackId)}/share-link`,
  orgIngestionLog: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/ingestion-log`,
  orgMedallionQualityReport: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/medallion-quality-report`,
  orgDatasets: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/datasets`,
  orgDatasetData: (orgId: string, datasetId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/datasets/${encodeURIComponent(datasetId)}/data`,
  orgDatasetFeatures: (orgId: string, datasetId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/datasets/${encodeURIComponent(datasetId)}/features`,
  orgIntegrationConnections: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections`,
  orgIntegrationConnection: (orgId: string, connectionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}`,
  orgIntegrationConnectionTest: (orgId: string, connectionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}/test`,
  orgIntegrationSync: (orgId: string, connectionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}/sync`,
  orgIntegrationIngestCredentials: (orgId: string, connectionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}/ingest-credentials`,
  orgIntegrationIngestCredentialRevoke: (
    orgId: string,
    connectionId: string,
    credentialId: string,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}/ingest-credentials/${encodeURIComponent(credentialId)}/revoke`,
  orgIntegrationRawEvents: (orgId: string, connectionId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}/raw-events`,
  orgIntegrationRawEventPayload: (
    orgId: string,
    connectionId: string,
    eventId: string,
  ) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/connections/${encodeURIComponent(connectionId)}/raw-events/${encodeURIComponent(eventId)}/payload`,
  orgIntegrationSyncRuns: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/integrations/sync-runs`,

  // Conversations (admin)
  conversations: `${V1}/conversations`,
  orgConversations: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/conversations`,
  conversationMessages: (convId: string) =>
    `${V1}/conversations/${encodeURIComponent(convId)}/messages`,
  conversationStatus: (convId: string) =>
    `${V1}/conversations/${encodeURIComponent(convId)}`,
  conversationsUnread: `${V1}/conversations/unread-count`,

  // Contact requests
  contactRequests: `${V1}/contact-requests`,
  contactRequestStatus: (requestId: string) =>
    `${V1}/contact-requests/${encodeURIComponent(requestId)}/status`,
} as const;
