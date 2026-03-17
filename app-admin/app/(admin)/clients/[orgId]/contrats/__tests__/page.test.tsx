import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockUseCurrentUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve("token")),
  clearAuthSession: vi.fn(),
  useCurrentUser: () => mockUseCurrentUser(),
}));

const mockContext = {
  orgId: "org-1",
  orgName: "Test Org",
  selectedSiteId: null as string | null,
  setSelectedSiteId: vi.fn(),
  hierarchy: [],
};

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
    StatCard: ({ label, value }: { label: string; value: string }) => (
      <div data-testid="stat-card">
        {label}: {value}
      </div>
    ),
  };
});

import ContractStudioPage from "../page";
import { ClientProvider } from "../../client-context";

const mockTemplates = {
  total: 1,
  items: [
    {
      templateId: "coverage.site.standard",
      templateVersion: 2,
      pack: "coverage",
      status: "active",
      name: "Coverage site standard",
      description: "Site-level coverage contract",
      graphRef: { graphId: "coverage-site", graphVersion: 2 },
      eligibilitySummary: {
        entityTypes: ["site"],
        selectorModes: ["all"],
        horizonIds: ["J+7"],
        requiredSignals: ["coverage_gap_h"],
        requiredActions: ["schedule.adjust"],
        requiredPolicyHooks: ["coverage.minimum_service"],
      },
      tags: ["coverage"],
    },
  ],
};

const mockList = {
  total: 2,
  items: [
    {
      contractId: "coverage-core",
      contractVersion: 2,
      name: "Coverage core v2",
      pack: "coverage",
      status: "published",
      updatedAt: "2026-03-16T10:00:00.000Z",
      badge: { label: "Published", tone: "success" },
      validation: {
        contractId: "coverage-core",
        contractVersion: 2,
        status: "passed",
        checkedAt: "2026-03-16T09:30:00.000Z",
        issueCount: 0,
        blocking: false,
        issues: [],
        badge: { label: "Validated", tone: "success" },
      },
      publishReadiness: {
        contractId: "coverage-core",
        contractVersion: 2,
        isReady: true,
        blockingCount: 0,
        checklist: [],
        badge: { label: "Ready to publish", tone: "success" },
      },
      lineage: {
        currentVersion: 2,
        previousVersion: 1,
        rollbackFromVersion: 1,
        label: "v2 <- v1",
      },
    },
    {
      contractId: "coverage-core",
      contractVersion: 1,
      name: "Coverage core v1",
      pack: "coverage",
      status: "archived",
      updatedAt: "2026-03-15T10:00:00.000Z",
      badge: { label: "Archived", tone: "neutral" },
      validation: {
        contractId: "coverage-core",
        contractVersion: 1,
        status: "passed",
        checkedAt: "2026-03-15T09:30:00.000Z",
        issueCount: 0,
        blocking: false,
        issues: [],
        badge: { label: "Validated", tone: "success" },
      },
      publishReadiness: {
        contractId: "coverage-core",
        contractVersion: 1,
        isReady: false,
        blockingCount: 1,
        checklist: [],
        badge: { label: "Not ready", tone: "warning" },
      },
      lineage: {
        currentVersion: 1,
        previousVersion: null,
        rollbackFromVersion: null,
        label: "v1",
      },
    },
  ],
};

