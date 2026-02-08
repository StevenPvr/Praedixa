import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RapportsPage from "../page";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => ({
  TabBar: ({
    tabs,
    activeTab,
    onTabChange,
  }: {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabChange: (id: string) => void;
  }) => (
    <div data-testid="tab-bar" data-active={activeTab}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          data-testid={`tab-${t.id}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  ),
  DataTable: ({
    data,
    emptyMessage,
  }: {
    data: unknown[];
    emptyMessage?: string;
  }) => (
    <div data-testid="data-table">
      {data.length > 0 ? `${data.length} rows` : (emptyMessage ?? "No data")}
    </div>
  ),
  WaterfallChart: ({ items }: { items: unknown[] }) => (
    <div data-testid="waterfall-chart">{items.length} items</div>
  ),
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    onRetry,
  }: {
    message?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback" onClick={onRetry}>
      {message}
    </div>
  ),
}));

/* -- Mock data ---------------------------------------- */

const mockAlerts = [
  {
    id: "a1",
    siteId: "Lyon",
    alertDate: "2026-02-03",
    shift: "AM",
    severity: "high",
    gapH: 4,
    pRupture: 0.3,
    status: "open",
    horizon: "j3",
    impactEur: 160,
    driversJson: [],
  },
  {
    id: "a2",
    siteId: "Paris",
    alertDate: "2026-02-03",
    shift: "PM",
    severity: "medium",
    gapH: 2,
    pRupture: 0.15,
    status: "resolved",
    horizon: "j7",
    impactEur: 80,
    driversJson: [],
  },
];

const mockProofs = [
  {
    id: "p1",
    siteId: "Lyon",
    month: "2026-01-01",
    coutBauEur: 50000,
    cout100Eur: 42000,
    coutReelEur: 38000,
    gainNetEur: 12000,
    adoptionPct: 0.9,
    alertesEmises: 20,
    alertesTraitees: 18,
  },
];

/* -- Helpers ------------------------------------------ */

function setupMock(overrides?: {
  proofs?: { data?: unknown; loading?: boolean; error?: string | null };
  alerts?: { data?: unknown; loading?: boolean; error?: string | null };
}) {
  const defaultReturn = {
    data: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  };

  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("coverage-alerts")) {
      return { ...defaultReturn, data: mockAlerts, ...overrides?.alerts };
    }
    if (url?.includes("/proof")) {
      return { ...defaultReturn, data: mockProofs, ...overrides?.proofs };
    }
    return defaultReturn;
  });
}

describe("RapportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  /* -- Header & tabs ---------------------------------- */

  it("renders the heading", () => {
    render(<RapportsPage />);
    expect(
      screen.getByRole("heading", { name: "Rapports" }),
    ).toBeInTheDocument();
  });

  it("renders the new subtitle", () => {
    render(<RapportsPage />);
    expect(
      screen.getByText(
        /Bilans hebdomadaires, analyse des couts et documents exportables/,
      ),
    ).toBeInTheDocument();
  });

  it("renders tab bar with 4 tabs", () => {
    render(<RapportsPage />);
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
    expect(screen.getByTestId("tab-synthese")).toBeInTheDocument();
    expect(screen.getByTestId("tab-precision")).toBeInTheDocument();
    expect(screen.getByTestId("tab-couts")).toBeInTheDocument();
    expect(screen.getByTestId("tab-proof")).toBeInTheDocument();
  });

  it("renders renamed tab labels", () => {
    render(<RapportsPage />);
    expect(screen.getByText("Bilan de la semaine")).toBeInTheDocument();
    expect(screen.getByText("Fiabilite des previsions")).toBeInTheDocument();
    expect(screen.getByText("Analyse des couts")).toBeInTheDocument();
    expect(screen.getByText("Bilans mensuels")).toBeInTheDocument();
  });

  /* -- Synthese tab ----------------------------------- */

  it("shows synthese tab by default with grouped weekly data", () => {
    render(<RapportsPage />);
    expect(screen.getByLabelText("Bilan de la semaine")).toBeInTheDocument();
    // 2 alerts on same date -> 1 weekly summary row
    expect(screen.getByText("1 rows")).toBeInTheDocument();
  });

  it("shows loading skeleton on synthese tab when alerts loading", () => {
    setupMock({ alerts: { loading: true, data: null } });
    render(<RapportsPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on synthese tab when alerts error", () => {
    setupMock({ alerts: { error: "Alerts fetch failed", data: null } });
    render(<RapportsPage />);
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Alerts fetch failed")).toBeInTheDocument();
  });

  it("shows empty message when no alerts", () => {
    setupMock({ alerts: { data: [] } });
    render(<RapportsPage />);
    expect(
      screen.getByText(/Aucune donnee pour le moment/),
    ).toBeInTheDocument();
  });

  it("groups alerts from same week into one summary", () => {
    const alertsSameWeek = [
      { ...mockAlerts[0], alertDate: "2026-02-03" },
      { ...mockAlerts[1], alertDate: "2026-02-05" },
    ];
    setupMock({ alerts: { data: alertsSameWeek } });
    render(<RapportsPage />);
    // Both alerts are in the same ISO week -> 1 row
    expect(screen.getByText("1 rows")).toBeInTheDocument();
  });

  it("groups alerts from different weeks into multiple summaries", () => {
    const alertsDiffWeeks = [
      { ...mockAlerts[0], alertDate: "2026-02-03" },
      { ...mockAlerts[1], alertDate: "2026-02-10" },
    ];
    setupMock({ alerts: { data: alertsDiffWeeks } });
    render(<RapportsPage />);
    expect(screen.getByText("2 rows")).toBeInTheDocument();
  });

  /* -- Precision tab ---------------------------------- */

  it("switches to precision tab", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(
      screen.getByLabelText("Fiabilite des previsions"),
    ).toBeInTheDocument();
  });

  it("shows development message on precision tab", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(
      screen.getByText(/Ce module est en cours de developpement/),
    ).toBeInTheDocument();
  });

  /* -- Couts tab -------------------------------------- */

  it("switches to couts tab and shows waterfall from proofs", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    // buildWaterfallFromProofs produces: Sans intervention, Gain par reajustement, Economies nettes, Cout final = 4 items
    expect(screen.getByTestId("waterfall-chart")).toBeInTheDocument();
    expect(screen.getByText("4 items")).toBeInTheDocument();
  });

  it("shows Decomposition des couts heading", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    expect(
      screen.getByRole("heading", { name: "Decomposition des couts" }),
    ).toBeInTheDocument();
  });

  it("shows skeleton card on couts tab when proofs loading", () => {
    setupMock({ proofs: { loading: true, data: null } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows empty message on couts tab when no proofs", () => {
    setupMock({ proofs: { data: [] } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    expect(
      screen.getByText(/Pas encore de donnees de couts/),
    ).toBeInTheDocument();
  });

  it("shows empty message on couts tab when proofs null", () => {
    setupMock({ proofs: { data: null } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    expect(
      screen.getByText(/Pas encore de donnees de couts/),
    ).toBeInTheDocument();
  });

  /* -- Proof tab -------------------------------------- */

  it("switches to proof tab and shows proof data", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(
      screen.getByRole("heading", { name: "Bilans mensuels" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 rows")).toBeInTheDocument();
  });

  it("shows Telecharger en PDF button on proof tab", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(screen.getByText("Telecharger en PDF")).toBeInTheDocument();
  });

  it("shows loading skeleton on proof tab", () => {
    setupMock({ proofs: { loading: true, data: null } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on proof tab", () => {
    setupMock({ proofs: { error: "Proof fetch failed", data: null } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Proof fetch failed")).toBeInTheDocument();
  });

  it("shows empty message on proof tab when no proofs", () => {
    setupMock({ proofs: { data: [] } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(
      screen.getByText(/Aucun bilan mensuel disponible/),
    ).toBeInTheDocument();
  });

  /* -- useApiGet calls -------------------------------- */

  it("calls useApiGet for both endpoints", () => {
    render(<RapportsPage />);
    expect(mockUseApiGet).toHaveBeenCalledWith("/api/v1/proof");
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/coverage-alerts?page_size=200",
    );
  });

  /* -- Waterfall computation edge cases --------------- */

  it("builds waterfall correctly with zero gain", () => {
    const noGainProofs = [
      { ...mockProofs[0], gainNetEur: 0, cout100Eur: 50000 },
    ];
    setupMock({ proofs: { data: noGainProofs } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    // Sans intervention + Cout final only (no gain line), but interimSaving = 0 too
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("builds waterfall with positive interim saving", () => {
    const posProofs = [{ ...mockProofs[0], cout100Eur: 60000, gainNetEur: 0 }];
    setupMock({ proofs: { data: posProofs } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    // Sans intervention + Gain par reajustement (positive) + Cout final = 3
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });
});
