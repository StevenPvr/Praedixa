import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockSearchParams = new URLSearchParams();

const originalLocation = window.location;

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

import LoginPage from "../page";
import AuthLayout from "../../layout";

describe("Admin LoginPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "", origin: "https://admin.praedixa.com" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renders admin login header", () => {
    render(
      <AuthLayout>
        <LoginPage />
      </AuthLayout>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Connexion securisee")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeInTheDocument();
  });

  it("renders reauth banner when reauth=1", () => {
    mockSearchParams = new URLSearchParams("reauth=1");
    render(<LoginPage />);

    expect(
      screen.getByText(/Session expiree ou droits insuffisants/),
    ).toBeInTheDocument();
  });

  it("renders auth error banner", () => {
    mockSearchParams = new URLSearchParams("error=auth_callback_failed");
    render(<LoginPage />);

    expect(screen.getByText(/La connexion a echoue/)).toBeInTheDocument();
  });

  it("renders explicit MFA-required banner", () => {
    mockSearchParams = new URLSearchParams("error=admin_mfa_required");
    render(<LoginPage />);

    expect(screen.getByText(/authentification MFA valide/)).toBeInTheDocument();
  });

  it("renders explicit missing OIDC config banner", () => {
    mockSearchParams = new URLSearchParams("error=oidc_config_missing");
    render(<LoginPage />);

    expect(
      screen.getByText(/Configuration OIDC manquante en local/),
    ).toBeInTheDocument();
  });

  it("renders explicit untrusted OIDC provider banner", () => {
    mockSearchParams = new URLSearchParams("error=oidc_provider_untrusted");
    render(<LoginPage />);

    expect(
      screen.getByText(/Le fournisseur OIDC est non fiable ou mal configure/),
    ).toBeInTheDocument();
  });

  it("redirects to /auth/login with safe next path", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("next=/clients");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    );

    expect(window.location.href).toBe(
      "https://admin.praedixa.com/auth/login?next=%2Fclients",
    );
  });

  it("sanitizes unsafe next path and forwards prompt=login when reauth", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("next=//evil.com&reauth=1");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    );

    const redirected = new URL(window.location.href);
    expect(redirected.pathname).toBe("/auth/login");
    expect(redirected.searchParams.get("next")).toBe("/");
    expect(redirected.searchParams.get("prompt")).toBe("login");
  });
});
