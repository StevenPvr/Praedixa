import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockMutate = vi.fn();
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

import ApprovalsPage from "../page";
import { ClientProvider } from "../../../client-context";

const mockApprovalInbox = {
  request: {
    filter: {
      approverRoles: [],
      statuses: ["requested"],
      priorities: ["critical"],
      contractIds: [],
      contractVersion: null,
      search: null,
      requiresJustification: null,
      unreadOnly: false,
      urgentOnly: false,
      overdueOnly: false,
    },
    sort: { field: "priority", direction: "desc" },
    groupBy: "status",
    includeResolved: false,
    now: "2026-03-13T10:00:00.000Z",
  },
  summary: {
    total: 1,
    unread: 1,
    urgent: 1,
    overdue: 0,
    requiresJustification: 1,
    statuses: {
      requested: 1,
      granted: 0,
      rejected: 0,
      expired: 0,
      canceled: 0,
    },
    priorities: { low: 0, medium: 0, high: 0, critical: 1 },
    roles: [{ approverRole: "ops_manager", total: 1, unread: 1, urgent: 1 }],
  },
  groups: [
    {
      groupBy: "status",
      groupKey: "requested",
      groupLabel: "Requested",
      total: 1,
      unread: 1,
      urgent: 1,
      items: [],
    },
  ],
  items: [
    {
      approvalId: "11111111-1111-4111-8111-111111111111",
      contractId: "coverage.site.standard",
      contractVersion: 4,
      recommendationId: "22222222-2222-4222-8222-222222222222",
      status: "requested",
      priority: "critical",
      approverRole: "ops_manager",
      stepOrder: 1,
      requestedAt: "2026-03-13T09:00:00.000Z",
      deadlineAt: "2026-03-13T12:00:00.000Z",
      ageHours: 1,
      isOverdue: false,
      isUrgent: true,
      isUnread: true,
      requiresJustification: true,
      requestedBy: {
        actorType: "user",
        actorId: "user-1",
        actorRole: "planner",
        label: "user:planner",
      },
      scope: {
        entityType: "site",
        selectorMode: "all",
        horizonId: "J+7",
        targetCount: null,
        label: "site · all targets · J+7",
      },
      policy: {
        estimatedCostEur: 2400,
        riskScore: 0.92,
        actionTypes: ["schedule.adjust"],
        destinationTypes: ["wfm.shift"],
      },
      statusBadge: { label: "Requested", tone: "info" },
      priorityBadge: { label: "Critical", tone: "danger" },
      riskBadge: { label: "Critical risk", tone: "danger", score: 0.92 },
      costBadge: { label: "Cost > 2kEUR", tone: "warning", amountEur: 2400 },
      tags: ["urgent", "justification_required"],
    },
  ],
};

describe("ApprovalsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      id: "admin-1",
      permissions: ["admin:org:write"],
    });
    mockUseApiGet.mockReturnValue({
      data: mockApprovalInbox,
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
      approval: {
        ...mockApprovalInbox.items[0],
        status: "granted",
      },
      recommendationId: mockApprovalInbox.items[0].recommendationId,
      allApprovalsGranted: true,
      allApprovalsResolved: true,
      actionStatus: "pending",
      ledgerStatus: "open",
    });
  });

  function renderPage() {
    return render(
      <ClientProvider {...mockContext}>
        <ApprovalsPage />
      </ClientProvider>,
    );
  }

  it("renders approval summary and first inbox item", () => {
    renderPage();

    expect(screen.getByText("Inbox d'approbation")).toBeInTheDocument();
    expect(screen.getByText("coverage.site.standard v4")).toBeInTheDocument();
    expect(
      screen.getByText("ops_manager · site · all targets · J+7"),
    ).toBeInTheDocument();
    expect(screen.getByText("Demandes visibles: 1")).toBeInTheDocument();
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/approval-inbox",
    );
    expect(mockUseApiPost).toHaveBeenCalledWith(
      "/api/v1/admin/organizations/org-1/approvals/11111111-1111-4111-8111-111111111111/decision",
    );
  });

  it("shows loading skeletons while the inbox is loading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows an empty state when the inbox has no items", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        ...mockApprovalInbox,
        items: [],
        summary: { ...mockApprovalInbox.summary, total: 0 },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
  });

  it("shows a degraded notice when grouping data is missing", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        ...mockApprovalInbox,
        groups: [],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Lecture partielle")).toBeInTheDocument();
    expect(
      screen.getByText("Aucun regroupement disponible"),
    ).toBeInTheDocument();
  });

  it("requires justification before sending an approval decision", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Approuver" }));

    expect(
      await screen.findByText(
        "Une justification est requise pour cette decision.",
      ),
    ).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits a rejection decision and refreshes the inbox", async () => {
    const refetch = vi.fn();
    mockUseApiGet.mockReturnValue({
      data: mockApprovalInbox,
      loading: false,
      error: null,
      refetch,
    });

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText(
        "Ajouter le contexte de validation ou de rejet.",
      ),
      {
        target: { value: "Budget bloque pour cette semaine." },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Rejeter" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        outcome: "rejected",
        reasonCode: "rejected_by_admin",
        comment: "Budget bloque pour cette semaine.",
      });
    });
    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
  });

  it("keeps the inbox read-only without org write permission", () => {
    mockUseCurrentUser.mockReturnValue({
      id: "admin-1",
      permissions: ["admin:org:read"],
    });

    renderPage();

    expect(screen.getByText("Action restreinte")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approuver" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rejeter" }),
    ).not.toBeInTheDocument();
  });
});
