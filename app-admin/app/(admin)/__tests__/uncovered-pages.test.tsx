/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockUseApiGetPaginated = vi.fn();
const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockApiPatch = vi.fn();
const mockApiPost = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useParams: () => ({ orgId: "org-1" }),
  usePathname: () => "/clients",
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve("token")),
  useCurrentUser: () => ({
    id: "admin-123",
    email: "admin@praedixa.com",
    role: "super_admin",
    permissions: [
      "admin:console:access",
      "admin:audit:read",
      "admin:onboarding:read",
      "admin:onboarding:write",
      "admin:org:write",
      "admin:support:write",
    ],
  }),
}));

vi.mock("@/lib/api/client", () => ({
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  ApiError: class ApiError extends Error {},
}));

vi.mock("@/components/ui/data-table-toolbar", () => ({
  DataTableToolbar: ({ children, onClearSelection }: any) => (
    <div>
      <button onClick={onClearSelection}>Clear selection</button>
      {children}
    </div>
  ),
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
    DataTable: ({ data, columns, selection, toolbar, pagination }: any) => (
      <div data-testid="data-table">
        {data?.[0] &&
          columns?.map((col: any) => (
            <div key={col.key}>
              {col.render
                ? col.render(data[0])
                : String(data[0][col.key] ?? "")}
            </div>
          ))}
        {selection && data?.[0] ? (
          <button
            onClick={() => selection.onSelectionChange(new Set([data[0].id]))}
          >
            Select first
          </button>
        ) : null}
        {toolbar}
        {pagination ? (
          <button
            onClick={() => pagination.onPageChange((pagination.page ?? 1) + 1)}
          >
            Next page
          </button>
        ) : null}
      </div>
    ),
    Button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  };
});

import ClientsPage from "../clients/page";
import JournalPage from "../journal/page";
import ParametresPage from "../parametres/page";

const baseRow = {
  id: "id-1",
  name: "Org Name",
  slug: "org-name",
  status: "active",
  plan: "starter",
  contactEmail: "hello@org.test",
  userCount: 12,
  siteCount: 2,
  action: "view_org",
  resourceType: "organization",
  ipAddress: "127.0.0.1",
  requestId: "request-id-123456",
  severity: "low",
  organizationId: "org-1",
  currentStep: 1,
  stepsCompleted: [],
  initiatedBy: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
};

