import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockUseApiGet = vi.fn();
const mockUseApiGetPaginated = vi.fn();
const mockUseApiPost = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
let mockPermissions = [
  "admin:onboarding:read",
  "admin:onboarding:write",
  "admin:monitoring:read",
  "admin:org:write",
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
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
  useCurrentUserState: () => ({
    user: {
      permissions: mockPermissions,
    },
    loading: false,
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
    DataTable: ({
      columns,
      data,
    }: {
      columns: Array<{
        key: string;
        label: string;
        render?: (row: Record<string, unknown>) => ReactNode;
      }>;
      data: Record<string, unknown>[];
    }) => (
      <div data-testid="data-table">
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
        {data.map((row, rowIndex) => (
          <div key={`${String(row.id ?? rowIndex)}-${rowIndex}`}>
            {columns.map((column) => (
              <div key={`${column.key}-${rowIndex}`}>
                {column.render
                  ? column.render(row)
                  : String(row[column.key] ?? "")}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
    SkeletonCard: () => <div data-testid="skeleton-card" />,
    StatCard: ({ label, value }: { label: string; value: string }) => (
      <div>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    ),
  };
});

import ParametresPage from "../page";

const baseCase = {
  id: "case-1",
  organizationId: "org-1",
  organizationName: "Acme Logistics",
  organizationSlug: "acme-logistics",
  status: "blocked",
  phase: "source_activation",
  activationMode: "shadow",
  environmentTarget: "sandbox",
  dataResidencyRegion: "fr-par",
  subscriptionModules: ["connectors"],
  selectedPacks: ["coverage"],
  sourceModes: ["api"],
  lastReadinessStatus: "blocked",
  lastReadinessScore: 0,
  openTaskCount: 4,
  openBlockerCount: 2,
  ownerUserId: null,
  sponsorUserId: null,
  startedAt: "2026-03-18T10:00:00.000Z",
  targetGoLiveAt: null,
  closedAt: null,
  process: {
    workflowProvider: "camunda",
    processDefinitionKey: "client-onboarding-v1",
    processDefinitionVersion: 1,
    processInstanceKey: "proc-1",
  },
};

describe("ParametresPage create client flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = [
      "admin:onboarding:read",
      "admin:onboarding:write",
      "admin:monitoring:read",
      "admin:org:write",
    ];

    mockUseApiGetPaginated.mockReturnValue({
      data: [baseCase],
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
      data: { totalOrgsWithMissing: 0, totalMissingParams: 0, orgs: [] },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("creates a client from settings onboarding and redirects to its workspace", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Nouvel acteur",
      slug: "nouvel-acteur",
      status: "trial",
      plan: "free",
      contactEmail: "ops@nouvel-acteur.fr",
      isTest: true,
      userCount: 0,
      siteCount: 0,
      createdAt: "2026-03-18T11:00:00.000Z",
    }));

    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<ParametresPage />);

    await user.type(screen.getByLabelText("Nom"), "Nouvel acteur");
    await user.type(screen.getByLabelText("Slug"), "nouvel-acteur");
    await user.type(
      screen.getByLabelText("Email contact"),
      "ops@nouvel-acteur.fr",
    );
    await user.click(screen.getByLabelText(/Marquer comme client test/i));
    await user.click(screen.getByRole("button", { name: "Creer le client" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({
        name: "Nouvel acteur",
        slug: "nouvel-acteur",
        contactEmail: "ops@nouvel-acteur.fr",
        isTest: true,
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Client test cree, invitation d'activation initialisee, preuve provider en attente, puis ouverture de l'onboarding",
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/clients/22222222-2222-4222-8222-222222222222/onboarding",
    );
  });

  it("keeps the create client card visible for org writers without monitoring or onboarding access", () => {
    mockPermissions = ["admin:org:write"];

    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<ParametresPage />);

    expect(screen.getByText("Creer un client")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Creer le client" }),
    ).toBeInTheDocument();
  });

  it("surfaces the backend create-client error toast when the mutation fails", async () => {
    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(async () => null),
      loading: false,
      error: "An organization with this slug already exists",
      data: null,
      reset: vi.fn(),
    });

    render(<ParametresPage />);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "An organization with this slug already exists",
      ),
    );
  });

  it("keeps the onboarding table renderable when a case has no phase yet", () => {
    const legacyCase = {
      ...baseCase,
      id: "case-legacy",
      phase: undefined,
    } as unknown as typeof baseCase;

    mockUseApiGetPaginated.mockReturnValue({
      data: [legacyCase],
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

    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<ParametresPage />);

    expect(screen.getByText("Non renseignée")).toBeInTheDocument();
  });
});
