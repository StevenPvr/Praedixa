import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockSearchParams = new URLSearchParams();

const originalLocation = window.location;

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

import LoginPage from "../page";

describe("LoginPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "", origin: "https://app.praedixa.com" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renders OIDC login content", () => {
    render(<LoginPage />);

    expect(screen.getByText("Client access")).toBeInTheDocument();
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
    mockSearchParams = new URLSearchParams("error=wrong_role");
    render(<LoginPage />);

    expect(
      screen.getByText(/La connexion a echoue \(wrong_role\)/),
    ).toBeInTheDocument();
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

  it("redirects to /auth/login with explicit safe next path", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("next=/previsions");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    );

    expect(window.location.href).toBe(
      "https://app.praedixa.com/auth/login?next=%2Fprevisions",
    );
  });

  it("sanitizes unsafe next path and appends prompt=login when reauth", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("next=//evil.com&reauth=1");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    );

    const redirected = new URL(window.location.href);
    expect(redirected.pathname).toBe("/auth/login");
    expect(redirected.searchParams.get("next")).toBe("/dashboard");
    expect(redirected.searchParams.get("prompt")).toBe("login");
  });
});
