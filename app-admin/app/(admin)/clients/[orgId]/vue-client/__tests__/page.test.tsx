/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
let mockCurrentUserPermissions = ["admin:org:write", "admin:billing:read"];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve("token")),
  clearAuthSession: vi.fn(),
  useCurrentUser: () => ({
    permissions: mockCurrentUserPermissions,
  }),
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => ({
    orgId: "org-1",
    orgName: "Test Org",
    selectedSiteId: null,
    setSelectedSiteId: vi.fn(),
    hierarchy: [],
  }),
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
    StatCard: ({ label, value }: { label: string; value: string }) => (
      <div data-testid="stat-card">
        {label}: {value}
      </div>
    ),
    Button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  };
});

import VueClientPage from "../page";

const mockOrg = {
  id: "org-1",
  name: "Acme Corp",
  slug: "acme-corp",
  status: "active",
  plan: "professional",
  contactEmail: "admin@acme.com",
  sector: "Logistics",
  siteCount: 3,
  userCount: 25,
};

const mockMirror = {
  totalEmployees: 150,
  totalSites: 3,
  activeAlerts: 2,
};

const mockBilling = {
  plan: "professional",
  billingCycle: "monthly",
  monthlyAmount: 499,
  nextBillingDate: "2026-03-01",
};

describe("VueClientPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUserPermissions = ["admin:org:write", "admin:billing:read"];
    let callIndex = 0;

    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockOrg,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (idx === 1) {
        return {
          data: mockMirror,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: mockBilling,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(async () => ({ success: true })),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it("renders org info card with name, slug, and badges", () => {
    render(<VueClientPage />);
    expect(screen.getByText("Vue client")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("acme-corp")).toBeInTheDocument();
    expect(screen.getByText("admin@acme.com")).toBeInTheDocument();
  });

  it("renders mirror KPIs as stat cards", () => {
    render(<VueClientPage />);
    expect(screen.getByText("Employes: 150")).toBeInTheDocument();
    expect(screen.getByText("Sites: 3")).toBeInTheDocument();
    expect(screen.getByText("Alertes actives: 2")).toBeInTheDocument();
  });

  it("renders billing summary", () => {
    render(<VueClientPage />);
    expect(screen.getByText("monthly")).toBeInTheDocument();
    expect(screen.getByText("499 EUR")).toBeInTheDocument();
    expect(screen.getByText("2026-03-01")).toBeInTheDocument();
  });

  it("skips the billing fetch and shows a permission gate without admin:billing:read", () => {
    mockCurrentUserPermissions = ["admin:org:write"];

    render(<VueClientPage />);

    expect(
      screen.getByText("Permission requise: admin:billing:read"),
    ).toBeInTheDocument();
    expect(mockUseApiGet.mock.calls[2]?.[0]).toBeNull();
  });

  it("renders loading skeletons when data is loading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<VueClientPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("renders error fallback on org error", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: null,
          loading: false,
          error: "Org load failed",
          refetch: vi.fn(),
        };
      }
      return { data: null, loading: false, error: null, refetch: vi.fn() };
    });
    render(<VueClientPage />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByText("Org load failed")).toBeInTheDocument();
  });

  it("shows suspend button for active org", () => {
    render(<VueClientPage />);
    expect(
      screen.getByRole("button", { name: /Suspendre/i }),
    ).toBeInTheDocument();
  });

  it("shows reactivate button for suspended org", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: { ...mockOrg, status: "suspended" },
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (idx === 1) {
        return {
          data: mockMirror,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: mockBilling,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    render(<VueClientPage />);
    expect(
      screen.getByRole("button", { name: /Reactiver/i }),
    ).toBeInTheDocument();
  });

  it("calls suspend API and shows toast on success", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({ success: true }));
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
    render(<VueClientPage />);
    await user.click(screen.getByRole("button", { name: /Suspendre/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mockToastSuccess).toHaveBeenCalledWith("Client suspendu");
  });

  it("shows error toast when suspend fails", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => null);
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
    render(<VueClientPage />);
    await user.click(screen.getByRole("button", { name: /Suspendre/i }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Impossible de suspendre le client",
      ),
    );
  });

  it("shows sector when available", () => {
    render(<VueClientPage />);
    expect(screen.getByText("Logistics")).toBeInTheDocument();
  });

  it("shows mirror error message when mirror fails", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockOrg,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (idx === 1) {
        return {
          data: null,
          loading: false,
          error: "Mirror error",
          refetch: vi.fn(),
        };
      }
      return {
        data: mockBilling,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    render(<VueClientPage />);
    expect(screen.getByText("Mirror error")).toBeInTheDocument();
  });

  it("shows billing error message when billing fails", () => {
    let callIndex = 0;
    mockUseApiGet.mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return {
          data: mockOrg,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (idx === 1) {
        return {
          data: mockMirror,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: null,
        loading: false,
        error: "Billing error",
        refetch: vi.fn(),
      };
    });
    render(<VueClientPage />);
    expect(screen.getByText("Billing error")).toBeInTheDocument();
  });
});
