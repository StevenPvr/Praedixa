import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/* ────────────────────────────────────────────── */
/*  Mocks                                         */
/* ────────────────────────────────────────────── */

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: vi.fn(() => ({
    mutate: vi.fn().mockResolvedValue(null),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  })),
  useApiPatch: vi.fn(() => ({
    mutate: vi.fn().mockResolvedValue(null),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseClientContext = vi.fn(() => ({
  orgId: "org-1",
  orgName: "Acme Logistics",
  selectedSiteId: null,
  setSelectedSiteId: vi.fn(),
  hierarchy: [],
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => mockUseClientContext(),
}));

vi.mock("@praedixa/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    "aria-label"?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={rest["aria-label"]}
    >
      {children}
    </button>
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
  formatRelativeTime: (dateStr: string | null) => {
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    return `Il y a ${Math.floor(diffH / 24)}j`;
  },
}));

vi.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label, variant }: { label: string; variant: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
}));

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual<object>("lucide-react");
  return {
    ...actual,
    MessageSquare: ({ className }: { className?: string }) => (
      <span data-testid="icon-message-square" className={className} />
    ),
    User: ({ className }: { className?: string }) => (
      <span data-testid="icon-user" className={className} />
    ),
    Headphones: ({ className }: { className?: string }) => (
      <span data-testid="icon-headphones" className={className} />
    ),
    CheckCheck: ({ className }: { className?: string }) => (
      <span data-testid="icon-check-check" className={className} />
    ),
    Clock: ({ className }: { className?: string }) => (
      <span data-testid="icon-clock" className={className} />
    ),
    Send: ({ className }: { className?: string }) => (
      <span data-testid="icon-send" className={className} />
    ),
  };
});

import MessagesPage from "../page";

/* ────────────────────────────────────────────── */
/*  Fixtures                                      */
/* ────────────────────────────────────────────── */

function setupMockApiGet(
  overrides: Record<
    string,
    {
      data?: unknown;
      loading?: boolean;
      error?: string | null;
    }
  > = {},
) {
  mockUseApiGet.mockImplementation((url: string | null) => {
    return {
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
      ...overrides[url ?? "default"],
    };
  });
}

/* ────────────────────────────────────────────── */
/*  Tests                                         */
/* ────────────────────────────────────────────── */

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockApiGet();
  });

  it("renders the fail-close fallback while messaging workspace is disabled", () => {
    render(<MessagesPage />);
    expect(
      screen.getByText(/La messagerie client n'est pas encore industrialise/i),
    ).toBeInTheDocument();
  });

  it("does not fetch organization conversations while disabled", () => {
    render(<MessagesPage />);
    expect(mockUseApiGet).toHaveBeenCalledWith(null, undefined);
  });

  it("uses useClientContext to get orgId", () => {
    render(<MessagesPage />);
    expect(mockUseClientContext).toHaveBeenCalled();
  });
});
