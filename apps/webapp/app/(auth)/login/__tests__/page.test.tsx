import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ─── Mock state ──────────────────────────── */

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignInWithPassword = vi.fn();

let mockAuthError: { message: string } | null = null;

function setMockError(error: { message: string } | null) {
  mockAuthError = error;
}

function resetMocks() {
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockSignInWithPassword.mockReset();
  mockSignInWithPassword.mockImplementation(() =>
    Promise.resolve({
      data: mockAuthError
        ? { user: null, session: null }
        : { user: { id: "u1", email: "test@example.com" }, session: {} },
      error: mockAuthError,
    }),
  );
  mockAuthError = null;
}

/* ─── Mocks ───────────────────────────────── */

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: mockRefresh,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

/* ─── Import after mocks ──────────────────── */

import LoginPage from "../page";

/* ─── Tests ───────────────────────────────── */

describe("LoginPage", () => {
  beforeEach(() => {
    resetMocks();
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

    it("navigates to /dashboard on successful login", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Mot de passe"), "password");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
        expect(mockRefresh).toHaveBeenCalled();
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
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });
});
