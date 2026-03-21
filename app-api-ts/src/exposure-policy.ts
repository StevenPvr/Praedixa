export type ApiExposureClassification = "P0" | "P1" | "P2" | "P3";
export type ApiExposureAudience =
  | "anonymous"
  | "authenticated"
  | "admin"
  | "internal_automation";
export type ApiExposureAccess = "public" | "bearer" | "restricted";

type ApiMatcher =
  | { type: "exact"; value: string }
  | { type: "group"; value: string };

export interface ApiExposurePolicy {
  id: string;
  matcher: ApiMatcher;
  classification: ApiExposureClassification;
  audience: ApiExposureAudience;
  access: ApiExposureAccess;
  requestBudget: string;
  ownerBusiness: string;
  ownerTechnical: string;
  loggingRequired: true;
}

const API_EXPOSURE_POLICIES: readonly ApiExposurePolicy[] = [
  {
    id: "api-health",
    matcher: { type: "exact", value: "/api/v1/health" },
    classification: "P3",
    audience: "internal_automation",
    access: "public",
    requestBudget: "uptime-probe",
    ownerBusiness: "Platform",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-public-contact",
    matcher: { type: "exact", value: "/api/v1/public/contact-requests" },
    classification: "P1",
    audience: "internal_automation",
    access: "restricted",
    requestBudget: "low-volume-ingest",
    ownerBusiness: "Marketing",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-admin",
    matcher: { type: "group", value: "/api/v1/admin" },
    classification: "P0",
    audience: "admin",
    access: "restricted",
    requestBudget: "operator-control-plane",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-live",
    matcher: { type: "group", value: "/api/v1/live" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "interactive-read",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-exports",
    matcher: { type: "group", value: "/api/v1/exports" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "explicit-export",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-proof",
    matcher: { type: "group", value: "/api/v1/proof" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "roi-proof-access",
    ownerBusiness: "Finance",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-coverage-alerts",
    matcher: { type: "group", value: "/api/v1/coverage-alerts" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "decision-signal",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-operational-decisions",
    matcher: { type: "group", value: "/api/v1/operational-decisions" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "decision-write",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-scenarios",
    matcher: { type: "group", value: "/api/v1/scenarios" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "scenario-generation",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-decisions",
    matcher: { type: "group", value: "/api/v1/decisions" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "decision-review",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-arbitrage",
    matcher: { type: "group", value: "/api/v1/arbitrage" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "option-comparison",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-alerts",
    matcher: { type: "group", value: "/api/v1/alerts" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "alert-read",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-analytics",
    matcher: { type: "group", value: "/api/v1/analytics" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "analytics-read",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-conversations",
    matcher: { type: "group", value: "/api/v1/conversations" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "messaging",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-support-thread",
    matcher: { type: "group", value: "/api/v1/support-thread" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "messaging",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-forecasts",
    matcher: { type: "group", value: "/api/v1/forecasts" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "forecast-access",
    ownerBusiness: "Operations",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-datasets",
    matcher: { type: "group", value: "/api/v1/datasets" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "dataset-read",
    ownerBusiness: "Data",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-organizations",
    matcher: { type: "group", value: "/api/v1/organizations" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "org-context",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-departments",
    matcher: { type: "group", value: "/api/v1/departments" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "reference-read",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-sites",
    matcher: { type: "group", value: "/api/v1/sites" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "reference-read",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-cost-parameters",
    matcher: { type: "group", value: "/api/v1/cost-parameters" },
    classification: "P0",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "cost-governance",
    ownerBusiness: "Finance",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-product-events",
    matcher: { type: "group", value: "/api/v1/product-events" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "telemetry-write",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
  {
    id: "api-user-preferences",
    matcher: { type: "group", value: "/api/v1/users" },
    classification: "P1",
    audience: "authenticated",
    access: "bearer",
    requestBudget: "user-settings",
    ownerBusiness: "Product",
    ownerTechnical: "Backend",
    loggingRequired: true,
  },
] as const;

function matchesPolicy(policy: ApiExposurePolicy, template: string): boolean {
  if (policy.matcher.type === "exact") {
    return template === policy.matcher.value;
  }

  return (
    template === policy.matcher.value ||
    template.startsWith(`${policy.matcher.value}/`)
  );
}

export function listApiExposurePolicies(): readonly ApiExposurePolicy[] {
  return API_EXPOSURE_POLICIES;
}

export function resolveApiExposurePolicy(
  routeTemplate: string,
): ApiExposurePolicy | null {
  return (
    API_EXPOSURE_POLICIES.find((policy) =>
      matchesPolicy(policy, routeTemplate),
    ) ?? null
  );
}
