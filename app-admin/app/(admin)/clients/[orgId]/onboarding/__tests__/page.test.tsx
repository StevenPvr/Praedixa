/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseApiGet = vi.fn();
const mockUseApiGetPaginated = vi.fn();
const mockUseApiPost = vi.fn();
const mockApiPost = vi.fn();
const mockApiPostFormData = vi.fn();
const mockGetValidAccessToken = vi.fn();
const mockUseCurrentUserState = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock("@/lib/api/client", () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPostFormData: (...args: unknown[]) => mockApiPostFormData(...args),
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: (...args: unknown[]) => mockGetValidAccessToken(...args),
  useCurrentUserState: (...args: unknown[]) => mockUseCurrentUserState(...args),
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => ({
    orgId: "11111111-1111-4111-8111-111111111111",
    orgName: "Acme Logistics",
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
    StatCard: ({ label, value }: any) => (
      <div>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    ),
    Button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  };
});

import OnboardingPage from "../page";

const caseSummary = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organizationId: "11111111-1111-4111-8111-111111111111",
  organizationName: "Acme Logistics",
  organizationSlug: "acme-logistics",
  status: "blocked",
  phase: "source_activation",
  activationMode: "shadow",
  environmentTarget: "sandbox",
  dataResidencyRegion: "fr-par",
  subscriptionModules: ["control-tower", "connectors"],
  selectedPacks: ["coverage", "core"],
  sourceModes: ["api", "file"],
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

const caseBundle = {
  case: caseSummary,
  tasks: [
    {
      id: "task-1",
      caseId: caseSummary.id,
      taskKey: "activate-api-sources",
      title: "Activer les connecteurs API",
      domain: "sources",
      taskType: "integration_activation",
      status: "blocked",
      assigneeUserId: null,
      sortOrder: 40,
      dueAt: null,
      completedAt: null,
      detailsJson: {
        workflowTaskKey: "camunda-task-1",
      },
      createdAt: "2026-03-18T10:00:00.000Z",
      updatedAt: "2026-03-18T10:00:00.000Z",
    },
  ],
  blockers: [
    {
      id: "blocker-1",
      caseId: caseSummary.id,
      blockerKey: "sources-not-activated",
      title: "Aucune source critique n'a encore passe le cycle probe + sync",
      domain: "sources",
      severity: "critical",
      status: "open",
      detailsJson: {},
      openedAt: "2026-03-18T10:00:00.000Z",
      resolvedAt: null,
    },
  ],
  events: [
    {
      id: "event-1",
      caseId: caseSummary.id,
      actorUserId: null,
      eventType: "case_created",
      message: "Onboarding BPM case created",
      payloadJson: {},
      occurredAt: "2026-03-18T10:00:00.000Z",
    },
  ],
};

const accessModelBundle = {
  ...caseBundle,
  case: {
    ...caseSummary,
    phase: "access_setup",
  },
  tasks: [
    {
      id: "task-access",
      caseId: caseSummary.id,
      taskKey: "access-model",
      title: "Configurer le modele d'acces",
      domain: "access",
      taskType: "access_setup",
      status: "in_progress",
      assigneeUserId: null,
      sortOrder: 20,
      dueAt: null,
      completedAt: null,
      detailsJson: {
        workflowTaskKey: "camunda-access-1",
      },
      createdAt: "2026-03-18T10:00:00.000Z",
      updatedAt: "2026-03-18T10:00:00.000Z",
    },
  ],
};

const users = [
  {
    id: "user-1",
    fullName: "Alice Martin",
    email: "alice@acme.fr",
    role: "org_admin",
    status: "active",
    siteId: null,
    siteName: null,
  },
];

