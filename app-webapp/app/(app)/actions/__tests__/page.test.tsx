import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ActionsPage from "../page";

const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));

const { mockMutate } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}));

const { ACTION_MESSAGES } = vi.hoisted(() => ({
  ACTION_MESSAGES: {
    "actions.title": "Centre de traitement",
    "actions.subtitle":
      "Traitez les alertes dans l'ordre d'impact operationnel",
    "actions.queueEmptyTitle": "Aucune alerte active",
    "actions.queueEmptyDescription": "Tous vos sites sont couverts.",
    "actions.validate": "Valider cette solution",
    "actions.successTitle": "Decision enregistree",
    "actions.successDescription": "La solution a ete validee et historisee.",
  } as Record<string, string>,
}));

vi.mock("next/navigation", () =>
  globalThis.__mocks.createNextNavigationMocks({ pathname: "/actions" }),
);

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/product-events", () => ({
  trackProductEvent: vi.fn(),
}));

vi.mock("@/lib/i18n/provider", () => ({
  useI18n: () => ({
    t: (key: string) => ACTION_MESSAGES[key] ?? key,
    locale: "fr" as const,
    setLocale: vi.fn(),
  }),
}));

vi.mock("@praedixa/ui", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
  Card: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  ),
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="detail-card">{children}</div>
  ),
}));

