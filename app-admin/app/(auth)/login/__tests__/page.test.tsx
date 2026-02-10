import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignInWithPassword = vi.fn();
const mockGetValidAccessToken = vi.fn();

let mockSearchParams = new URLSearchParams();

const originalLocation = window.location;

function resetMocks() {
  mockSignInWithPassword.mockReset();
  mockSignInWithPassword.mockResolvedValue({
    data: { user: { id: "u1", email: "test@example.com" }, session: {} },
    error: null,
  });
  mockGetValidAccessToken.mockReset();
  mockGetValidAccessToken.mockResolvedValue("test-token");
  mockSearchParams = new URLSearchParams();
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/auth/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
  getValidAccessToken: (...args: unknown[]) => mockGetValidAccessToken(...args),
}));

import LoginPage from "../page";

describe("Admin LoginPage", () => {
  beforeEach(() => {
    resetMocks();
    // Replace window.location with a writable mock so we can assert on href
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renders admin subtitle", () => {
    render(<LoginPage />);
    expect(screen.getByText("Espace administration")).toBeInTheDocument();
  });

  it("renders reauth banner when reauth=1", () => {
    mockSearchParams = new URLSearchParams("reauth=1");
    render(<LoginPage />);

    expect(
      screen.getByText(/Session expiree ou droits insuffisants/),
    ).toBeInTheDocument();
  });

  it("submits credentials and navigates via hard redirect", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password",
      });
      expect(window.location.href).toBe("/");
    });
  });

  it("shows auth error when signIn fails", async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "bad@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "wrong");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
      expect(window.location.href).toBe("");
    });
  });

  it("shows session error when token retrieval fails", async () => {
    const user = userEvent.setup();
    mockGetValidAccessToken.mockResolvedValueOnce(null);

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(
        screen.getByText("Session invalide. Veuillez reessayer."),
      ).toBeInTheDocument();
      expect(window.location.href).toBe("");
    });
  });

  it("shows generic error and resets loading when exception is thrown", async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockRejectedValueOnce(new Error("Network failure"));

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(
        screen.getByText("Erreur de connexion. Veuillez reessayer."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Se connecter" }),
      ).not.toBeDisabled();
    });
  });
});