describe("restructured admin pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPatch.mockResolvedValue({ success: true });
    mockApiPost.mockResolvedValue({ success: true });

    mockUseApiGetPaginated.mockReturnValue({
      data: [baseRow],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    mockUseApiGet.mockReturnValue({
      data: {},
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(async () => baseRow),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi
      .fn()
      .mockReturnValue("blob:test");
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi
      .fn()
      .mockReturnValue(undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ────────── Clients Page ────────── */

  it("ClientsPage handles filters, toolbar actions, and navigation", async () => {
    const user = userEvent.setup();
    render(<ClientsPage />);

    await user.click(screen.getByRole("button", { name: "Nouveau client" }));
    expect(mockPush).toHaveBeenCalledWith("/parametres");

    await user.type(
      screen.getByPlaceholderText("Rechercher par nom..."),
      "Org",
    );
    await waitFor(() => {
      const calledUrl = mockUseApiGetPaginated.mock.calls.at(-1)?.[0];
      expect(String(calledUrl)).toContain("search=Org");
    });

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "active");
    await user.selectOptions(selects[1], "starter");

    await waitFor(() => {
      const calledUrl = mockUseApiGetPaginated.mock.calls.at(-1)?.[0];
      expect(String(calledUrl)).toContain("status=active");
      expect(String(calledUrl)).toContain("plan=starter");
    });

    await user.click(screen.getByText("Select first"));
    await user.click(screen.getByRole("button", { name: "Exporter" }));
    await user.click(screen.getByRole("button", { name: "Voir le client" }));

    expect(mockPush).toHaveBeenCalledWith("/clients/id-1/dashboard");
  });

  it("ClientsPage renders error fallback and clears selection", async () => {
    const user = userEvent.setup();
    render(<ClientsPage />);
    await user.click(screen.getByText("Select first"));
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(
      screen.queryByRole("button", { name: "Exporter" }),
    ).not.toBeInTheDocument();

    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Org error",
      refetch: vi.fn(),
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ClientsPage />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByText("Org error")).toBeInTheDocument();
  });

  it("ClientsPage renders loading skeleton and row action navigation", async () => {
    const user = userEvent.setup();
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ClientsPage />);
    expect(
      screen.getByRole("status", {
        name: "Chargement de la liste des organisations",
      }),
    ).toBeInTheDocument();

    mockUseApiGetPaginated.mockReturnValue({
      data: [baseRow],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ClientsPage />);
    const rowAction = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("hover:text-charcoal"));
    if (rowAction) await user.click(rowAction);
    expect(mockPush).toHaveBeenCalledWith("/clients/id-1/dashboard");
  });

  it("ClientsPage shows singular label", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [baseRow],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ClientsPage />);
    expect(screen.getByText("1 client au total")).toBeInTheDocument();
  });

  it("ClientsPage export no-op when selection no longer matches rows", async () => {
    const user = userEvent.setup();
    mockUseApiGetPaginated.mockImplementation((url: string) => {
      if (String(url).includes("search=empty")) {
        return {
          data: [],
          total: 0,
          loading: false,
          error: null,
          refetch: vi.fn(),
          pagination: {
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }
      return {
        data: [baseRow],
        total: 1,
        loading: false,
        error: null,
        refetch: vi.fn(),
        pagination: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    });

    render(<ClientsPage />);
    await user.click(screen.getByText("Select first"));
    await user.type(
      screen.getByPlaceholderText("Rechercher par nom..."),
      "empty",
    );
    await user.click(screen.getByRole("button", { name: "Exporter" }));
    expect((URL as any).createObjectURL).not.toHaveBeenCalled();
  });

  /* ────────── Journal Page ────────── */

  it("JournalPage renders audit section by default", () => {
    render(<JournalPage />);
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("JournalPage applies action filter", async () => {
    render(<JournalPage />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "view_users" },
    });
    await waitFor(() => {
      const calledUrl = mockUseApiGetPaginated.mock.calls.at(-1)?.[0];
      expect(String(calledUrl)).toContain("action=view_users");
    });
  });

  it("JournalPage renders toolbar when rows are selected", async () => {
    const user = userEvent.setup();
    render(<JournalPage />);
    await user.click(screen.getByText("Select first"));
    expect(
      screen.getByRole("button", { name: "Exporter" }),
    ).toBeInTheDocument();
  });

  it("JournalPage handles unknown action and null resource type", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [
        {
          ...baseRow,
          action: "custom_action",
          resourceType: null,
          requestId: "abcd",
        },
      ],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<JournalPage />);
    expect(screen.getByText("custom_action")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("abcd...")).toBeInTheDocument();
  });

  it("JournalPage handles missing requestId without crashing", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [
        {
          ...baseRow,
          requestId: undefined,
          resourceType: "organization",
        },
      ],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    render(<JournalPage />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("JournalPage shows API error fallback in audit section", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Audit error",
      refetch: vi.fn(),
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<JournalPage />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByText("Audit error")).toBeInTheDocument();
  });

  it("JournalPage switches to RGPD section", async () => {
    const user = userEvent.setup();
    render(<JournalPage />);
    await user.click(screen.getByText("RGPD"));
    expect(screen.getByText("Registre des traitements")).toBeInTheDocument();
    expect(screen.getByText("Export des donnees")).toBeInTheDocument();
    expect(screen.getByText("Suppression des donnees")).toBeInTheDocument();
    expect(screen.getByText("Politique de retention")).toBeInTheDocument();
  });

  /* ────────── Parametres Page ────────── */

  it("ParametresPage renders onboarding section by default", () => {
    render(<ParametresPage />);
    expect(screen.getByText("Parametres")).toBeInTheDocument();
    expect(screen.getByText("Demarrer un onboarding")).toBeInTheDocument();
  });

  it("ParametresPage starts onboarding flow", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({ ...baseRow, id: "ob-1" }));
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<ParametresPage />);
    await user.type(screen.getByPlaceholderText("Nom organisation"), "Org X");
    await user.type(screen.getByPlaceholderText("slug"), "org-x");
    await user.type(
      screen.getByPlaceholderText("email contact"),
      "ops@org.com",
    );
    await user.click(screen.getByRole("button", { name: "Lancer" }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mockToastSuccess).toHaveBeenCalledWith("Onboarding demarre");
  });

  it("ParametresPage handles start failure", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => null);
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: "Onboarding failed",
      data: null,
      reset: vi.fn(),
    });

    render(<ParametresPage />);
    await user.type(screen.getByPlaceholderText("Nom organisation"), "Org Y");
    await user.type(screen.getByPlaceholderText("slug"), "org-y");
    await user.type(
      screen.getByPlaceholderText("email contact"),
      "ops@org-y.com",
    );
    await user.click(screen.getByRole("button", { name: "Lancer" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Onboarding failed"),
    );
  });

  it("ParametresPage validates next step", async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    await user.click(screen.getByRole("button", { name: "Valider etape" }));
    await waitFor(() => expect(mockApiPatch).toHaveBeenCalled());
  });

  it("ParametresPage handles step API failure", async () => {
    const user = userEvent.setup();
    mockApiPatch.mockRejectedValueOnce(new Error("Patch failed"));
    render(<ParametresPage />);
    await user.click(screen.getByRole("button", { name: "Valider etape" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Impossible de valider l'etape",
      ),
    );
  });

  it("ParametresPage handles ApiError message", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api/client");
    mockApiPatch.mockRejectedValueOnce(new ApiError("Patch api error"));
    render(<ParametresPage />);
    await user.click(screen.getByRole("button", { name: "Valider etape" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Patch api error"),
    );
  });

  it("ParametresPage shows completed step as disabled", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [
        {
          ...baseRow,
          currentStep: 5,
          status: "completed",
          completedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ParametresPage />);
    expect(screen.getByRole("button", { name: "Termine" })).toBeDisabled();
  });

  it("ParametresPage shows onboarding list error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Onboarding list failed",
      refetch: vi.fn(),
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ParametresPage />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByText("Onboarding list failed")).toBeInTheDocument();
  });

  it("ParametresPage renders onboarding dates", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [{ ...baseRow, completedAt: null }],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<ParametresPage />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("ParametresPage switches to config section and shows all-configured", async () => {
    const user = userEvent.setup();
    mockUseApiGet.mockReturnValue({
      data: { totalOrgsWithMissing: 0, totalMissingParams: 0, orgs: [] },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ParametresPage />);
    await user.click(screen.getByText("Configuration"));
    expect(
      screen.getByText(
        "Toutes les organisations ont leurs parametres de cout configures.",
      ),
    ).toBeInTheDocument();
  });

  it("ParametresPage config section shows missing params", async () => {
    const user = userEvent.setup();
    mockUseApiGet.mockReturnValue({
      data: {
        orgsWithoutConfig: 1,
        missing: [
          {
            organizationId: "org-12345678",
            name: "Org 1",
            missingTypes: ["c_int", "custom_type"],
            totalMissing: 2,
          },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ParametresPage />);
    await user.click(screen.getByText("Configuration"));
    expect(
      screen.getByText("1 organisation avec des parametres manquants."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cout interne")).toBeInTheDocument();
    expect(screen.getByText("custom_type")).toBeInTheDocument();
  });

  it("ParametresPage config section shows loading skeleton", async () => {
    const user = userEvent.setup();
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ParametresPage />);
    await user.click(screen.getByText("Configuration"));
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("ParametresPage config section shows error", async () => {
    const user = userEvent.setup();
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Cost params error",
      refetch: vi.fn(),
    });

    render(<ParametresPage />);
    await user.click(screen.getByText("Configuration"));
    expect(screen.getByText("Cost params error")).toBeInTheDocument();
  });
});
