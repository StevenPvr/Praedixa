import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParametresPage from "../page";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
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
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  Input: (props: Record<string, unknown>) => (
    <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
  ),
  FormField: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }) => <div data-testid={`field-${label}`}>{children}</div>,
  SkeletonTable: () => <div data-testid="skeleton-table" />,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

vi.mock("@/components/donnees/sites-table", () => ({
  SitesTable: () => <div data-testid="sites-table">Sites Table</div>,
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
      screen.getByRole("heading", { name: "Reglages" }),
    ).toBeInTheDocument();
  });

  it("renders the new subtitle", () => {
    render(<ParametresPage />);
    expect(
      screen.getByText(/Configurez les couts, horaires, seuils/),
    ).toBeInTheDocument();
  });

  it("renders tab bar", () => {
    render(<ParametresPage />);
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
  });

  it("renders renamed tab labels", () => {
    render(<ParametresPage />);
    expect(screen.getByText("Baremes de couts")).toBeInTheDocument();
    expect(screen.getByText("Horaires des postes")).toBeInTheDocument();
    expect(screen.getByText("Exporter les donnees")).toBeInTheDocument();
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
  it("renders SitesTable on sites tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-sites"));
    expect(screen.getByTestId("sites-table")).toBeInTheDocument();
  });
});
