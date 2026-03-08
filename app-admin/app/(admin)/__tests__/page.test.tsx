import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

/* ────────────────────────────────────────────── */
/*  Mocks                                         */
/* ────────────────────────────────────────────── */

const mockUseApiGet = vi.fn();
const mockUseCurrentUser = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/auth/client", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@praedixa/ui");
  return {
    ...actual,
    StatCard: ({
      label,
      value,
      variant,
    }: {
      label: string;
      value: string;
      variant?: string;
    }) => (
      <div data-testid="stat-card" data-variant={variant}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    ),
    Card: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <div data-testid="card" className={className}>
        {children}
      </div>
    ),
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
  };
});

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock("@/components/severity-badge", () => ({
  SeverityBadge: ({ severity }: { severity: string }) => (
    <span data-testid="severity-badge">{severity}</span>
  ),
}));

vi.mock("@/components/skeletons/skeleton-admin-dashboard", () => ({
  SkeletonAdminDashboard: () => (
    <div data-testid="skeleton-dashboard" role="status" />
  ),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  CheckCircle: () => <span data-testid="icon-check-circle" />,
  Clock: () => <span data-testid="icon-clock" />,
  MessageSquare: () => <span data-testid="icon-message-square" />,
  Database: () => <span data-testid="icon-database" />,
  Activity: () => <span data-testid="icon-activity" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  Server: () => <span data-testid="icon-server" />,
  Zap: () => <span data-testid="icon-zap" />,
}));

import AccueilPage from "../page";

/* ────────────────────────────────────────────── */
/*  Helpers                                       */
/* ────────────────────────────────────────────── */

const MOCK_KPIS = {
  totalOrganizations: 4,
  activeOrganizations: 3,
  totalUsers: 42,
  totalDatasets: 10,
  totalForecasts: 25,
  totalDecisions: 15,
  ingestionSuccessRate: 98.5,
  apiErrorRate: 0.3,
};

const MOCK_ALERTS_BY_ORG = {
  organizations: [
    {
      orgId: "org-1",
      orgName: "Acme Logistics",
      critical: 2,
      high: 3,
      medium: 5,
      low: 1,
      total: 11,
    },
    {
      orgId: "org-2",
      orgName: "TransFroid",
      critical: 0,
      high: 1,
      medium: 2,
      low: 0,
      total: 3,
    },
  ],
  totalAlerts: 14,
};

const MOCK_COST_PARAMS = {
  organizations: [
    {
      orgId: "org-1",
      orgName: "Acme Logistics",
      missingSites: 2,
      totalSites: 5,
    },
  ],
};

const MOCK_ADOPTION = {
  organizations: [
    {
      orgId: "org-3",
      orgName: "Petit Colis",
      adoptionRate: 35,
      totalDecisions: 20,
    },
  ],
};

const MOCK_AUDIT_ENTRIES = [
  {
    id: "audit-1",
    adminUserId: "admin-1",
    action: "create_org",
    resourceType: "organization",
    severity: "info",
    createdAt: "2026-02-09T10:00:00Z",
    targetOrgId: "org-1",
  },
  {
    id: "audit-2",
    adminUserId: "admin-1",
    action: "change_plan",
    resourceType: "billing",
    severity: "warning",
    createdAt: "2026-02-09T09:30:00Z",
    targetOrgId: "org-2",
  },
];

const MOCK_UNREAD = {
  total: 8,
  byOrg: [
    { orgId: "org-1", orgName: "Acme Logistics", count: 6 },
    { orgId: "org-2", orgName: "TransFroid", count: 2 },
  ],
};

type MockApiGetResult = {
  data: unknown;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

function setupMockApiGet(
  overrides: Record<string, Partial<MockApiGetResult>> = {},
) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    const base: MockApiGetResult = {
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    };

    if (!url) {
      return base;
    }

    if (url.includes("/monitoring/platform")) {
      return { ...base, data: MOCK_KPIS, ...overrides["kpis"] };
    }
    if (url.includes("/monitoring/alerts/by-org")) {
      return { ...base, data: MOCK_ALERTS_BY_ORG, ...overrides["alerts"] };
    }
    if (url.includes("/monitoring/cost-params/missing")) {
      return { ...base, data: MOCK_COST_PARAMS, ...overrides["costParams"] };
    }
    if (url.includes("/monitoring/decisions/adoption")) {
      return { ...base, data: MOCK_ADOPTION, ...overrides["adoption"] };
    }
    if (url.includes("/audit-log")) {
      return { ...base, data: MOCK_AUDIT_ENTRIES, ...overrides["audit"] };
    }
    if (url.includes("/conversations/unread-count")) {
      return { ...base, data: MOCK_UNREAD, ...overrides["unread"] };
    }
    return base;
  });
}

