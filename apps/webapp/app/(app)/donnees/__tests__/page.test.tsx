import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DonneesPage from "../page";

// ── Hoisted dynamic mock ────────────────────────────────────────────────────
const { mockUseApiGet } = vi.hoisted(() => ({
  mockUseApiGet: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/donnees",
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
}));

// Mock child components to isolate page logic
vi.mock("@/components/donnees/sites-table", () => ({
  SitesTable: () => <div data-testid="sites-table">sites-table</div>,
}));

vi.mock("@/components/donnees/departments-table", () => ({
  DepartmentsTable: ({ sites }: { sites: unknown[] }) => (
    <div data-testid="departments-table">
      departments-table ({sites.length} sites)
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
      {message}
      {onRetry && <button onClick={onRetry}>Reessayer</button>}
    </div>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockRefetchSites = vi.fn();

function setupSuccessMock() {
  mockUseApiGet.mockImplementation((url: string | null) => {
    if (url === "/api/v1/sites") {
      return {
        data: [
          { id: "s1", name: "Lyon" },
          { id: "s2", name: "Paris" },
        ],
        loading: false,
        error: null,
        refetch: mockRefetchSites,
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DonneesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSuccessMock();
  });

  it("renders the Donnees heading", () => {
    render(<DonneesPage />);
    expect(
      screen.getByRole("heading", { name: "Donnees" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<DonneesPage />);
    expect(
      screen.getByText("Consultation des donnees importees (lecture seule)"),
    ).toBeInTheDocument();
  });

  it("renders the Sites section", () => {
    render(<DonneesPage />);
    expect(screen.getByLabelText("Sites")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sites" })).toBeInTheDocument();
  });

  it("renders the Departements section", () => {
    render(<DonneesPage />);
    expect(screen.getByLabelText("Departements")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Departements" }),
    ).toBeInTheDocument();
  });

  it("passes sites to DepartmentsTable when loaded", () => {
    render(<DonneesPage />);
    expect(screen.getByText("departments-table (2 sites)")).toBeInTheDocument();
  });

  // ── Error branch ──────────────────────────────────────────────────────────

  it("shows ErrorFallback when sites fetch has an error", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/sites") {
        return {
          data: null,
          loading: false,
          error: "Erreur sites",
          refetch: mockRefetchSites,
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });

    render(<DonneesPage />);
    expect(screen.getByText("Erreur sites")).toBeInTheDocument();
  });

  it("passes empty sites while loading", () => {
    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url === "/api/v1/sites") {
        return {
          data: null,
          loading: true,
          error: null,
          refetch: mockRefetchSites,
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });

    render(<DonneesPage />);
    // When loading, sites are passed as [] to DepartmentsTable
    expect(screen.getByText("departments-table (0 sites)")).toBeInTheDocument();
  });
});
