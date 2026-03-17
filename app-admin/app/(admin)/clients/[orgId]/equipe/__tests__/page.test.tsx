/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseApiGet = vi.fn();
const mockUseApiPost = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

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
    permissions: ["admin:users:read", "admin:users:write"],
  }),
}));

vi.mock("../../client-context", () => ({
  useClientContext: () => ({
    orgId: "org-1",
    orgName: "Test Org",
    selectedSiteId: null,
    setSelectedSiteId: vi.fn(),
    hierarchy: [
      {
        id: "site-lyon",
        name: "Lyon",
        city: "Lyon",
        departments: [],
      },
    ],
  }),
}));

vi.mock("@praedixa/ui", async () => {
  const actual = await vi.importActual<object>("@praedixa/ui");
  return {
    ...actual,
    SkeletonCard: () => (
      <div data-testid="skeleton-card" role="status" aria-label="Chargement" />
    ),
    DataTable: ({ data, columns }: any) => (
      <div data-testid="data-table">
        {data?.[0] &&
          columns?.map((col: any) => (
            <div key={col.key}>
              {col.render
                ? col.render(data[0])
                : String(data[0][col.key] ?? "")}
            </div>
          ))}
      </div>
    ),
    Button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  };
});

import EquipePage from "../page";

const mockUsers = [
  {
    id: "u-1",
    fullName: "Jean Dupont",
    email: "jean@acme.com",
    role: "org_admin",
    status: "active",
    siteName: "Lyon",
    lastLoginAt: "2026-01-20T10:00:00Z",
  },
];

describe("EquipePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: mockUsers,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseApiPost.mockReturnValue({
      mutate: vi.fn(async () => ({ success: true })),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it("renders heading and users table", () => {
    render(<EquipePage />);
    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("jean@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Admin Org")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("renders invite button and toggles form", async () => {
    const user = userEvent.setup();
    render(<EquipePage />);
    const inviteBtn = screen.getByRole("button", { name: /Creer un compte/i });
    expect(inviteBtn).toBeInTheDocument();

    await user.click(inviteBtn);
    expect(
      screen.getByPlaceholderText("nom@entreprise.com"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Creer" })).toBeInTheDocument();
  });

  it("sends invite and shows success toast", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({ success: true }));
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<EquipePage />);
    await user.click(screen.getByRole("button", { name: /Creer un compte/i }));
    await user.type(
      screen.getByPlaceholderText("nom@entreprise.com"),
      "new@acme.com",
    );
    await user.click(screen.getByRole("button", { name: "Creer" }));

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mockToastSuccess).toHaveBeenCalledWith("Invitation envoyee");
  });

  it("shows error toast when invite fails", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => null);
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<EquipePage />);
    await user.click(screen.getByRole("button", { name: /Creer un compte/i }));
    await user.type(
      screen.getByPlaceholderText("nom@entreprise.com"),
      "fail@acme.com",
    );
    await user.click(screen.getByRole("button", { name: "Creer" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Impossible de provisionner le compte",
      ),
    );
  });

  it("requires a site-scoped payload for manager invitations", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({ success: true }));
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<EquipePage />);
    await user.click(screen.getByRole("button", { name: /Creer un compte/i }));
    await user.type(
      screen.getByPlaceholderText("nom@entreprise.com"),
      "manager@acme.com",
    );
    await user.selectOptions(screen.getByDisplayValue("Lecteur"), "manager");
    await user.click(screen.getByRole("button", { name: "Creer" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({
        email: "manager@acme.com",
        role: "manager",
        site_id: "site-lyon",
      }),
    );
  });

  it("shows loading skeleton", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<EquipePage />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows error fallback", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Users error",
      refetch: vi.fn(),
    });
    render(<EquipePage />);
    expect(screen.getByText("Users error")).toBeInTheDocument();
  });

  it("renders deactivated user status", () => {
    mockUseApiGet.mockReturnValue({
      data: [{ ...mockUsers[0], status: "deactivated" }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<EquipePage />);
    expect(screen.getByText("Desactive")).toBeInTheDocument();
  });

  it("renders user with no lastLoginAt", () => {
    mockUseApiGet.mockReturnValue({
      data: [{ ...mockUsers[0], lastLoginAt: null }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<EquipePage />);
    expect(screen.getByText("Jamais")).toBeInTheDocument();
  });

  it("does not send invite when email is empty", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn(async () => ({ success: true }));
    mockUseApiPost.mockReturnValue({
      mutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<EquipePage />);
    await user.click(screen.getByRole("button", { name: /Creer un compte/i }));
    const sendBtn = screen.getByRole("button", { name: "Creer" });
    expect(sendBtn).toBeDisabled();
  });

  it("renders unknown role correctly", () => {
    mockUseApiGet.mockReturnValue({
      data: [{ ...mockUsers[0], role: "unknown_role" }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<EquipePage />);
    expect(screen.getByText("unknown_role")).toBeInTheDocument();
  });
});
