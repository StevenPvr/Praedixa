import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockMutate = vi.fn();
const mockUseCurrentUser = vi.fn();
const mockParams = { ledgerId: "66666666-6666-4666-8666-666666666666" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => mockParams,
  useSearchParams: () => new URLSearchParams("revision=2"),
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

import LedgerDetailPage from "../page";
import { ClientProvider } from "../../../../client-context";

const mockLedgerDetail = {
  kind: "LedgerDetail",
  ledgerId: mockParams.ledgerId,
  requestedRevision: 2,
  selectedRevision: 2,
  latestRevision: 3,
  contractId: "coverage.site.standard",
  contractVersion: 4,
  recommendationId: "77777777-7777-4777-8777-777777777777",
  scenarioRunId: "88888888-8888-4888-8888-888888888888",
  status: "closed",
  validationStatus: "validated",
  scope: {
    entityType: "site",
    selector: { mode: "all" },
    horizonId: "J+7",
  },
  approvals: [
    {
      approvalId: "99999999-9999-4999-8999-999999999999",
      outcome: "granted",
      actorRole: "ops_manager",
      decidedAt: "2026-03-13T09:00:00.000Z",
    },
  ],
  action: {
    actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    status: "acknowledged",
    destination: "workforce",
    targetReference: "shift-42",
    lastAttemptAt: "2026-03-13T09:15:00.000Z",
  },
  baseline: {
    recordedAt: "2026-03-13T08:00:00.000Z",
    values: { service_level_pct: 91.2 },
  },
  recommended: {
    recordedAt: "2026-03-13T08:05:00.000Z",
    values: { service_level_pct: 97.4 },
    actionSummary: "Adjust staffing",
  },
  actual: {
    recordedAt: "2026-03-13T12:00:00.000Z",
    values: { service_level_pct: 96.1 },
  },
  counterfactual: {
    method: "matched_sites",
    methodVersion: "1.0.0",
  },
  roi: {
    currency: "EUR",
    estimatedValue: 1200,
    realizedValue: 980,
    validationStatus: "validated",
    components: [],
  },
  roiComponents: [
    {
      key: "labor_delta",
      label: "Labor delta",
      kind: "benefit",
      value: 980,
      signedValue: 980,
      shareOfAbsoluteTotal: 1,
      validationStatus: "validated",
      isRequired: false,
    },
  ],
  deltaSummary: {
    metrics: [],
    numericMetricCount: 0,
    missingActualMetricKeys: [],
  },
  validationBanner: {
    status: "validated",
    code: "validated_for_export",
    message: "ROI is validated and export-ready.",
  },
  revisionLineage: [
    {
      ledgerId: mockParams.ledgerId,
      revision: 2,
      status: "closed",
      validationStatus: "validated",
      openedAt: "2026-03-13T08:00:00.000Z",
      closedAt: "2026-03-13T12:00:00.000Z",
      isSelected: true,
    },
  ],
  exportReadiness: [
    { format: "json", status: "ready", blockers: [] },
    { format: "csv", status: "blocked", blockers: ["missing_actual_snapshot"] },
  ],
  requiredComponentKeys: [],
  explanation: {
    topDrivers: ["coverage_gap_h"],
    bindingConstraints: ["labor_rest"],
  },
  openedAt: "2026-03-13T08:00:00.000Z",
  closedAt: "2026-03-13T12:00:00.000Z",
};

describe("LedgerDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.ledgerId = "66666666-6666-4666-8666-666666666666";
    mockUseCurrentUser.mockReturnValue({
      id: "finance-1",
      permissions: ["admin:org:write"],
    });
    mockUseApiGet.mockReturnValue({
      data: mockLedgerDetail,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseApiPost.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
    mockMutate.mockResolvedValue({
      ledgerId: mockParams.ledgerId,
      recommendationId: mockLedgerDetail.recommendationId,
      operation: "validate",
      occurredAt: "2026-03-13T13:00:00.000Z",
      selectedRevision: 2,
      latestRevision: 2,
      status: "closed",
      validationStatus: "validated",
      exportReadyFormats: ["json"],
    });
  });

  function renderPage() {
    return render(
      <ClientProvider {...mockContext}>
        <LedgerDetailPage />
      </ClientProvider>,
    );
  }

  it("renders ledger validation and export sections", () => {
    renderPage();

    expect(screen.getByText("Ledger detail")).toBeInTheDocument();
    expect(
      screen.getByText("ROI is validated and export-ready."),
    ).toBeInTheDocument();
    expect(screen.getByText("Baseline")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText("Labor delta")).toBeInTheDocument();
    expect(screen.getByText("Revision 2 · selectionnee")).toBeInTheDocument();
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/ledgers/66666666-6666-4666-8666-666666666666?revision=2",
    );
    expect(mockUseApiPost).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/ledgers/66666666-6666-4666-8666-666666666666/decision",
    );
  });

  it("shows an error fallback when the ledger detail cannot be loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Ledger unavailable",
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Ledger unavailable")).toBeInTheDocument();
  });

  it("shows a selection error when no ledger id is present", () => {
    mockParams.ledgerId = "";
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByText("Aucun ledger n'a ete selectionne."),
    ).toBeInTheDocument();
    expect(mockUseApiGet).toHaveBeenCalledWith(null);
  });

  it("shows degraded and empty read-only states when revisions and exports are partial", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        ...mockLedgerDetail,
        selectedRevision: 3,
        roi: { ...mockLedgerDetail.roi, realizedValue: null },
        roiComponents: [],
        exportReadiness: [],
        revisionLineage: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Lecture partielle")).toBeInTheDocument();
    expect(screen.getByText("Aucun composant ROI")).toBeInTheDocument();
    expect(screen.getByText("Aucun export disponible")).toBeInTheDocument();
    expect(screen.getByText("Lineage indisponible")).toBeInTheDocument();
  });

  it("submits a finance validation decision and refreshes the detail", async () => {
    const refetch = vi.fn();
    mockUseApiGet.mockReturnValue({
      data: mockLedgerDetail,
      loading: false,
      error: null,
      refetch,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Valider finance" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        operation: "validate",
        reasonCode: "finance_validation_update",
        comment: undefined,
        validationStatus: "validated",
      });
    });
    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
    expect(
      screen.getByText("Operation appliquee: validate -> closed"),
    ).toBeInTheDocument();
  });

  it("shows a warning when the admin lacks write permission", () => {
    mockUseCurrentUser.mockReturnValue({
      id: "viewer-1",
      permissions: ["admin:org:read"],
    });

    renderPage();

    expect(screen.getByText("Action restreinte")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Valider finance" }),
    ).not.toBeInTheDocument();
  });
});
