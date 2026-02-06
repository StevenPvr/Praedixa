import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import AlertDetailPage from "../page";

/* ─── Mocks ──────────────────────────────────────── */

const mockPush = vi.fn();
const mockUseApiGet = vi.fn();
const mockMutate = vi.fn();
const mockUseApiPost = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ alertId: "alert-42" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    onRetry,
  }: {
    message?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback">
      {message}
      {onRetry && (
        <button onClick={onRetry} data-testid="retry-btn">
          Retry
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/arbitrage/arbitrage-context", () => ({
  ArbitrageContext: ({
    result,
    loading,
  }: {
    result: unknown;
    loading: boolean;
  }) => (
    <div data-testid="arbitrage-context" data-loading={loading}>
      {result ? "loaded" : "empty"}
    </div>
  ),
}));

vi.mock("@/components/arbitrage/options-comparison", () => ({
  OptionsComparison: ({
    options,
    loading,
    validatingIndex,
    onValidate,
  }: {
    options: unknown[];
    loading: boolean;
    validatingIndex: number;
    onValidate: (idx: number) => void;
  }) => (
    <div
      data-testid="options-comparison"
      data-loading={loading}
      data-validating-index={validatingIndex}
    >
      <div data-testid="options-count">{options.length}</div>
      <button onClick={() => onValidate(0)} data-testid="validate-btn">
        Validate
      </button>
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: () => <svg data-testid="check-circle" />,
}));

/* ─── Helpers ────────────────────────────────────── */

function makeResult() {
  return {
    alertId: "alert-42",
    alertTitle: "Sous-couverture Lyon",
    alertSeverity: "warning",
    departmentName: "Logistique",
    siteName: "Lyon",
    deficitPct: 15,
    horizonDays: 7,
    options: [
      {
        type: "overtime",
        label: "Heures sup",
        cost: 5000,
        delayDays: 1,
        coverageImpactPct: 10,
        riskLevel: "low",
        riskDetails: "Test",
        pros: [],
        cons: [],
      },
    ],
    recommendationIndex: 0,
  };
}

/* ─── Tests ──────────────────────────────────────── */

describe("AlertDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockResolvedValue({ id: "dec-1" });
    mockUseApiPost.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it("renders heading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(
      screen.getByRole("heading", { name: "Detail de l'alerte" }),
    ).toBeInTheDocument();
  });

  it("shows loading state in context and comparison", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(screen.getByTestId("arbitrage-context")).toHaveAttribute(
      "data-loading",
      "true",
    );
    expect(screen.getByTestId("options-comparison")).toHaveAttribute(
      "data-loading",
      "true",
    );
  });

  it("shows ErrorFallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Network error",
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Network error",
    );
  });

  it("renders options when loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(screen.getByTestId("options-count")).toHaveTextContent("1");
  });

  it("calls useApiGet with correct URL using encodeURIComponent", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/arbitrage/alert-42/options",
    );
  });

  it("calls useApiPost with correct URL", () => {
    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(mockUseApiPost).toHaveBeenCalledWith(
      "/api/v1/arbitrage/alert-42/validate",
    );
  });

  it("calls validate with selectedOptionIndex when validate button clicked", async () => {
    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    fireEvent.click(screen.getByTestId("validate-btn"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ selectedOptionIndex: 0 });
    });
  });

  it("renders Options d'arbitrage section heading", () => {
    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);
    expect(
      screen.getByRole("heading", { name: "Options d'arbitrage" }),
    ).toBeInTheDocument();
  });

  it("shows success banner and redirects to /decisions after 1.5s", async () => {
    vi.useFakeTimers();

    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);

    // act() flushes all async state updates from the click handler
    await act(async () => {
      fireEvent.click(screen.getByTestId("validate-btn"));
      await vi.advanceTimersByTimeAsync(0);
    });

    // Success banner should appear
    expect(screen.getByRole("status")).toHaveTextContent(
      "Decision enregistree avec succes",
    );

    // Router should not have been called yet
    expect(mockPush).not.toHaveBeenCalled();

    // Advance timer past 1500ms for the redirect setTimeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(mockPush).toHaveBeenCalledWith("/decisions");

    vi.useRealTimers();
  });

  it("shows error banner when mutation fails", async () => {
    // Pre-set error on hook return so mutateError is captured in the closure
    // (React closures capture values at render time, not after async resolution)
    mockUseApiPost.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: "Server error",
      data: null,
      reset: vi.fn(),
    });

    // mutate returns null to simulate failure
    mockMutate.mockResolvedValue(null);

    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);

    // act() ensures async handleValidate completes and React re-renders
    await act(async () => {
      fireEvent.click(screen.getByTestId("validate-btn"));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Votre choix n'a pas pu etre enregistre",
    );
  });

  it("retries validation when 'Reessayer' button is clicked", async () => {
    // Pre-set error so the closure captures a truthy mutateError
    mockUseApiPost.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: "Server error",
      data: null,
      reset: vi.fn(),
    });

    // First call: fail (return null)
    mockMutate.mockResolvedValueOnce(null);

    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);

    // First click: triggers error
    await act(async () => {
      fireEvent.click(screen.getByTestId("validate-btn"));
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Second call: succeed
    mockMutate.mockResolvedValueOnce({ id: "dec-retry" });

    await act(async () => {
      fireEvent.click(screen.getByText("Reessayer"));
    });

    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it("error banner is hidden when validationSuccess is true", async () => {
    vi.useFakeTimers();

    mockUseApiGet.mockReturnValue({
      data: makeResult(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AlertDetailPage />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("validate-btn"));
      await vi.advanceTimersByTimeAsync(0);
    });

    // Success banner visible
    expect(screen.getByRole("status")).toHaveTextContent(
      "Decision enregistree avec succes",
    );

    // No error alert should be present
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
