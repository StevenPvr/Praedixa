import { demo } from "./mock-data.js";
import { paginated, success } from "./response.js";
import { route } from "./router.js";
import type { RouteContext, RouteDefinition } from "./types.js";

function pageQuery(ctx: RouteContext): { page: number; pageSize: number } {
  const rawPage = Number(ctx.query.get("page") ?? "1");
  const rawPageSize = Number(ctx.query.get("pageSize") ?? "20");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.floor(rawPageSize)
      : 20;

  return { page, pageSize };
}

function paginateFrom<T>(items: T[], ctx: RouteContext) {
  const { page, pageSize } = pageQuery(ctx);
  const start = (page - 1) * pageSize;
  const sliced = items.slice(start, start + pageSize);
  return paginated(sliced, page, pageSize, items.length, ctx.requestId);
}

function getConversationMessages(conversationId: string): Record<string, unknown>[] {
  const messages = demo.messages as Record<string, unknown>[];
  return messages.filter(
    (entry) => String(entry.conversationId ?? "") === conversationId,
  );
}

function standardMeta(view: string): Record<string, unknown> {
  return {
    view,
    generatedAt: new Date().toISOString(),
  };
}

const adminOnly = { allowedRoles: ["super_admin"] as const };

export const routes: RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/health",
    (ctx) =>
      success(
        {
          status: "healthy",
          version: "2.0.0",
          environment: process.env.NODE_ENV ?? "development",
          timestamp: new Date().toISOString(),
          checks: [{ name: "api-ts", status: "pass" }],
        },
        ctx.requestId,
      ),
    { authRequired: false },
  ),

  // Webapp surface
  route("GET", "/api/v1/live/dashboard/summary", (ctx) =>
    success(
      {
        kpis: {
          coverageRiskCount: 1,
          adoptionRate: 62.5,
          projectedSavingsEur: 9200,
        },
        metadata: standardMeta("dashboard_summary"),
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/forecasts", (ctx) =>
    success(
      {
        items: demo.forecasts,
        status: ctx.query.get("status") ?? "all",
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/forecasts/latest/daily", (ctx) =>
    success(
      [
        {
          date: new Date().toISOString().slice(0, 10),
          dimension: ctx.query.get("dimension") ?? "human",
          siteId: ctx.query.get("site_id") ?? "site-lyon",
          expectedHours: 304,
        },
      ],
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/ml-monitoring/summary", (ctx) =>
    success(
      {
        modelVersion: "demo-v2",
        driftDetected: false,
        qualityScore: 0.94,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/ml-monitoring/drift", (ctx) =>
    success(
      {
        limitDays: Number(ctx.query.get("limit_days") ?? "30"),
        series: [],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/onboarding/status", (ctx) =>
    success(
      {
        completed: false,
        currentStep: 2,
        totalSteps: 5,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/schema", (ctx) =>
    success(
      {
        columns: [
          { name: "date", type: "date" },
          { name: "site_id", type: "text" },
          { name: "load_hours", type: "number" },
          { name: "capacity_hours", type: "number" },
        ],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/rows", (ctx) =>
    success(
      {
        rows: [
          {
            date: "2026-02-24",
            site_id: "site-lyon",
            load_hours: 320,
            capacity_hours: 298,
          },
        ],
        total: 1,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/coverage", (ctx) =>
    success(
      {
        completenessPct: 98.7,
        missingRows: 0,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/gold/provenance", (ctx) =>
    success(
      {
        strictDataPolicyOk: true,
        forecastMockColumns: [],
        nonForecastMockColumns: [],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/proof", (ctx) =>
    paginateFrom(
      [
        {
          id: "pf-live-001",
          month: "2026-02",
          generatedAt: new Date().toISOString(),
        },
      ],
      ctx,
    ),
  ),
  route("GET", "/api/v1/organizations/me", (ctx) =>
    success(demo.organization, ctx.requestId),
  ),
  route("GET", "/api/v1/departments", (ctx) =>
    success(demo.departments, ctx.requestId),
  ),
  route("GET", "/api/v1/sites", (ctx) => success(demo.sites, ctx.requestId)),

  route("GET", "/api/v1/forecasts", (ctx) =>
    paginateFrom(demo.forecasts as Record<string, unknown>[], ctx),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/summary", (ctx) =>
    success(
      {
        forecastId: ctx.params.forecastId,
        status: "completed",
        drivers: ["turnover", "seasonality", "absences"],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/forecasts/:forecastId/daily", (ctx) =>
    success(
      [
        {
          forecastId: ctx.params.forecastId,
          date: new Date().toISOString().slice(0, 10),
          expectedGapHours: 6,
          riskProbability: 0.42,
        },
      ],
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/forecasts", (ctx) =>
    success(
      {
        id: "fr-new",
        status: "queued",
        input: ctx.body,
      },
      ctx.requestId,
      "Forecast request accepted",
      201,
    ),
  ),
  route("POST", "/api/v1/forecasts/what-if", (ctx) =>
    success(
      {
        scenario: "what-if",
        input: ctx.body,
        deltaCostEur: -480,
        deltaServicePct: 1.2,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/decisions", (ctx) =>
    paginateFrom(demo.decisions as Record<string, unknown>[], ctx),
  ),
  route("GET", "/api/v1/decisions/:decisionId", (ctx) =>
    success(
      {
        id: ctx.params.decisionId,
        title: "Increase PM staffing",
        status: "suggested",
      },
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/decisions/:decisionId/review", (ctx) =>
    success(
      {
        id: ctx.params.decisionId,
        status: "reviewed",
        review: ctx.body,
      },
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/decisions/:decisionId/outcome", (ctx) =>
    success(
      {
        id: ctx.params.decisionId,
        outcome: ctx.body,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/arbitrage/:alertId/options", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        options: [
          { id: "opt-hs", label: "HS", costEur: 920, servicePct: 100 },
          {
            id: "opt-interim",
            label: "Interim",
            costEur: 1140,
            servicePct: 100,
          },
        ],
      },
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/arbitrage/:alertId/validate", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        decision: ctx.body,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/alerts", (ctx) => success(demo.alerts, ctx.requestId)),
  route("PATCH", "/api/v1/alerts/:alertId/dismiss", (ctx) =>
    success(
      {
        id: ctx.params.alertId,
        status: "dismissed",
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/analytics/costs", (ctx) =>
    success(
      {
        period: {
          startDate: ctx.query.get("startDate"),
          endDate: ctx.query.get("endDate"),
        },
        totals: {
          overtimeEur: 12400,
          interimEur: 19800,
          avoidedEur: 5400,
        },
      },
      ctx.requestId,
    ),
  ),

  route("POST", "/api/v1/exports/:resource", (ctx) =>
    success(
      {
        exportId: `exp-${ctx.params.resource}`,
        status: "pending",
        requested: ctx.body,
      },
      ctx.requestId,
      "Export queued",
      202,
    ),
  ),

  route("GET", "/api/v1/datasets", (ctx) =>
    paginateFrom(demo.datasets as Record<string, unknown>[], ctx),
  ),
  route("GET", "/api/v1/datasets/:datasetId", (ctx) =>
    success(
      {
        id: ctx.params.datasetId,
        name: "canonical_records",
        status: "ready",
        tableName: "canonical_records",
        temporalIndex: "date",
        groupBy: ["site_id"],
        rowCount: 120,
        lastIngestionAt: new Date().toISOString(),
        columns: [
          { name: "site_id", dataType: "text" },
          { name: "date", dataType: "date" },
          { name: "charge_hours", dataType: "number" },
        ],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/data", (ctx) =>
    success(
      {
        columns: ["site_id", "date", "charge_hours"],
        rows: [
          { site_id: "site-lyon", date: "2026-02-24", charge_hours: 312 },
          { site_id: "site-orleans", date: "2026-02-24", charge_hours: 248 },
        ],
        maskedColumns: [],
        total: 2,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/columns", (ctx) =>
    success(
      [
        {
          id: "col-site",
          datasetId: ctx.params.datasetId,
          name: "site_id",
          dataType: "text",
        },
      ],
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/datasets/:datasetId/ingestion-log", (ctx) =>
    success(
      {
        entries: [
          {
            id: "ing-001",
            datasetId: ctx.params.datasetId,
            status: "success",
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/live/canonical", (ctx) =>
    paginateFrom(
      [
        {
          id: "can-001",
          siteId: "site-lyon",
          date: "2026-02-24",
          shift: "PM",
          loadHours: 320,
          capacityHours: 298,
        },
      ],
      ctx,
    ),
  ),
  route("GET", "/api/v1/live/canonical/quality", (ctx) =>
    success(
      {
        completenessPct: 98.7,
        timelinessPct: 99.1,
        incidents: 1,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/live/coverage-alerts", (ctx) =>
    success(demo.alerts, ctx.requestId),
  ),
  route("GET", "/api/v1/live/coverage-alerts/queue", (ctx) =>
    success(
      [
        {
          alertId: "alt-001",
          priority: "high",
          riskProbability: 0.72,
        },
      ],
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/acknowledge", (ctx) =>
    success(
      { id: ctx.params.alertId, status: "acknowledged" },
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/coverage-alerts/:alertId/resolve", (ctx) =>
    success({ id: ctx.params.alertId, status: "resolved" }, ctx.requestId),
  ),

  route("GET", "/api/v1/live/scenarios/alert/:alertId", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        options: [
          { id: "opt-001", costEur: 900, servicePct: 100 },
          { id: "opt-002", costEur: 650, servicePct: 96 },
        ],
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/live/decision-workspace/:alertId", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        recommendedOptionId: "opt-001",
      },
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/scenarios/generate/:alertId", (ctx) =>
    success(
      {
        alertId: ctx.params.alertId,
        generated: true,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/operational-decisions", (ctx) =>
    paginateFrom(
      [
        {
          id: "opd-001",
          coverageAlertId: "alt-001",
          decisionDate: "2026-02-24",
          isOverride: false,
        },
      ],
      ctx,
    ),
  ),
  route("GET", "/api/v1/operational-decisions/override-stats", (ctx) =>
    success(
      {
        totalDecisions: 14,
        overriddenDecisions: 3,
        overrideRatePct: 21.43,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/cost-parameters", (ctx) =>
    success(
      [
        {
          id: "cp-001",
          siteId: "site-lyon",
          internalHourlyCostEur: 19.9,
          overtimeMultiplier: 1.25,
          interimHourlyCostEur: 30,
        },
      ],
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/cost-parameters/effective", (ctx) =>
    success(
      {
        siteId: "site-lyon",
        internalHourlyCostEur: 19.9,
        overtimeMultiplier: 1.25,
        interimHourlyCostEur: 30,
      },
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/cost-parameters/history", (ctx) =>
    success(
      [
        {
          id: "cp-001",
          version: 1,
          effectiveAt: "2026-01-01",
        },
      ],
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/proof", (ctx) =>
    success(
      [
        {
          id: "pf-001",
          month: "2026-02",
          generatedAt: new Date().toISOString(),
        },
      ],
      ctx.requestId,
    ),
  ),
  route("GET", "/api/v1/proof/summary", (ctx) =>
    success(
      {
        gainNetVsBauEur: 15200,
        adoptionRatePct: 58,
      },
      ctx.requestId,
    ),
  ),
  route("POST", "/api/v1/proof/generate", (ctx) =>
    success(
      {
        id: "pf-new",
        status: "generated",
        input: ctx.body,
      },
      ctx.requestId,
      "Proof pack generated",
      201,
    ),
  ),
  route("GET", "/api/v1/proof/pdf", (ctx) =>
    success(
      {
        url: `/proof/${ctx.query.get("proof_pack_id") ?? "latest"}.pdf`,
      },
      ctx.requestId,
    ),
  ),

  route("GET", "/api/v1/users/me/preferences", (ctx) =>
    success(
      {
        timezone: "Europe/Paris",
        locale: "fr",
        defaultSiteId: "site-lyon",
      },
      ctx.requestId,
    ),
  ),
  route("PATCH", "/api/v1/users/me/preferences", (ctx) =>
    success(
      {
        timezone: "Europe/Paris",
        locale: "fr",
        defaultSiteId: "site-lyon",
        patch: ctx.body,
      },
      ctx.requestId,
    ),
  ),

  route("POST", "/api/v1/product-events/batch", (ctx) => {
    const payload = (ctx.body as { events?: unknown[] } | null) ?? null;
    const accepted = Array.isArray(payload?.events) ? payload.events.length : 0;
    return success({ accepted }, ctx.requestId, "Events accepted", 202);
  }),
  route("POST", "/api/v1/mock-forecast", (ctx) =>
    success(
      {
        queued: true,
      },
      ctx.requestId,
      "Mock forecast queued",
      202,
    ),
  ),
  route(
    "POST",
    "/api/v1/public/contact-requests",
    (ctx) =>
      success(
        {
          id: "contact-001",
          status: "received",
          payload: ctx.body,
        },
        ctx.requestId,
        "Contact request received",
        201,
      ),
    { authRequired: false },
  ),

  route("GET", "/api/v1/conversations", (ctx) =>
    success(demo.conversations, ctx.requestId),
  ),
  route("POST", "/api/v1/conversations", (ctx) =>
    success(
      {
        id: "conv-new",
        organizationId: ctx.user?.organizationId ?? demo.organization.id,
        subject:
          typeof (ctx.body as { subject?: unknown } | null)?.subject === "string"
            ? ((ctx.body as { subject: string }).subject as string)
            : "New conversation",
        status: "open",
        initiatedBy: "client",
        lastMessageAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ctx.requestId,
      "Conversation created",
      201,
    ),
  ),
  route("GET", "/api/v1/conversations/:convId/messages", (ctx) =>
    success(getConversationMessages(ctx.params.convId ?? ""), ctx.requestId),
  ),
  route("POST", "/api/v1/conversations/:convId/messages", (ctx) =>
    success(
      {
        id: "msg-new",
        conversationId: ctx.params.convId,
        senderUserId: ctx.user?.userId ?? "unknown",
        senderRole: ctx.user?.role ?? "viewer",
        content:
          typeof (ctx.body as { content?: unknown } | null)?.content === "string"
            ? ((ctx.body as { content: string }).content as string)
            : "",
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ctx.requestId,
      "Message sent",
      201,
    ),
  ),
  route("GET", "/api/v1/conversations/unread-count", (ctx) =>
    success({ unreadCount: 1 }, ctx.requestId),
  ),

  // Admin surface (super_admin)
  route(
    "GET",
    "/api/v1/admin",
    (ctx) =>
      success(
        {
          status: "ok",
          modules: ["organizations", "users", "monitoring", "audit"],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/platform",
    (ctx) =>
      success(
        {
          activeOrganizations: 1,
          avgLatencyMs: 42,
          metadata: standardMeta("platform"),
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/trends",
    (ctx) =>
      success(
        {
          points: [
            { date: "2026-02-22", value: 49 },
            { date: "2026-02-23", value: 51 },
          ],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/errors",
    (ctx) => success({ count24h: 0, incidents: [] }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/organizations/:orgId",
    (ctx) =>
      success(
        {
          orgId: ctx.params.orgId,
          health: "ok",
          adoptionRatePct: 62,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/organizations/:orgId/mirror",
    (ctx) =>
      success(
        {
          orgId: ctx.params.orgId,
          mirror: true,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations",
    (ctx) =>
      paginateFrom(
        [
          {
            id: demo.organization.id,
            name: demo.organization.name,
            status: demo.organization.status,
          },
        ],
        ctx,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations",
    (ctx) =>
      success(
        {
          id: "org-new",
          created: true,
          input: ctx.body,
        },
        ctx.requestId,
        "Organization created",
        201,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId",
    (ctx) => success({ ...demo.organization, id: ctx.params.orgId }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/hierarchy",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          sites: demo.sites,
          departments: demo.departments,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/suspend",
    (ctx) =>
      success({ id: ctx.params.orgId, status: "suspended" }, ctx.requestId),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/reactivate",
    (ctx) => success({ id: ctx.params.orgId, status: "active" }, ctx.requestId),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/churn",
    (ctx) => success({ id: ctx.params.orgId, status: "churned" }, ctx.requestId),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/users",
    (ctx) =>
      success(
        [
          {
            id: "user-001",
            organizationId: ctx.params.orgId,
            email: "ops.client@praedixa.com",
            role: "org_admin",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/users/:userId",
    (ctx) =>
      success(
        {
          id: ctx.params.userId,
          organizationId: ctx.params.orgId,
          role: "org_admin",
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/organizations/:orgId/users/:userId/role",
    (ctx) =>
      success(
        {
          id: ctx.params.userId,
          organizationId: ctx.params.orgId,
          patch: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/invite",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          invited: true,
          input: ctx.body,
        },
        ctx.requestId,
        "User invited",
        201,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/:userId/deactivate",
    (ctx) => success({ id: ctx.params.userId, status: "deactivated" }, ctx.requestId),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/users/:userId/reactivate",
    (ctx) => success({ id: ctx.params.userId, status: "active" }, ctx.requestId),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          plan: "pro",
          mrrEur: 7500,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/billing/organizations/:orgId/change-plan",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          changed: true,
          input: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/billing/organizations/:orgId/history",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            from: "core",
            to: "pro",
            at: "2026-01-01",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/audit-log",
    (ctx) =>
      paginateFrom(
        [
          {
            id: "aud-001",
            action: "decision.review",
            actor: "super_admin",
            createdAt: new Date().toISOString(),
          },
        ],
        ctx,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/onboarding",
    (ctx) =>
      paginateFrom(
        [
          {
            id: "onb-001",
            organizationId: demo.organization.id,
            currentStep: 2,
            totalSteps: 5,
          },
        ],
        ctx,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/onboarding",
    (ctx) =>
      success(
        {
          id: "onb-new",
          created: true,
          input: ctx.body,
        },
        ctx.requestId,
        "Onboarding started",
        201,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/onboarding/:onboardingId/step/:step",
    (ctx) =>
      success(
        {
          id: ctx.params.onboardingId,
          currentStep: Number(ctx.params.step),
        },
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/monitoring/alerts/summary",
    (ctx) => success({ totalAlerts: 12 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/alerts/by-org",
    (ctx) =>
      success(
        [{ organizationId: demo.organization.id, alerts: 12 }],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/scenarios/summary",
    (ctx) => success({ scenariosGenerated: 31 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/summary",
    (ctx) => success({ totalDecisions: 48 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/overrides",
    (ctx) => success({ overrideRatePct: 21.4 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/decisions/adoption",
    (ctx) => success({ adoptionRatePct: 62.5 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/proof-packs/summary",
    (ctx) => success({ generatedMonthly: 1 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/canonical-coverage",
    (ctx) => success({ coveragePct: 98.7 }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/cost-params/missing",
    (ctx) => success({ missingCount: 0, items: [] }, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/monitoring/roi/by-org",
    (ctx) =>
      success(
        [
          {
            organizationId: demo.organization.id,
            gainNetVsBauEur: 15200,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/canonical",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            siteId: "site-lyon",
            date: "2026-02-24",
            shift: "PM",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/canonical/quality",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          completenessPct: 98.7,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/cost-params",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            siteId: "site-lyon",
            internalHourlyCostEur: 19.9,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/alerts",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "alt-001",
            severity: "high",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/scenarios",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "scn-001",
            recommended: true,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/proof-packs",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "pf-001",
            month: "2026-02",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ingestion-log",
    (ctx) =>
      success(
        [
          {
            organizationId: ctx.params.orgId,
            id: "ing-001",
            status: "success",
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/medallion-quality-report",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          qualityScore: 98.2,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/data",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          datasetId: ctx.params.datasetId,
          rows: [{ id: "row-001" }],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/datasets/:datasetId/features",
    (ctx) =>
      success(
        {
          organizationId: ctx.params.orgId,
          datasetId: ctx.params.datasetId,
          features: ["lag_7", "rolling_mean_14"],
        },
        ctx.requestId,
      ),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/conversations",
    (ctx) => success(demo.conversations, ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/conversations",
    (ctx) =>
      success(
        [
          {
            ...((demo.conversations as Record<string, unknown>[])[0] ?? {}),
            organizationId: ctx.params.orgId,
          },
        ],
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) => success(getConversationMessages(ctx.params.convId ?? ""), ctx.requestId),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/:convId",
    (ctx) =>
      success(
        {
          id: ctx.params.convId,
          status: "open",
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "POST",
    "/api/v1/admin/conversations/:convId/messages",
    (ctx) =>
      success(
        {
          id: "msg-admin-new",
          conversationId: ctx.params.convId,
          content:
            typeof (ctx.body as { content?: unknown } | null)?.content === "string"
              ? ((ctx.body as { content: string }).content as string)
              : "",
        },
        ctx.requestId,
        "Message sent",
        201,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/conversations/:convId",
    (ctx) =>
      success(
        {
          id: ctx.params.convId,
          patch: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
  route(
    "GET",
    "/api/v1/admin/conversations/unread-count",
    (ctx) => success({ unreadCount: 1 }, ctx.requestId),
    adminOnly,
  ),

  route(
    "GET",
    "/api/v1/admin/contact-requests",
    (ctx) =>
      paginateFrom(
        [
          {
            id: "cr-001",
            companyName: "Acme Logistics",
            status: "new",
          },
        ],
        ctx,
      ),
    adminOnly,
  ),
  route(
    "PATCH",
    "/api/v1/admin/contact-requests/:requestId/status",
    (ctx) =>
      success(
        {
          id: ctx.params.requestId,
          patch: ctx.body,
        },
        ctx.requestId,
      ),
    adminOnly,
  ),
];
