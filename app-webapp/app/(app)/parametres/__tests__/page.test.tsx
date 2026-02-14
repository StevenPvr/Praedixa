import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParametresPage from "../page";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();

vi.mock("next/navigation", () =>
  globalThis.__mocks.createNextNavigationMocks(),
);

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
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

vi.mock("@/components/animated-section", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-section">{children}</div>
  ),
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

const defaultEffective = {
  capHsShift: 8,
  capInterimSite: 40,
  leadTimeJours: 3,
  cInt: 25,
  majHs: 1.25,
  cInterim: 35,
  premiumUrgence: 1.5,
  cBacklog: 15,
  version: 1,
  effectiveFrom: "2026-01-01",
};

const defaultOrg = {
  id: "org-1",
  name: "Test Org",
  settings: {
    shiftDefinitions: [
      { code: "AM", start: "06:00", end: "14:00", label: "Matin" },
      { code: "PM", start: "14:00", end: "22:00", label: "Apres-midi" },
    ],
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    alertThresholds: {
      understaffingRisk: 15,
      absenceRate: 8,
      consecutiveAbsences: 3,
      forecastAccuracy: 90,
    },
  },
};

function setupMocks(overrides?: Record<string, unknown>) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url?.includes("cost-parameters/effective")) {
      return {
        data:
          "effective" in (overrides ?? {})
            ? overrides!.effective
            : defaultEffective,
        loading: overrides?.effectiveLoading ?? false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("organizations/me")) {
      return {
        data: "org" in (overrides ?? {}) ? overrides!.org : defaultOrg,
        loading: overrides?.orgLoading ?? false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url?.includes("cost-parameters")) {
      return {
        data: overrides?.costParams ?? [],
        loading: overrides?.costLoading ?? false,
        error: overrides?.costError ?? null,
        refetch: vi.fn(),
      };
    }
    if (url === "/api/v1/sites") {
      return {
        data: overrides?.siteRows ?? [
          { id: "s1", name: "Lyon", city: "Lyon", employeeCount: 50 },
        ],
        loading: overrides?.sitesLoading ?? false,
        error: overrides?.sitesError ?? null,
        refetch: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("ParametresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it("renders the heading", () => {
    render(<ParametresPage />);
    expect(
      screen.getByRole("heading", { name: "Gouvernance et reglages" }),
    ).toBeInTheDocument();
  });

  it("renders the new subtitle", () => {
    render(<ParametresPage />);
    expect(
      screen.getByText(
        "Cadrez les couts, seuils et parametres operationnels de votre organisation.",
      ),
    ).toBeInTheDocument();
  });

  it("renders tab bar", () => {
    render(<ParametresPage />);
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
  });

  it("renders renamed tab labels", () => {
    render(<ParametresPage />);
    expect(screen.getByText("Barèmes de coûts")).toBeInTheDocument();
    expect(screen.getByText("Horaires des postes")).toBeInTheDocument();
    expect(screen.getByText("Exporter les données")).toBeInTheDocument();
  });

  it("shows couts tab by default", () => {
    render(<ParametresPage />);
    expect(screen.getByLabelText("Baremes de couts")).toBeInTheDocument();
  });

  it("shows Baremes de couts par site heading", () => {
    render(<ParametresPage />);
    expect(
      screen.getByRole("heading", { name: "Baremes de couts par site" }),
    ).toBeInTheDocument();
  });

  it("switches to shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByLabelText("Horaires des postes")).toBeInTheDocument();
  });

  it("shows Poste/Nom headers on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("Poste")).toBeInTheDocument();
    expect(screen.getByText("Nom")).toBeInTheDocument();
  });

  it("shows Limites operationnelles subtitle on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("Limites operationnelles")).toBeInTheDocument();
  });

  it("shows working days from organization settings on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("Lundi")).toBeInTheDocument();
    expect(screen.getByText("Vendredi")).toBeInTheDocument();
  });

  it("shows renamed capacity labels on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(
      screen.getByText("Plafond heures sup. par poste"),
    ).toBeInTheDocument();
    expect(screen.getByText("Plafond interim par site")).toBeInTheDocument();
    expect(
      screen.getByText("Delai de mobilisation interim"),
    ).toBeInTheDocument();
  });

  it("switches to seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByLabelText("Seuils d'alerte")).toBeInTheDocument();
  });

  it("shows renamed threshold labels on seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(
      screen.getByText("Seuil de risque sous-effectif"),
    ).toBeInTheDocument();
    expect(screen.getByText("Seuil d'alerte absence")).toBeInTheDocument();
    expect(screen.getByText("Absences consecutives max.")).toBeInTheDocument();
    expect(
      screen.getByText("Fiabilite minimale des previsions"),
    ).toBeInTheDocument();
  });

  it("switches to export tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-export"));
    expect(screen.getByText("Telecharger CSV")).toBeInTheDocument();
    expect(screen.getByText("Telecharger PDF")).toBeInTheDocument();
  });

  it("shows new export description", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-export"));
    expect(
      screen.getByText(/Telechargez vos donnees au format tableur/),
    ).toBeInTheDocument();
  });

  it("shows error on cost params error", () => {
    setupMocks({ costError: "Cost error" });
    render(<ParametresPage />);
    expect(screen.getByText("Cost error")).toBeInTheDocument();
  });

  it("shows skeleton on cost params loading", () => {
    setupMocks({ costLoading: true });
    render(<ParametresPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows empty message when no cost params exist", () => {
    setupMocks({ costParams: [] });
    render(<ParametresPage />);
    expect(
      screen.getByText(
        "Aucun bareme configure. Ajoutez vos premiers baremes de couts pour activer les calculs.",
      ),
    ).toBeInTheDocument();
  });

  it("renders cost table custom site fallback when siteId is null", () => {
    setupMocks({
      costParams: [
        {
          id: "cp-1",
          siteId: null,
          version: 2,
          cInt: 25,
          majHs: 1.2,
          cInterim: 40,
          capHsShift: 8,
          effectiveFrom: "2026-01-01",
        },
      ],
    });
    render(<ParametresPage />);
    expect(screen.getByText("Valeur par défaut")).toBeInTheDocument();
  });

  it("uses row id as DataTable key for cost rows", () => {
    setupMocks({
      costParams: [
        {
          id: "cp-key-1",
          siteId: "s1",
          version: 1,
          cInt: 25,
          majHs: 1.1,
          cInterim: 35,
          capHsShift: 8,
          effectiveFrom: "2026-01-01",
        },
      ],
    });
    render(<ParametresPage />);
    expect(screen.getByTestId("row-key")).toHaveTextContent("cp-key-1");
  });

  // Shifts tab -- real data
  it("shows capHsShift value on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("8h")).toBeInTheDocument();
  });

  it("shows capInterimSite value on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("40h")).toBeInTheDocument();
  });

  it("shows leadTimeJours value on shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("3j")).toBeInTheDocument();
  });

  it("shows skeleton on shifts tab when loading", () => {
    setupMocks({ effectiveLoading: true });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows empty shifts state when shift definitions are invalid", () => {
    setupMocks({
      org: {
        ...defaultOrg,
        settings: {
          ...defaultOrg.settings,
          shiftDefinitions: [{ code: "AM", start: "06:00" }],
        },
      },
    });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(
      screen.getByText("Aucun horaire de poste configure dans la base."),
    ).toBeInTheDocument();
  });

  it("shows empty shifts state when shiftDefinitions is not an array", () => {
    setupMocks({
      org: {
        ...defaultOrg,
        settings: {
          ...defaultOrg.settings,
          shiftDefinitions: "invalid",
        },
      },
    });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(
      screen.getByText("Aucun horaire de poste configure dans la base."),
    ).toBeInTheDocument();
  });

  it("shows empty working-days state when settings are malformed", () => {
    setupMocks({
      org: {
        ...defaultOrg,
        settings: {
          ...defaultOrg.settings,
          workingDays: "invalid",
        },
      },
    });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.getByText("Aucun jour configure.")).toBeInTheDocument();
  });

  it("maps unknown working day keys and only keeps strict booleans", () => {
    setupMocks({
      org: {
        ...defaultOrg,
        settings: {
          ...defaultOrg.settings,
          workingDays: {
            monday: "true",
            holiday: true,
          },
        },
      },
    });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(screen.queryByText("Lundi")).not.toBeInTheDocument();
    expect(screen.getByText("holiday")).toBeInTheDocument();
  });

  // Seuils tab -- real data
  it("shows understaffingRisk value on seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("shows absenceRate value on seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByText("8%")).toBeInTheDocument();
  });

  it("shows consecutiveAbsences value on seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByText("3j")).toBeInTheDocument();
  });

  it("shows forecastAccuracy value on seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("shows skeleton on seuils tab when loading", () => {
    setupMocks({ orgLoading: true });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows fallback when org is null on seuils tab", () => {
    setupMocks({ org: null });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(
      screen.getByText(/Parametres de l'organisation non disponibles/),
    ).toBeInTheDocument();
  });

  // Sites tab
  it("renders sites DataTable on sites tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-sites"));
    expect(
      screen.getByLabelText("Configuration des sites"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("shows skeleton on sites tab when loading", () => {
    setupMocks({ sitesLoading: true });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-sites"));
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error on sites tab when fetch fails", () => {
    setupMocks({ sitesError: "Sites error" });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-sites"));
    expect(screen.getByText("Sites error")).toBeInTheDocument();
  });

  it("shows sites empty message when no site is configured", () => {
    setupMocks({ siteRows: [] });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-sites"));
    expect(screen.getByText("Aucun site configure.")).toBeInTheDocument();
  });

  it("uses row id as DataTable key for site rows", () => {
    setupMocks({
      siteRows: [
        { id: "site-key-1", name: "Lyon", city: "Lyon", employeeCount: 50 },
      ],
    });
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-sites"));
    expect(screen.getByTestId("row-key")).toHaveTextContent("site-key-1");
  });
});