const mockDetail = {
  contract: {
    kind: "DecisionContract",
    schemaVersion: "1.0.0",
    contractId: "coverage-core",
    contractVersion: 2,
    name: "Coverage core v2",
    pack: "coverage",
    status: "published",
    graphRef: { graphId: "coverage-site", graphVersion: 2 },
    scope: {
      entityType: "site",
      selector: { mode: "all" },
      horizonId: "J+7",
    },
    inputs: [
      {
        key: "coverage_gap_h",
        entity: "Site",
        attribute: "coverage_gap_h",
        required: true,
      },
    ],
    objective: { metricKey: "service_level_pct", direction: "maximize" },
    decisionVariables: [
      {
        key: "overtime_hours",
        label: "Overtime",
        domain: { kind: "number", min: 0 },
      },
    ],
    hardConstraints: [{ key: "labor_rest", expression: "rest_hours >= 11" }],
    softConstraints: [],
    approvals: [
      { ruleId: "ops_review", approverRole: "ops_manager", minStepOrder: 1 },
    ],
    actions: [{ actionType: "schedule.adjust", destinationType: "wfm.shift" }],
    policyHooks: ["coverage.minimum_service"],
    roiFormula: {
      currency: "EUR",
      estimatedExpression: "recommended - baseline",
      components: [
        {
          key: "labor_delta",
          label: "Labor delta",
          kind: "benefit",
          expression: "recommended - baseline",
        },
      ],
    },
    explanationTemplate: {
      summaryTemplate: "{{top_driver}}",
      topDriverKeys: ["coverage_gap_h"],
      bindingConstraintKeys: ["labor_rest"],
    },
    validation: {
      status: "passed",
      checkedAt: "2026-03-16T09:30:00.000Z",
      issues: [],
    },
    audit: {
      createdBy: "designer-1",
      createdAt: "2026-03-16T09:00:00.000Z",
      updatedBy: "publisher-1",
      updatedAt: "2026-03-16T10:00:00.000Z",
      changeReason: "go_live_v2",
      previousVersion: 1,
      rollbackFromVersion: 1,
      approvedBy: "reviewer-1",
      approvedAt: "2026-03-16T09:45:00.000Z",
      publishedBy: "publisher-1",
      publishedAt: "2026-03-16T10:00:00.000Z",
      archivedBy: null,
      archivedAt: null,
    },
  },
  badge: { label: "Published", tone: "success" },
  validation: {
    contractId: "coverage-core",
    contractVersion: 2,
    status: "passed",
    checkedAt: "2026-03-16T09:30:00.000Z",
    issueCount: 0,
    blocking: false,
    issues: [],
    badge: { label: "Validated", tone: "success" },
  },
  publishReadiness: {
    contractId: "coverage-core",
    contractVersion: 2,
    isReady: true,
    blockingCount: 0,
    checklist: [
      {
        key: "inputs",
        label: "At least one input",
        complete: true,
        blocking: true,
      },
    ],
    badge: { label: "Ready to publish", tone: "success" },
  },
  lineage: {
    currentVersion: 2,
    previousVersion: 1,
    rollbackFromVersion: 1,
    label: "v2 <- v1",
  },
  changeSummary: {
    hasChanges: true,
    graphRefChanged: false,
    scopeChanged: false,
    objectiveChanged: false,
    roiFormulaChanged: false,
    explanationTemplateChanged: false,
    inputs: { added: 0, removed: 0, changed: 0, unchanged: 1 },
    decisionVariables: { added: 1, removed: 0, changed: 0, unchanged: 1 },
    hardConstraints: { added: 0, removed: 0, changed: 0, unchanged: 1 },
    softConstraints: { added: 0, removed: 0, changed: 0, unchanged: 0 },
    approvals: { added: 0, removed: 0, changed: 0, unchanged: 1 },
    actions: { added: 1, removed: 0, changed: 0, unchanged: 1 },
    policyHooks: { added: 1, removed: 0, changed: 0, unchanged: 0 },
    tags: { added: 1, removed: 0, changed: 0, unchanged: 0 },
  },
  history: [
    {
      auditId: "audit-1",
      action: "decision_contract_transition_publish",
      actorUserId: "publisher-1",
      targetContractVersion: 2,
      reason: "go_live_v2",
      createdAt: "2026-03-16T10:00:00.000Z",
      metadata: {},
    },
  ],
};

const mockRollbackCandidates = {
  contractId: "coverage-core",
  contractVersion: 2,
  candidates: [
    {
      contractId: "coverage-core",
      contractVersion: 1,
      status: "archived",
      updatedAt: "2026-03-15T10:00:00.000Z",
      changeReason: "go_live_v1",
      badge: { label: "Archived", tone: "neutral" },
      validation: {
        contractId: "coverage-core",
        contractVersion: 1,
        status: "passed",
        checkedAt: "2026-03-15T09:30:00.000Z",
        issueCount: 0,
        blocking: false,
        issues: [],
        badge: { label: "Validated", tone: "success" },
      },
      lineage: {
        currentVersion: 1,
        previousVersion: null,
        rollbackFromVersion: null,
        label: "v1",
      },
    },
  ],
};

describe("ContractStudioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      id: "admin-1",
      permissions: ["admin:org:write", "admin:billing:read"],
    });
    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/admin/organizations/org-1/decision-contracts") {
        return {
          data: mockList,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url === "/api/v1/admin/decision-contract-templates") {
        return {
          data: mockTemplates,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (
        url ===
        "/api/v1/admin/organizations/org-1/decision-contracts/coverage-core/versions/2?compare_to_version=1"
      ) {
        return {
          data: mockDetail,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (
        url ===
        "/api/v1/admin/organizations/org-1/decision-contracts/coverage-core/versions/2/rollback-candidates"
      ) {
        return {
          data: mockRollbackCandidates,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  function renderPage() {
    return render(
      <ClientProvider {...mockContext}>
        <ContractStudioPage />
      </ClientProvider>,
    );
  }

  it("renders the contract studio list, detail, and audit panels", async () => {
    renderPage();

    expect(screen.getByText("Contract Studio")).toBeInTheDocument();
    expect(screen.getByText("Coverage core v2")).toBeInTheDocument();
    expect(screen.getByText("Audit recent")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("decision_contract_transition_publish"),
      ).toBeInTheDocument();
    });

    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/decision-contracts",
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/admin/decision-contract-templates",
    );
  });

  it("shows the create panel when no contracts exist yet", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/admin/organizations/org-1/decision-contracts") {
        return {
          data: { total: 0, items: [] },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (url === "/api/v1/admin/decision-contract-templates") {
        return {
          data: mockTemplates,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    renderPage();

    expect(screen.getByText("Initialiser un contrat")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Creer le draft" }),
    ).toBeInTheDocument();
  });

  it("shows an error fallback when the list fails to load", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/admin/organizations/org-1/decision-contracts") {
        return {
          data: null,
          loading: false,
          error: "Studio unavailable",
          refetch: vi.fn(),
        };
      }
      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    renderPage();

    expect(screen.getByText("Studio unavailable")).toBeInTheDocument();
  });
});