/* ────────────────────────────────────────────── */
/*  Tests                                         */
/* ────────────────────────────────────────────── */

describe("AccueilPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      permissions: [
        "admin:monitoring:read",
        "admin:org:read",
        "admin:audit:read",
        "admin:messages:read",
      ],
    });
  });

  it("shows skeleton while KPIs are loading", () => {
    setupMockApiGet({ kpis: { loading: true, data: null } });
    render(<AccueilPage />);
    expect(screen.getByTestId("skeleton-dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Accueil")).not.toBeInTheDocument();
  });

  it("shows data after loading completes", () => {
    setupMockApiGet({ kpis: { loading: false, data: MOCK_KPIS } });
    render(<AccueilPage />);
    expect(screen.queryByTestId("skeleton-dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getAllByTestId("stat-card")).toHaveLength(4);
    expect(screen.getByText("Sante plateforme")).toBeInTheDocument();
    expect(screen.getByText("Activite recente")).toBeInTheDocument();
  });

  it("shows error fallback on KPI error", () => {
    setupMockApiGet({ kpis: { error: "Network error", data: null } });
    render(<AccueilPage />);
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.queryByText("Accueil")).not.toBeInTheDocument();
  });

  it("renders heading and subtitle", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(
      screen.getByText("Inbox operationnel — vue d'ensemble de la plateforme"),
    ).toBeInTheDocument();
  });

  it("renders 4 StatCards with correct values", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    const cards = screen.getAllByTestId("stat-card");
    expect(cards).toHaveLength(4);

    // Check values within each card
    expect(
      within(cards[0]).getByText("Organisations actives"),
    ).toBeInTheDocument();
    expect(within(cards[0]).getByText("3")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Utilisateurs")).toBeInTheDocument();
    expect(within(cards[1]).getByText("42")).toBeInTheDocument();
  });

  it("renders urgent items from critical alerts", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("2 alerte(s) critique(s)")).toBeInTheDocument();
    expect(
      screen.getByText("Acme Logistics — 11 alertes au total"),
    ).toBeInTheDocument();
  });

  it("renders warning items from high alerts (non-critical orgs)", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("1 alerte(s) elevee(s)")).toBeInTheDocument();
    expect(
      screen.getByText("TransFroid — necessite une attention"),
    ).toBeInTheDocument();
  });

  it("renders warning items for missing cost params", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(
      screen.getByText("Parametres de cout manquants"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Acme Logistics — 2/5 sites non configures"),
    ).toBeInTheDocument();
  });

  it("renders warning items for low adoption", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("Adoption faible (35%)")).toBeInTheDocument();
  });

  it("renders urgent item for many unread messages (>5)", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("6 messages non lus")).toBeInTheDocument();
    expect(
      screen.getByText("Acme Logistics — reponse en attente"),
    ).toBeInTheDocument();
  });

  it("renders info item for few unread messages (<=5)", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("2 message(s) non lu(s)")).toBeInTheDocument();
  });

  it("renders inbox count in heading", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    // 6 items: 1 critical alert + 1 high alert + 1 unread urgent + 1 unread info + 1 cost + 1 adoption
    expect(screen.getByText("Inbox (6)")).toBeInTheDocument();
  });

  it("shows empty inbox state when no issues", () => {
    setupMockApiGet({
      alerts: { data: { organizations: [], totalAlerts: 0 } },
      costParams: { data: { organizations: [] } },
      adoption: { data: { organizations: [] } },
      unread: { data: { total: 0, byOrg: [] } },
    });
    render(<AccueilPage />);
    expect(screen.getByText("Aucun element en attente")).toBeInTheDocument();
  });

  it("renders system health bar with ingestion rate", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("Sante plateforme")).toBeInTheDocument();
    expect(screen.getByText("Taux d'ingestion")).toBeInTheDocument();
    expect(screen.getByText("98.5%")).toBeInTheDocument();
  });

  it("renders system health bar with API error rate", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("Taux d'erreur API")).toBeInTheDocument();
    expect(screen.getByText("0.3%")).toBeInTheDocument();
  });

  it("falls back to 0.0% when KPI rates are missing", () => {
    setupMockApiGet({
      kpis: {
        data: {
          totalOrganizations: 4,
          activeOrganizations: 3,
          totalUsers: 42,
        },
      },
    });
    render(<AccueilPage />);
    expect(screen.getByText("Sante plateforme")).toBeInTheDocument();
    expect(screen.getAllByText("0.0%")).toHaveLength(2);
  });

  it("renders unread messages card with total badge", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("Messages non lus")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders unread messages by org with links", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    const links = screen.getAllByRole("link");
    const messagesLink = links.find(
      (l) =>
        l.getAttribute("href") === "/clients/org-1/messages" &&
        l.textContent?.includes("Acme Logistics"),
    );
    expect(messagesLink).toBeDefined();
  });

  it("renders activity feed with audit entries", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    expect(screen.getByText("Activite recente")).toBeInTheDocument();
    expect(screen.getByText("Creation organisation")).toBeInTheDocument();
    expect(screen.getByText("Changement plan")).toBeInTheDocument();
  });

  it("renders severity badges in activity feed", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    const badges = screen.getAllByTestId("severity-badge");
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty activity when no audit entries", () => {
    setupMockApiGet({ audit: { data: [] } });
    render(<AccueilPage />);
    expect(screen.getByText("Aucune activite recente")).toBeInTheDocument();
  });

  it("skips audit and unread fetches when permissions are missing", () => {
    mockUseCurrentUser.mockReturnValue({
      permissions: ["admin:monitoring:read", "admin:org:read"],
    });
    setupMockApiGet();

    render(<AccueilPage />);

    expect(mockUseApiGet).toHaveBeenCalledWith(null);
    expect(screen.queryByText("Activite recente")).not.toBeInTheDocument();
    expect(screen.queryByText("Messages non lus")).not.toBeInTheDocument();
  });

  it("shows empty unread messages state", () => {
    setupMockApiGet({
      unread: { data: { total: 0, byOrg: [] } },
    });
    render(<AccueilPage />);
    expect(screen.getByText("Aucun message en attente")).toBeInTheDocument();
  });

  it("handles legacy unread payload without crashing", () => {
    setupMockApiGet({
      unread: { data: { unreadCount: 3 } },
    });
    render(<AccueilPage />);
    expect(screen.getByText("Messages non lus")).toBeInTheDocument();
    expect(screen.getByText("Aucun message en attente")).toBeInTheDocument();
  });

  it("sets StatCard variant to danger when urgent items exist", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    const cards = screen.getAllByTestId("stat-card");
    // Third card (Items urgents) should have danger variant
    const urgentCard = cards[2];
    expect(urgentCard.getAttribute("data-variant")).toBe("danger");
  });

  it("sets StatCard variant to success when no urgent items", () => {
    setupMockApiGet({
      alerts: { data: { organizations: [], totalAlerts: 0 } },
      unread: { data: { total: 0, byOrg: [] } },
    });
    render(<AccueilPage />);
    const cards = screen.getAllByTestId("stat-card");
    const urgentCard = cards[2];
    expect(urgentCard.getAttribute("data-variant")).toBe("success");
  });

  it("does not render SystemHealthBar if kpis is null", () => {
    setupMockApiGet({
      kpis: { data: null, loading: false, error: null },
    });
    // When kpis is null but no loading/error, page still renders (defensively)
    // But KPI loading=false and error=null with data=null just shows 0s
    // Actually, kpis will be null — the page renders with kpis?.activeOrganizations ?? 0
    render(<AccueilPage />);
    expect(screen.queryByText("Sante plateforme")).not.toBeInTheDocument();
  });

  it("does not render unread card if unreadCount is null", () => {
    setupMockApiGet({
      unread: { data: null },
    });
    render(<AccueilPage />);
    expect(screen.queryByText("Messages non lus")).not.toBeInTheDocument();
  });

  it("does not render activity feed if auditEntries is null", () => {
    setupMockApiGet({
      audit: { data: null },
    });
    render(<AccueilPage />);
    expect(screen.queryByText("Activite recente")).not.toBeInTheDocument();
  });

  it("inbox items link to correct client pages", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    const links = screen.getAllByRole("link");
    const alertLink = links.find(
      (l) => l.getAttribute("href") === "/clients/org-1/alertes",
    );
    expect(alertLink).toBeDefined();
  });

  it("sorts inbox items: urgent first, then warning, then info", () => {
    setupMockApiGet();
    render(<AccueilPage />);
    const links = screen.getAllByRole("link");
    // Filter to inbox item links (those with /clients/ in href)
    const inboxLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("/clients/"),
    );
    // First links should be urgent (critical alerts, unread urgent)
    const firstHref = inboxLinks[0]?.getAttribute("href");
    // org-1 has critical alerts
    expect(firstHref).toBe("/clients/org-1/alertes");
  });
});
