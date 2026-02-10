import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ─── Mock state ──────────────────────────── */

const mockSignInWithPassword = vi.fn();
const mockGetValidAccessToken = vi.fn();
let mockSearchParams = new URLSearchParams();

let mockAuthError: { message: string } | null = null;

const originalLocation = window.location;

function setMockError(error: { message: string } | null) {
  mockAuthError = error;
}

function resetMocks() {
  mockSignInWithPassword.mockReset();
  mockSignInWithPassword.mockImplementation(() =>
    Promise.resolve({
      data: mockAuthError
        ? { user: null, session: null }
        : { user: { id: "u1", email: "test@example.com" }, session: {} },
      error: mockAuthError,
    }),
  );
  mockGetValidAccessToken.mockReset();
  mockGetValidAccessToken.mockResolvedValue("test-token");
  mockSearchParams = new URLSearchParams();
  mockAuthError = null;
}

/* ─── Mocks ───────────────────────────────── */

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/login",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/auth/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
  getValidAccessToken: () => mockGetValidAccessToken(),
}));

/* ─── Import after mocks ──────────────────── */

import LoginPage from "../page";

/* ─── Tests ───────────────────────────────── */

describe("LoginPage", () => {
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

  /* ─── Rendering ─────────────────────────── */

  describe("rendering", () => {
    it("renders the subtitle text", () => {
      render(<LoginPage />);
      expect(
        screen.getByText("Connectez-vous a votre espace"),
      ).toBeInTheDocument();
    });

    it("renders the email input with correct attributes", () => {
      render(<LoginPage />);
      const emailInput = screen.getByLabelText("Email");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("autocomplete", "email");
      expect(emailInput).toBeRequired();
    });

    it("renders the password input with correct attributes", () => {
      render(<LoginPage />);
      const passwordInput = screen.getByLabelText("Mot de passe");
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
      expect(passwordInput).toBeRequired();
    });

    it("renders the submit button with correct text", () => {
      render(<LoginPage />);
      expect(
        screen.getByRole("button", { name: "Se connecter" }),
      ).toBeInTheDocument();
    });

    it("does not render the reauth banner when query param is absent", () => {
      render(<LoginPage />);
      expect(
        screen.queryByText(
          "Session expiree ou droits insuffisants. Veuillez vous reconnecter.",
        ),
      ).not.toBeInTheDocument();
    });

    it("renders the reauth banner when reauth=1", () => {
      mockSearchParams = new URLSearchParams("reauth=1");
      render(<LoginPage />);
      expect(
        screen.getByText(
          "Session expiree ou droits insuffisants. Veuillez vous reconnecter.",
        ),
      ).toBeInTheDocument();
    });
  });

  /* ─── Form interaction ──────────────────── */

  describe("form interaction", () => {
    it("updates email field on user input", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "test@example.com");
      expect(emailInput).toHaveValue("test@example.com");
    });

    it("updates password field on user input", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText("Mot de passe");
      await user.type(passwordInput, "secret123");
      expect(passwordInput).toHaveValue("secret123");
    });
  });

  /* ─── Form submission ───────────────────── */

  describe("form submission", () => {
    it("calls signInWithPassword with email and password on submit", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Mot de passe"), "secret123");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "secret123",
        });
      });
    });

    it("navigates to /dashboard via hard redirect on successful login", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Mot de passe"), "password");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => {
        expect(window.location.href).toBe("/dashboard");
      });
    });

    it("displays error message on failed login", async () => {
      const user = userEvent.setup();
      setMockError({ message: "Invalid login credentials" });
      // Re-apply the mock implementation after setting the error
      mockSignInWithPassword.mockImplementationOnce(() =>
        Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        }),
      );
      render(<LoginPage />);

      await user.type(screen.getByLabelText("Email"), "bad@example.com");
      await user.type(screen.getByLabelText("Mot de passe"), "wrong");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => {
        expect(
          screen.getByText("Invalid login credentials"),
        ).toBeInTheDocument();
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      // Make signIn hang to observe loading state
      mockSignInWithPassword.mockImplementationOnce(
        () => new Promise(() => {}),
      );
      render(<LoginPage />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Mot de passe"), "password");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => {
        expect(screen.getByText("Connexion...")).toBeInTheDocument();
        expect(screen.getByRole("button")).toBeDisabled();
      });
    });

    it("does not navigate when login fails", async () => {
      const user = userEvent.setup();
      mockSignInWithPassword.mockImplementationOnce(() =>
        Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        }),
      );
      render(<LoginPage />);

      await user.type(screen.getByLabelText("Email"), "bad@example.com");
      await user.type(screen.getByLabelText("Mot de passe"), "wrong");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => {
        expect(window.location.href).toBe("");
      });
    });

    it("shows invalid session error and does not navigate when token is missing", async () => {
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
      });
      expect(window.location.href).toBe("");
    });

    it("shows generic error and resets loading when exception is thrown", async () => {
      const user = userEvent.setup();
      mockSignInWithPassword.mockRejectedValueOnce(
        new Error("Network failure"),
      );
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
});
