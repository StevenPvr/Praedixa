import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActionsPage from "../page";

/* ── Hoisted mocks ────────────────────────────── */

const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));
const { mockMutate, mockReset } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockReset: vi.fn(),
}));
const { mockPostState } = vi.hoisted(() => ({
  mockPostState: {
    loading: false,
    error: null as string | null,
  },
}));
const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}));
const { mockRefetchAlerts } = vi.hoisted(() => ({
  mockRefetchAlerts: vi.fn(),
}));

/* ── Module mocks ─────────────────────────────── */

vi.mock("next/navigation", () => ({
  usePathname: () => "/actions",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: () => ({
    mutate: mockMutate,
    loading: mockPostState.loading,
    error: mockPostState.error,
    data: null,
    reset: mockReset,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn() }),
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button
      data-testid="validate-btn"
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="detail-card" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/pareto-chart", () => ({
  ParetoChart: ({
    points,
    onPointClick,
  }: {
    points: { id: string; label: string }[];
    onPointClick?: (p: { id: string }) => void;
  }) => (
    <div data-testid="pareto-chart">
      {points.map((p) => (
        <button
          key={p.id}
          data-testid={`pareto-${p.id}`}
          onClick={() => onPointClick?.(p)}
        >
          {p.label}
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

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

vi.mock("@/components/actions/alert-selector", () => ({
  AlertSelector: ({
    alerts,
    selectedId,
    onSelect,
    loading,
  }: {
    alerts: { id: string; siteId: string }[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    loading: boolean;
  }) => (
    <div data-testid="alert-selector" data-loading={String(loading)}>
      {alerts.map((a) => (
        <button
          key={a.id}
          data-testid={`select-alert-${a.id}`}
          data-selected={String(a.id === selectedId)}
          onClick={() => onSelect(a.id)}
        >
          {a.siteId}
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
    loading,
  }: {
    options: { id: string; optionType: string }[];
    selectedOptionId: string | null;
    onSelectOption: (id: string) => void;
    loading: boolean;
  }) => (
    <div data-testid="optimization-panel" data-loading={String(loading)}>
      {options.map((o) => (
        <button
          key={o.id}
          data-testid={`select-option-${o.id}`}
          data-selected={String(o.id === selectedOptionId)}
          onClick={() => onSelectOption(o.id)}
        >
          {o.optionType}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/lib/scenario-utils", () => ({
  sortAlertsBySeverity: (alerts: { severity: string }[]) => {
    const order: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...alerts].sort(
      (a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4),
    );
  },
  getOptionLabel: (t: string) => t,
}));

vi.mock("lucide-react", () => ({
  CheckCircle: () => <svg data-testid="icon-check" />,
}));

/* ── Mock data ────────────────────────────────── */

const mockAlerts = [
  {
    id: "a1",
    siteId: "Lyon",
    alertDate: "2026-02-10",
    shift: "AM",
    severity: "high",
    gapH: 6,
    pRupture: 0.3,
    status: "open",
    driversJson: [],
    horizon: "j7",
  },
  {
    id: "a2",
    siteId: "Paris",
    alertDate: "2026-02-11",
    shift: "PM",
    severity: "medium",
    gapH: 3,
    pRupture: 0.15,
    status: "open",
    driversJson: [],
    horizon: "j3",
  },
];

const mockFrontier = {
  alertId: "a1",
  options: [
    {
      id: "o1",
      coverageAlertId: "a1",
      costParameterId: "cp1",
      optionType: "hs",
      label: "hs",
      coutTotalEur: 500,
      serviceAttenduPct: 85,
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
      label: "interim",
      coutTotalEur: 800,
      serviceAttenduPct: 95,
      heuresCouvertes: 6,
      isParetoOptimal: true,
      isRecommended: true,
      contraintesJson: {},
    },
  ],
  paretoFrontier: [],
  recommended: null,
};

/* ── Helper ───────────────────────────────────── */

function setupMocks(overrides?: Partial<Record<string, unknown>>) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("coverage-alerts")) {
      return {
        data: overrides?.alerts !== undefined ? overrides.alerts : mockAlerts,
        loading: overrides?.alertsLoading ?? false,
        error: overrides?.alertsError ?? null,
        refetch: mockRefetchAlerts,
      };
    }
    if (url?.includes("scenarios/alert/")) {
      return {
        data:
          overrides?.frontier !== undefined ? overrides.frontier : mockFrontier,
        loading: overrides?.frontierLoading ?? false,
        error: overrides?.frontierError ?? null,
        refetch: vi.fn(),
      };
    }
    // url === null (no alert selected)
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

/* ── Tests ────────────────────────────────────── */

describe("ActionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPostState.loading = false;
    mockPostState.error = null;
    setupMocks();
    mockMutate.mockResolvedValue({ id: "d1" });
  });

  it("renders the page header", () => {
    render(<ActionsPage />);
    expect(
      screen.getByRole("heading", { name: "Actions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Comparez les solutions et faites votre choix"),
    ).toBeInTheDocument();
  });

  it("renders the alert selector section", () => {
    render(<ActionsPage />);
    expect(screen.getByTestId("alert-selector")).toBeInTheDocument();
  });

  it("auto-selects the first alert", () => {
    render(<ActionsPage />);
    const btn = screen.getByTestId("select-alert-a1");
    expect(btn.dataset.selected).toBe("true");
  });

  it("renders optimization panel when alert is selected", () => {
    render(<ActionsPage />);
    expect(screen.getByTestId("optimization-panel")).toBeInTheDocument();
  });

  it("renders pareto chart with points", () => {
    render(<ActionsPage />);
    expect(screen.getByTestId("pareto-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pareto-o1")).toBeInTheDocument();
    expect(screen.getByTestId("pareto-o2")).toBeInTheDocument();
  });

  it("renders the validate button disabled when no option is selected", () => {
    render(<ActionsPage />);
    const btn = screen.getByTestId("validate-btn");
    expect(btn).toBeDisabled();
  });

  /* ── Selection flow ───────────────────────── */

  it("selecting an option enables the validate button", () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    expect(screen.getByTestId("validate-btn")).not.toBeDisabled();
  });

  it("selecting an alert resets the option selection", () => {
    render(<ActionsPage />);
    // Select option first
    fireEvent.click(screen.getByTestId("select-option-o1"));
    expect(screen.getByTestId("validate-btn")).not.toBeDisabled();
    // Switch alert
    fireEvent.click(screen.getByTestId("select-alert-a2"));
    expect(screen.getByTestId("validate-btn")).toBeDisabled();
  });

  it("clicking a pareto point selects the option", () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("pareto-o2"));
    const optionBtn = screen.getByTestId("select-option-o2");
    expect(optionBtn.dataset.selected).toBe("true");
  });

  /* ── Validate ─────────────────────────────── */

  it("calls mutate with correct body on validate", async () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(screen.getByTestId("validate-btn"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        coverageAlertId: "a1",
        chosenOptionId: "o1",
        siteId: "Lyon",
        shift: "AM",
        decisionDate: "2026-02-10",
        horizon: "j7",
        gapH: 6,
      });
    });
  });

  it("shows toast and moves to next alert on success", async () => {
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(screen.getByTestId("validate-btn"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          title: "Solution validee",
        }),
      );
    });

    // Should move to next alert (a2)
    const a2Btn = screen.getByTestId("select-alert-a2");
    expect(a2Btn.dataset.selected).toBe("true");
  });

  it("refetches alerts when validating the last alert", async () => {
    setupMocks({ alerts: [mockAlerts[0]] });
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(screen.getByTestId("validate-btn"));

    await waitFor(() => {
      expect(mockRefetchAlerts).toHaveBeenCalled();
    });
  });

  it("does not toast on mutate failure", async () => {
    mockMutate.mockResolvedValue(null);
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(screen.getByTestId("validate-btn"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  /* ── Empty states ─────────────────────────── */

  it("shows empty state when no alerts", () => {
    setupMocks({ alerts: [] });
    render(<ActionsPage />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Aucune alerte active")).toBeInTheDocument();
  });

  it("shows empty state when no scenarios for selected alert", () => {
    setupMocks({
      frontier: {
        alertId: "a1",
        options: [],
        paretoFrontier: [],
        recommended: null,
      },
    });
    render(<ActionsPage />);
    expect(screen.getByText("Aucun scenario disponible")).toBeInTheDocument();
  });

  /* ── Loading states ───────────────────────── */

  it("shows loading state on alerts loading", () => {
    setupMocks({ alertsLoading: true, alerts: null });
    render(<ActionsPage />);
    const selector = screen.getByTestId("alert-selector");
    expect(selector.dataset.loading).toBe("true");
  });

  it("shows loading state on frontier loading", () => {
    setupMocks({ frontierLoading: true });
    render(<ActionsPage />);
    const panel = screen.getByTestId("optimization-panel");
    expect(panel.dataset.loading).toBe("true");
  });

  it("renders skeleton chart while frontier is loading", () => {
    setupMocks({ frontierLoading: true });
    render(<ActionsPage />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("pareto-chart")).not.toBeInTheDocument();
  });

  /* ── Error states ─────────────────────────── */

  it("shows error fallback on alerts error", () => {
    setupMocks({ alertsError: "Network error" });
    render(<ActionsPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Network error",
    );
  });

  it("shows error fallback on frontier error", () => {
    setupMocks({ frontierError: "Scenario error" });
    render(<ActionsPage />);
    expect(screen.getByText("Scenario error")).toBeInTheDocument();
  });

  it("renders submit error message when validation fails", () => {
    mockPostState.error = "Echec de validation";
    render(<ActionsPage />);
    expect(screen.getByText("Echec de validation")).toBeInTheDocument();
  });

  /* ── API calls ────────────────────────────── */

  it("calls useApiGet with correct endpoints", () => {
    render(<ActionsPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain("/api/v1/coverage-alerts?status=open");
    expect(calls).toContain("/api/v1/scenarios/alert/a1");
  });

  it("passes null to useApiGet when no alert selected", () => {
    setupMocks({ alerts: [] });
    render(<ActionsPage />);
    const calls = mockUseApiGet.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain(null);
  });

  /* ── Pareto section heading ───────────────── */

  it("renders Pareto section heading", () => {
    render(<ActionsPage />);
    expect(screen.getByText("Compromis cout / couverture")).toBeInTheDocument();
  });

  it("renders Pareto explanation text", () => {
    render(<ActionsPage />);
    expect(screen.getByText(/meilleur compromis possible/)).toBeInTheDocument();
  });

  /* ── Section labels ───────────────────────── */

  it("renders section labels correctly", () => {
    render(<ActionsPage />);
    expect(screen.getByLabelText("Selection de l'alerte")).toBeInTheDocument();
    expect(screen.getByLabelText("Options d'optimisation")).toBeInTheDocument();
    expect(screen.getByLabelText("Graphique Pareto")).toBeInTheDocument();
  });

  it("uses default horizon j7 when selected alert has no horizon", async () => {
    setupMocks({
      alerts: [{ ...mockAlerts[0], horizon: null }],
    });
    render(<ActionsPage />);
    fireEvent.click(screen.getByTestId("select-option-o1"));
    fireEvent.click(screen.getByTestId("validate-btn"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          horizon: "j7",
        }),
      );
    });
  });
});
