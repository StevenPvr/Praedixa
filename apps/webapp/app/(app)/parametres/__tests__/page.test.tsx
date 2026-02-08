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

describe("ParametresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
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
      screen.getByRole("heading", { name: "Parametres" }),
    ).toBeInTheDocument();
  });

  it("renders tab bar", () => {
    render(<ParametresPage />);
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
  });

  it("shows couts tab by default", () => {
    render(<ParametresPage />);
    expect(screen.getByLabelText("Parametres de cout")).toBeInTheDocument();
  });

  it("switches to shifts tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-shifts"));
    expect(
      screen.getByLabelText("Configuration des shifts"),
    ).toBeInTheDocument();
  });

  it("switches to seuils tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-seuils"));
    expect(screen.getByLabelText("Seuils d\'alerte")).toBeInTheDocument();
  });

  it("switches to export tab", () => {
    render(<ParametresPage />);
    fireEvent.click(screen.getByTestId("tab-export"));
    expect(screen.getByText("Exporter CSV")).toBeInTheDocument();
  });

  it("shows error on cost params error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Cost error",
      refetch: vi.fn(),
    });
    render(<ParametresPage />);
    expect(screen.getByText("Cost error")).toBeInTheDocument();
  });
});