vi.mock("@/components/ui/pareto-chart", () => ({
  ParetoChart: ({
    points,
    onPointClick,
  }: {
    points: Array<{ id: string; label: string }>;
    onPointClick: (point: { id: string }) => void;
  }) => (
    <div data-testid="pareto-chart">
      {points.map((point) => (
        <button
          key={point.id}
          data-testid={`pareto-${point.id}`}
          onClick={() => onPointClick(point)}
        >
          {point.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/actions/optimization-panel", () => ({
  OptimizationPanel: ({
    options,
    selectedOptionId,
    onSelectOption,
  }: {
    options: Array<{ id: string; optionType: string }>;
    selectedOptionId: string | null;
    onSelectOption: (id: string) => void;
  }) => (
    <div data-testid="optimization-panel">
      {options.map((option) => (
        <button
          key={option.id}
          data-testid={`select-option-${option.id}`}
          data-selected={String(option.id === selectedOptionId)}
          onClick={() => onSelectOption(option.id)}
        >
          {option.optionType}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/animated-section", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-section">{children}</div>
  ),
}));

vi.mock("@/components/page-transition", () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
}));

vi.mock("@/components/status-banner", () => ({
  StatusBanner: ({
    children,
    variant,
    title,
  }: {
    children: React.ReactNode;
    variant: string;
    title?: string;
  }) => (
    <div data-testid="status-banner" data-variant={variant}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
}));

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
      {onRetry ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
  CheckCircle: () => <svg data-testid="icon-check-circle" />,
  Clock3: () => <svg data-testid="icon-clock" />,
  Euro: () => <svg data-testid="icon-euro" />,
  Gauge: () => <svg data-testid="icon-gauge" />,
}));

const queueItems = [
  {
    id: "a1",
    siteId: "Lyon",
    alertDate: "2026-02-10",
    shift: "AM",
    severity: "critical",
    gapH: 6,
    pRupture: 0.62,
    horizon: "j7",
    driversJson: ["absence_rate"],
    priorityScore: 95,
    estimatedImpactEur: 1200,
    timeToBreachHours: 5,
  },
  {
    id: "a2",
    siteId: "Paris",
    alertDate: "2026-02-11",
    shift: "PM",
    severity: "medium",
    gapH: 3,
    pRupture: 0.18,
    horizon: "j3",
    driversJson: [],
    priorityScore: 45,
    estimatedImpactEur: 300,
    timeToBreachHours: 26,
  },
];

const workspaceForA1 = {
  alert: {
    id: "a1",
    organizationId: "org",
    siteId: "Lyon",
    alertDate: "2026-02-10",
    shift: "AM",
    horizon: "j7",
    pRupture: 0.62,
    gapH: 6,
    severity: "critical",
    status: "open",
    driversJson: ["absence_rate"],
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-02-10T00:00:00Z",
  },
  options: [
    {
      id: "o1",
      coverageAlertId: "a1",
      costParameterId: "cp1",
      optionType: "hs",
      label: "Heures sup",
      coutTotalEur: 400,
      serviceAttenduPct: 89,
      heuresCouvertes: 4,
      isParetoOptimal: true,
      isRecommended: false,
      contraintesJson: {},
    },
    {
      id: "o2",
      coverageAlertId: "a1",
      costParameterId: "cp1",
      optionType: "interim",
      label: "Interim",
      coutTotalEur: 680,
      serviceAttenduPct: 96,
      heuresCouvertes: 6,
      isParetoOptimal: true,
      isRecommended: true,
      contraintesJson: {},
    },
  ],
  recommendedOptionId: "o2",
  diagnostic: {
    topDrivers: ["absence_rate"],
  },
};

function setupUseApiGet({
  queue = queueItems,
  liveAlerts = null,
  workspace = workspaceForA1,
  queueError = null,
  liveError = null,
  workspaceError = null,
}: {
  queue?: unknown[] | null;
  liveAlerts?: unknown[] | null;
  workspace?: unknown | null;
  queueError?: string | null;
  liveError?: string | null;
  workspaceError?: string | null;
} = {}) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.startsWith("/api/v1/live/coverage-alerts/queue")) {
      return {
        data: queue,
        loading: false,
        error: queueError,
        refetch: vi.fn(),
      };
    }

    if (url?.startsWith("/api/v1/live/coverage-alerts?status=open&page_size=200")) {
      return {
        data: liveAlerts,
        loading: false,
        error: liveError,
        refetch: vi.fn(),
      };
    }

    if (url?.startsWith("/api/v1/live/decision-workspace/a1")) {
      return {
        data: workspace,
        loading: false,
        error: workspaceError,
        refetch: vi.fn(),
      };
    }

    if (url?.startsWith("/api/v1/live/scenarios/alert/")) {
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    }

    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("ActionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUseApiGet();
    mockMutate.mockResolvedValue({ id: "decision-1" });
  });

  it("renders decision queue header", () => {
    render(<ActionsPage />);
    expect(
      screen.getByRole("heading", { name: "Centre de traitement" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Traitez les alertes dans l'ordre d'impact operationnel",
      ),
    ).toBeInTheDocument();
  });

  it("shows empty state when queue is empty", () => {
    setupUseApiGet({ queue: [] });
    render(<ActionsPage />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Aucune alerte active")).toBeInTheDocument();
  });

  it("does not fallback to full live alerts when queue is empty", () => {
    setupUseApiGet({
      queue: [],
      liveAlerts: [
        {
          id: "live-1",
          siteId: "SiteMassif",
          alertDate: "2026-02-13",
          shift: "AM",
          severity: "critical",
          gapH: 12,
          pRupture: 0.9,
          horizon: "j7",
          status: "open",
          driversJson: [],
          createdAt: "2026-02-13T00:00:00Z",
          updatedAt: "2026-02-13T00:00:00Z",
        },
      ],
    });
    render(<ActionsPage />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByText("SiteMassif")).not.toBeInTheDocument();
  });

  it("renders queue cards and auto-selects first alert workspace", () => {
    render(<ActionsPage />);
    expect(screen.getAllByText("Lyon").length).toBeGreaterThan(0);
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByTestId("optimization-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pareto-chart")).toBeInTheDocument();
  });

  it("keeps validate button disabled until an option is selected", () => {
    render(<ActionsPage />);
    expect(
      screen.getByRole("button", { name: "Valider cette solution" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByTestId("select-option-o1"));
    expect(
      screen.getByRole("button", { name: "Valider cette solution" }),
    ).not.toBeDisabled();
  });

  it("selecting pareto point selects option and allows validation", () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("pareto-o2"));
    expect(screen.getByTestId("select-option-o2")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Valider cette solution" }),
    ).not.toBeDisabled();
  });

  it("sends decision payload on validate", async () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(
      screen.getByRole("button", { name: "Valider cette solution" }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          coverageAlertId: "a1",
          chosenOptionId: "o1",
          siteId: "Lyon",
          shift: "AM",
          decisionDate: "2026-02-10",
          horizon: "j7",
          gapH: 6,
        }),
      );
    });
  });

  it("shows success toast after successful validation", async () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(
      screen.getByRole("button", { name: "Valider cette solution" }),
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          title: "Decision enregistree",
        }),
      );
    });
  });

  it("renders queue endpoint and workspace endpoint calls", () => {
    render(<ActionsPage />);
    const calledUrls = mockUseApiGet.mock.calls.map(
      (call: unknown[]) => call[0] as string | null,
    );
    expect(calledUrls).toContain(
      "/api/v1/live/coverage-alerts?status=open&page_size=200",
    );
    expect(calledUrls).toContain(
      "/api/v1/live/coverage-alerts/queue?status=open&limit=50",
    );
    expect(calledUrls).toContain("/api/v1/live/decision-workspace/a1");
  });
});