const integrationConnections = [
  {
    id: "conn-1",
    displayName: "Bella Vista Push",
    vendor: "custom_data",
  },
];

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPost.mockResolvedValue({ data: caseBundle });
    mockApiPostFormData.mockResolvedValue({
      data: { activation: null, bundle: caseBundle },
    });
    mockGetValidAccessToken.mockResolvedValue("token");
    mockUseCurrentUserState.mockReturnValue({
      user: {
        id: "admin-1",
        email: "admin@praedixa.com",
        role: "super_admin",
        permissions: [
          "admin:onboarding:read",
          "admin:onboarding:write",
          "admin:integrations:read",
          "admin:users:read",
          "admin:users:write",
        ],
        organizationId: null,
        siteId: null,
      },
      loading: false,
    });

    mockUseApiGetPaginated.mockReturnValue({
      data: [caseSummary],
      total: 1,
      pagination: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url?.includes("/users")) {
        return {
          data: users,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      if (url?.includes("/integrations/connections")) {
        return {
          data: integrationConnections,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      if (url?.includes(`/onboarding/cases/${caseSummary.id}`)) {
        return {
          data: caseBundle,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(async () => caseSummary),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it("renders the selected onboarding workspace", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Onboarding client")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sources" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Activer les sources API")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Aucune source critique n'a encore passe le cycle probe + sync",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Onboarding BPM case created")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Completer" }),
    ).toBeInTheDocument();
  });

  it("creates a new onboarding case from the workspace form", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({
      ...caseSummary,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    }));
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<OnboardingPage />);
    await user.click(
      screen.getByRole("button", {
        name: /Etape 1 Dossier/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Creer le dossier" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          activationMode: "shadow",
          environmentTarget: "sandbox",
          dataResidencyRegion: "fr-par",
          subscriptionModules: ["control-tower", "connectors"],
          selectedPacks: ["coverage", "core"],
          sourceModes: ["api", "file"],
        }),
      ),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Case onboarding cree");
  });

  it("completes an actionable onboarding task from the workspace", async () => {
    const user = userEvent.setup();

    render(<OnboardingPage />);
    await user.click(screen.getByRole("button", { name: "Completer" }));

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/task-1/complete"),
        { note: null, payloadJson: {} },
        expect.any(Function),
      ),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Tache onboarding completee");
  });

  it("activates an API source from the onboarding workspace", async () => {
    const user = userEvent.setup();

    render(<OnboardingPage />);
    await user.selectOptions(screen.getByLabelText("Connexion API"), "conn-1");
    await user.click(
      screen.getByRole("button", { name: "Tester et lancer la premiere sync" }),
    );

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/task-1/api-sources/activate"),
        { connectionId: "conn-1" },
        expect.any(Function),
      ),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Source API activee et premier cycle lance",
    );
  });

  it("uploads a CSV source from the onboarding workspace", async () => {
    const user = userEvent.setup();
    const fileBundle = {
      ...caseBundle,
      tasks: [
        {
          ...caseBundle.tasks[0],
          id: "task-file-1",
          taskKey: "configure-file-sources",
          title: "Configurer les imports fichiers",
        },
      ],
    };

    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url?.includes("/users")) {
        return {
          data: users,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      if (url?.includes("/integrations/connections")) {
        return {
          data: integrationConnections,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      if (url?.includes(`/onboarding/cases/${caseSummary.id}`)) {
        return {
          data: fileBundle,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    render(<OnboardingPage />);

    await user.type(
      screen.getByLabelText("Libelle de la source"),
      "Planning Mars",
    );
    await user.type(screen.getByLabelText("Domaine"), "planning");
    await user.type(
      screen.getByLabelText("Cle du jeu de donnees"),
      "planning_shifts",
    );
    await user.type(
      screen.getByLabelText("Profil d'import"),
      "restaurant_shifts",
    );

    const file = new File(
      ["employee_id;shift_start\n1;2026-03-22T09:00:00Z"],
      "planning.csv",
      {
        type: "text/csv",
      },
    );

    await user.upload(
      screen.getByLabelText("Selectionner un CSV, TSV ou XLSX source"),
      file,
    );

    await waitFor(() =>
      expect(mockApiPostFormData).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/task-file-1/file-sources/upload"),
        expect.any(FormData),
        expect.any(Function),
      ),
    );

    const formData = mockApiPostFormData.mock.calls[0]?.[1] as FormData;
    expect(formData.get("label")).toBe("Planning Mars");
    expect(formData.get("domain")).toBe("planning");
    expect(formData.get("datasetKey")).toBe("planning_shifts");
    expect(formData.get("importProfile")).toBe("restaurant_shifts");
    expect(formData.get("file")).toBe(file);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Fichier source charge et pipeline bronze declenche",
    );
  });

  it("sends secure onboarding invitations without exposing a password", async () => {
    const user = userEvent.setup();
    mockApiPost
      .mockResolvedValueOnce({
        data: {
          id: "user-2",
          email: "owner@acme.fr",
          role: "org_admin",
          status: "pending_invite",
          invitedAt: "2026-03-19T09:00:00.000Z",
          siteId: null,
          siteName: null,
        },
      })
      .mockResolvedValueOnce({ data: accessModelBundle });

    mockUseApiGet.mockImplementation((url: string | null) => {
      if (url?.includes("/users")) {
        return {
          data: users,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      if (url?.includes(`/onboarding/cases/${caseSummary.id}`)) {
        return {
          data: accessModelBundle,
          loading: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      return {
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    render(<OnboardingPage />);

    await user.type(
      screen.getByPlaceholderText("nom@entreprise.com"),
      "owner@acme.fr",
    );
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await user.click(
      screen.getByRole("button", {
        name: "Envoyer invitations securisees",
      }),
    );

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenNthCalledWith(
        1,
        "/api/v1/admin/organizations/11111111-1111-4111-8111-111111111111/users/invite",
        {
          email: "owner@acme.fr",
          role: "viewer",
        },
        expect.any(Function),
      ),
    );

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/tasks/task-access/save"),
        expect.objectContaining({
          payloadJson: expect.objectContaining({
            invitationsReady: true,
            invitationDelivery: "activation_link",
            invitationChannel: "keycloak_execute_actions_email",
            passwordHandling: "client_sets_password",
            invitedRecipientCount: 1,
            inviteRecipients: [
              expect.objectContaining({
                email: "owner@acme.fr",
                status: "sent",
                invitedUserId: "user-2",
              }),
            ],
          }),
        }),
        expect.any(Function),
      ),
    );

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Invitations securisees initialisees",
    );
  });

  it("recomputes onboarding readiness from the workspace actions", async () => {
    const user = userEvent.setup();

    render(<OnboardingPage />);
    await user.click(screen.getByRole("button", { name: "Recalculer" }));

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining("/readiness/recompute"),
        {},
        expect.any(Function),
      ),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Readiness onboarding recalculee",
    );
  });

  it("shows an error fallback when case listing fails", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      loading: false,
      error: "Onboarding list failed",
      refetch: vi.fn(),
    });

    render(<OnboardingPage />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByText("Onboarding list failed")).toBeInTheDocument();
  });

  it("does not fetch org users when the profile lacks admin:users permissions", async () => {
    const user = userEvent.setup();
    mockUseCurrentUserState.mockReturnValue({
      user: {
        id: "admin-1",
        email: "admin@praedixa.com",
        role: "super_admin",
        permissions: ["admin:onboarding:read", "admin:onboarding:write"],
        organizationId: null,
        siteId: null,
      },
      loading: false,
    });

    render(<OnboardingPage />);

    await user.click(
      screen.getByRole("button", {
        name: /Etape 1 Dossier/i,
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /Le profil courant ne peut pas charger les comptes client/,
        ),
      ).toBeInTheDocument(),
    );
    expect(
      mockUseApiGet.mock.calls.some(
        ([url]) => typeof url === "string" && url.includes("/users"),
      ),
    ).toBe(false);
  });

  it("surfaces the backend onboarding-case error toast when the mutation fails", async () => {
    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(async () => null),
      loading: false,
      error: "Camunda onboarding runtime is unavailable",
      data: null,
      reset: vi.fn(),
    });

    render(<OnboardingPage />);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Camunda onboarding runtime is unavailable",
      ),
    );
  });
});
