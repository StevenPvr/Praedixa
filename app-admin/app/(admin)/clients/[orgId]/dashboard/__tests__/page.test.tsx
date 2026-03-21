import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock("@/lib/auth/client", () => ({
  useCurrentUser: () => ({
    role: "super_admin",
    permissions: ["admin:org:write"],
  }),
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => ({
    orgId: "org-1",
    orgName: "Client test",
    selectedSiteId: null,
    setSelectedSiteId: vi.fn(),
    hierarchy: [],
  }),
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    Card: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    CardContent: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    Button: ({
      children,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    DataTable: () => <div data-testid="data-table" />,
    SkeletonCard: () => <div data-testid="skeleton-card" />,
    StatCard: ({ label, value }: { label: string; value: string }) => (
      <div>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    ),
  };
});

import ClientDashboardPage from "../page";

const overview = {
  organization: {
    id: "org-1",
    name: "Client test",
    slug: "client-test",
    status: "trial",
    plan: "free",
    contactEmail: "ops@test.fr",
    isTest: true,
    userCount: 0,
    siteCount: 0,
  },
  mirror: {
    totalEmployees: 0,
    totalSites: 0,
    activeAlerts: 0,
    forecastAccuracy: 1,
  },
  billing: {
    plan: "free",
    billingCycle: "monthly",
    monthlyAmount: 0,
    nextBillingDate: "2026-04-01T00:00:00.000Z",
  },
  alerts: [],
  scenarios: [],
};

describe("ClientDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseApiGet.mockReturnValue({
      data: overview,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseApiPost.mockImplementation((url: string) => {
      if (url.includes("/delete")) {
        return {
          mutate: vi.fn(async () => ({
            organizationId: "org-1",
            slug: "client-test",
            deleted: true,
          })),
          loading: false,
          error: null,
          data: null,
          reset: vi.fn(),
        };
      }

      return {
        mutate: vi.fn(async () => ({})),
        loading: false,
        error: null,
        data: null,
        reset: vi.fn(),
      };
    });
  });

  it("renders the guarded deletion card for test clients", () => {
    render(<ClientDashboardPage />);

    expect(screen.getAllByText("Client test").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Suppression definitive du client test/i),
    ).toBeInTheDocument();
  });

  it("requires multi-confirmation and deletes the test client", async () => {
    const user = userEvent.setup();
    const deleteMutate = vi.fn(async () => ({
      organizationId: "org-1",
      slug: "client-test",
      deleted: true,
    }));

    mockUseApiPost.mockImplementation((url: string) => {
      if (url.includes("/delete")) {
        return {
          mutate: deleteMutate,
          loading: false,
          error: null,
          data: null,
          reset: vi.fn(),
        };
      }

      return {
        mutate: vi.fn(async () => ({})),
        loading: false,
        error: null,
        data: null,
        reset: vi.fn(),
      };
    });

    render(<ClientDashboardPage />);

    await user.click(
      screen.getByLabelText(/Je confirme qu'il s'agit bien d'un client test/i),
    );
    await user.type(
      screen.getByLabelText(/Retape le slug du client/i),
      "client-test",
    );
    await user.type(screen.getByLabelText(/Retape SUPPRIMER/i), "SUPPRIMER");
    await user.click(
      screen.getByRole("button", { name: "Supprimer definitivement" }),
    );

    await waitFor(() =>
      expect(deleteMutate).toHaveBeenCalledWith({
        organizationSlug: "client-test",
        confirmationText: "SUPPRIMER",
        acknowledgeTestDeletion: true,
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Client test supprime");
    expect(mockPush).toHaveBeenCalledWith("/clients");
  });
});
