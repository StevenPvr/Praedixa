import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockDecisionMutate = vi.fn();
const mockFallbackMutate = vi.fn();
const mockUseCurrentUser = vi.fn();
const mockParams = { actionId: "33333333-3333-4333-8333-333333333333" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => mockParams,
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

import ActionDispatchDetailPage from "../page";
import { ClientProvider } from "../../../../client-context";

const mockDispatchDetail = {
  kind: "ActionDispatchDetail",
  actionId: mockParams.actionId,
  contractId: "coverage.site.standard",
  contractVersion: 4,
  recommendationId: "44444444-4444-4444-8444-444444444444",
  approvalId: "55555555-5555-4555-8555-555555555555",
  status: "failed",
  dispatchMode: "live",
  createdAt: "2026-03-13T09:00:00.000Z",
  updatedAt: "2026-03-13T10:00:00.000Z",
  destination: {
    system: "workforce",
    targetResourceType: "wfm.shift",
    sandbox: false,
    capabilities: {
      supportsDryRun: true,
      supportsSandbox: true,
      supportsAcknowledgement: true,
      supportsCancellation: false,
      supportsRetry: true,
      supportsIdempotencyKeys: true,
      supportsHumanFallback: true,
    },
  },
  permissions: {
    allowedByContract: true,
    permissionKeys: ["shift.write"],
  },
  idempotency: {
    key: "dedupe-1",
    status: "unique",
    relatedDispatchCount: 1,
    distinctActionCount: 1,
    relatedActionIds: [mockParams.actionId],
  },
  attempts: [
    {
      attemptNumber: 1,
      status: "failed",
      dispatchedAt: "2026-03-13T09:10:00.000Z",
      errorCode: "timeout",
      errorMessage: "Timeout",
      isLatest: true,
    },
  ],
  retryPolicy: {
    maxAttempts: 3,
    retryableErrorCodes: ["timeout"],
    backoffStrategy: "exponential",
    initialDelayMs: 3000,
    executionAttemptCount: 1,
    remainingAttempts: 2,
    eligibility: {
      eligible: true,
      blockedBy: [],
      remainingAttempts: 2,
      nextAttemptNumber: 2,
      retryableErrorCode: "timeout",
    },
  },
  fallback: {
    supported: true,
    status: "prepared",
    humanRequired: true,
    nextStep: "execute",
  },
  terminalReason: {
    terminal: false,
    code: "human_fallback_prepared",
    message: "Human fallback has been prepared and awaits execution.",
  },
  timeline: [
    {
      sequence: 0,
      occurredAt: "2026-03-13T09:00:00.000Z",
      kind: "created",
      label: "Dispatch created",
      status: "pending",
      terminal: false,
    },
    {
      sequence: 1,
      occurredAt: "2026-03-13T09:10:00.000Z",
      kind: "attempt",
      label: "Attempt 1 failed",
      status: "failed",
      attemptNumber: 1,
      errorCode: "timeout",
      errorMessage: "Timeout",
      terminal: false,
    },
  ],
  payloadRefs: [
    {
      source: "payloadPreview",
      available: true,
      fingerprint: "fingerprint-1",
      fieldCount: 4,
      fieldPaths: ["shift.id"],
    },
  ],
};

describe("ActionDispatchDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.actionId = "33333333-3333-4333-8333-333333333333";
    mockUseCurrentUser.mockReturnValue({
      id: "admin-1",
      permissions: ["admin:org:write", "shift.write"],
    });
    mockUseApiGet.mockReturnValue({
      data: mockDispatchDetail,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseApiPost.mockImplementation((url: string) => ({
      mutate: url.includes("/fallback")
        ? mockFallbackMutate
        : mockDecisionMutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    }));
    mockDecisionMutate.mockResolvedValue({
      actionId: mockParams.actionId,
      recommendationId: mockDispatchDetail.recommendationId,
      occurredAt: "2026-03-13T10:05:00.000Z",
      actionStatus: "retried",
      latestAttemptStatus: "retried",
      ledgerStatus: "open",
      fallbackStatus: "prepared",
      retryEligible: false,
    });
    mockFallbackMutate.mockResolvedValue({
      actionId: mockParams.actionId,
      recommendationId: mockDispatchDetail.recommendationId,
      occurredAt: "2026-03-13T10:06:00.000Z",
      actionStatus: "failed",
      fallbackStatus: "executed",
      fallbackPreparedAt: "2026-03-13T10:00:00.000Z",
      fallbackExecutedAt: "2026-03-13T10:06:00.000Z",
      ledgerStatus: "open",
      retryEligible: false,
    });
  });

  function renderPage() {
    return render(
      <ClientProvider {...mockContext}>
        <ActionDispatchDetailPage />
      </ClientProvider>,
    );
  }

  it("renders dispatch summary and timeline", () => {
    renderPage();

    expect(screen.getByText("Detail d'action")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Human fallback has been prepared and awaits execution.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Attempt 1 failed")).toBeInTheDocument();
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/action-dispatches/33333333-3333-4333-8333-333333333333",
    );
    expect(mockUseApiPost).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/action-dispatches/33333333-3333-4333-8333-333333333333/decision",
    );
    expect(mockUseApiPost).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/action-dispatches/33333333-3333-4333-8333-333333333333/fallback",
    );
  });

  it("shows an error fallback when the detail cannot be loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Dispatch unavailable",
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Dispatch unavailable")).toBeInTheDocument();
  });

  it("shows a selection error when no action id is present", () => {
    mockParams.actionId = "";
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByText("Aucun dispatch n'a ete selectionne."),
    ).toBeInTheDocument();
    expect(mockUseApiGet).toHaveBeenCalledWith(null);
  });

  it("shows degraded read-only states when timeline and payload refs are missing", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        ...mockDispatchDetail,
        timeline: [],
        payloadRefs: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Lecture partielle")).toBeInTheDocument();
    expect(screen.getByText("Timeline indisponible")).toBeInTheDocument();
    expect(screen.getByText("Payload indisponible")).toBeInTheDocument();
  });

  it("submits a dispatch lifecycle decision and refreshes the detail", async () => {
    const refetch = vi.fn();
    mockUseApiGet.mockReturnValue({
      data: mockDispatchDetail,
      loading: false,
      error: null,
      refetch,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Relancer" }));

    await waitFor(() => {
      expect(mockDecisionMutate).toHaveBeenCalledWith({
        outcome: "retried",
        reasonCode: "dispatch_retried",
        comment: undefined,
        errorCode: undefined,
      });
    });
    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
    expect(screen.getByText("Statut applique: retried")).toBeInTheDocument();
  });

  it("submits a human fallback execution and refreshes the detail", async () => {
    const refetch = vi.fn();
    mockUseApiGet.mockReturnValue({
      data: mockDispatchDetail,
      loading: false,
      error: null,
      refetch,
    });

    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Marquer fallback execute" }),
    );

    await waitFor(() => {
      expect(mockFallbackMutate).toHaveBeenCalledWith({
        operation: "execute",
        reasonCode: "human_fallback_executed",
        comment: undefined,
      });
    });
    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
    expect(screen.getByText("Fallback applique: executed")).toBeInTheDocument();
  });

  it("shows a warning when the admin lacks write permission", () => {
    mockUseCurrentUser.mockReturnValue({
      id: "viewer-1",
      permissions: ["admin:org:read"],
    });

    renderPage();

    expect(screen.getByText("Action restreinte")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Relancer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marquer fallback execute" }),
    ).not.toBeInTheDocument();
  });

  it("shows a write-back warning when destination permissions are missing", () => {
    mockUseCurrentUser.mockReturnValue({
      id: "admin-1",
      permissions: ["admin:org:write"],
    });

    renderPage();

    expect(
      screen.getAllByText("Permissions de write-back manquantes").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Relancer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marquer fallback execute" }),
    ).not.toBeInTheDocument();
  });
});
