import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RapportsPage from "../page";

const mockUseApiGet = vi.fn();
const mockGetValidAccessToken = vi.fn();

vi.mock("next/navigation", () =>
  globalThis.__mocks.createNextNavigationMocks(),
);

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: () => mockGetValidAccessToken(),
}));

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

vi.mock("@/components/ui/tab-bar", () => ({
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

vi.mock("@/components/ui/waterfall-chart", () => ({
  WaterfallChart: ({
    items,
    formatValue,
  }: {
    items: Array<{ label: string; value: number }>;
    formatValue?: (value: number) => string;
  }) => (
    <div data-testid="waterfall-chart">
      {items.length} items
      {formatValue && items.length > 0 ? (
        <div data-testid="waterfall-first-format">
          {formatValue(items[0].value)}
        </div>
      ) : null}
      {formatValue && items.length > 1 ? (
        <div data-testid="waterfall-second-format">
          {formatValue(items[1].value)}
        </div>
      ) : null}
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
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
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

const mockForecastRuns = [
  {
    id: "run-1",
    modelType: "ensemble",
    horizonDays: 14,
    status: "completed",
    accuracyScore: 0.91,
    startedAt: "2026-02-01T08:00:00Z",
    completedAt: "2026-02-01T08:15:00Z",
  },
  {
    id: "run-2",
    modelType: "prophet",
    horizonDays: 7,
    status: "completed",
    accuracyScore: 0.88,
    startedAt: "2026-01-29T08:00:00Z",
    completedAt: "2026-01-29T08:10:00Z",
  },
];

/* -- Helpers ------------------------------------------ */

function setupMock(overrides?: {
  proofs?: { data?: unknown; loading?: boolean; error?: string | null };
  alerts?: { data?: unknown; loading?: boolean; error?: string | null };
  forecasts?: { data?: unknown; loading?: boolean; error?: string | null };
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
    if (url?.includes("/forecasts?status=completed")) {
      return {
        ...defaultReturn,
        data: mockForecastRuns,
        ...overrides?.forecasts,
      };
    }
    return defaultReturn;
  });
}

describe("RapportsPage", () => {
  const realCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValidAccessToken.mockResolvedValue("token-123");
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock-url"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
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

  it("uses alert fallback values when gap and rupture are missing", () => {
    setupMock({
      alerts: {
        data: [
          {
            ...mockAlerts[0],
            gapH: null,
            pRupture: null,
          },
        ],
      },
    });
    render(<RapportsPage />);
    expect(screen.getByText("0 EUR")).toBeInTheDocument();
    expect(screen.getByText("100.0%")).toBeInTheDocument();
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
    expect(screen.getByText("Runs completes")).toBeInTheDocument();
    expect(screen.getByText("Precision moyenne")).toBeInTheDocument();
    expect(screen.getByText("Meilleure precision")).toBeInTheDocument();
    expect(screen.getByText("2 rows")).toBeInTheDocument();
  });

  it("shows skeleton table on precision tab when forecast runs are loading", () => {
    setupMock({ forecasts: { data: null, loading: true } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on precision tab when forecast fetch fails", () => {
    setupMock({ forecasts: { data: null, error: "Forecasts failed" } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(screen.getByText("Forecasts failed")).toBeInTheDocument();
  });

  it("shows empty message on precision tab when no forecast run", () => {
    setupMock({ forecasts: { data: [] } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(
      screen.getByText("Aucune execution de prevision disponible."),
    ).toBeInTheDocument();
  });

  it("shows fallback precision values when all accuracy scores are null", () => {
    setupMock({
      forecasts: {
        data: [{ ...mockForecastRuns[0], accuracyScore: null }],
      },
    });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("renders forecast fallbacks for null dates and percent values above 1", () => {
    setupMock({
      forecasts: {
        data: [
          {
            ...mockForecastRuns[0],
            completedAt: null,
            accuracyScore: 87,
          },
        ],
      },
    });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(screen.getAllByText("87.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  /* -- Couts tab -------------------------------------- */

  it("switches to couts tab and shows waterfall from proofs", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    // buildWaterfallFromProofs produces: Sans intervention, Gain par reajustement, Economies nettes, Cout final = 4 items
    expect(screen.getByTestId("waterfall-chart")).toBeInTheDocument();
    expect(screen.getByText("4 items")).toBeInTheDocument();
    expect(screen.getByTestId("waterfall-first-format")).toHaveTextContent(
      "+50k EUR",
    );
    expect(screen.getByTestId("waterfall-second-format")).toHaveTextContent(
      "-8k EUR",
    );
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

  it("disables PDF button when there is no proof", () => {
    setupMock({ proofs: { data: [] } });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(
      screen.getByRole("button", { name: "Telecharger en PDF" }),
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
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

  it("downloads proof PDF successfully", async () => {
    setupMock({
      proofs: {
        data: [{ ...mockProofs[0], siteId: "Site A", month: "2026-01-15" }],
      },
    });

    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild");
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        if (tagName === "a") {
          return {
            href: "",
            download: "",
            click,
          } as unknown as HTMLElement;
        }
        return realCreateElement(tagName);
      },
    );

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["pdf"]),
    });

    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    fireEvent.click(screen.getByRole("button", { name: "Telecharger en PDF" }));

    await screen.findByText("Telecharger en PDF");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/proof/pdf?"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
    expect(appendChild).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("shows error when API base URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    fireEvent.click(screen.getByRole("button", { name: "Telecharger en PDF" }));
    expect(
      await screen.findByText("NEXT_PUBLIC_API_URL non configuree"),
    ).toBeInTheDocument();
  });

  it("shows download error when backend returns non-OK status", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    fireEvent.click(screen.getByRole("button", { name: "Telecharger en PDF" }));
    expect(
      await screen.findByText("Echec du telechargement (500)"),
    ).toBeInTheDocument();
  });

  it("downloads without authorization header when token is absent", async () => {
    mockGetValidAccessToken.mockResolvedValue(null);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["pdf"]),
    });
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    fireEvent.click(screen.getByRole("button", { name: "Telecharger en PDF" }));
    await screen.findByText("Telecharger en PDF");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  /* -- useApiGet calls -------------------------------- */

  it("calls useApiGet for both endpoints", () => {
    render(<RapportsPage />);
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/proof?page=1&page_size=200",
      { pollInterval: 10000 },
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/coverage-alerts?page_size=200",
      { pollInterval: 10000 },
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/forecasts?status=completed",
      { pollInterval: 10000 },
    );
  });

  it("uses weekStart as row key in synthese table", () => {
    render(<RapportsPage />);
    expect(screen.getByTestId("row-key")).toHaveTextContent("2026-02-02");
  });

  it("uses forecast run id as row key in precision table", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(screen.getByTestId("row-key")).toHaveTextContent("run-1");
  });

  it("uses proof id as row key in proof table", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(screen.getByTestId("row-key")).toHaveTextContent("p1");
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
