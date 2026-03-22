import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockSearchParams = new URLSearchParams();

const originalLocation = window.location;
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

import LoginPage from "../page";
import AuthLayout from "../../layout";

describe("Admin LoginPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn(),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
    mockSearchParams = new URLSearchParams(
      `error=oidc_provider_untrusted&provider_retry_at=${Date.now()}`,
    );
    render(<LoginPage />);

    expect(
      screen.getByText(/Le fournisseur OIDC est non fiable ou mal configure/),
    ).toBeInTheDocument();
  });

  it("auto-retries login once when the stale OIDC provider error is already recovered", async () => {
    mockSearchParams = new URLSearchParams(
      "error=oidc_provider_untrusted&next=/",
    );
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ healthy: true }),
    });

    render(<LoginPage />);

    expect(
      screen.getByText(/Verification du fournisseur OIDC en cours/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Le fournisseur OIDC est non fiable ou mal configure/),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/auth/provider-status", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      const redirected = new URL(window.location.href);
      expect(redirected.pathname).toBe("/auth/login");
      expect(redirected.searchParams.get("next")).toBe("/");
      expect(redirected.searchParams.get("provider_retry_at")).toMatch(/^\d+$/);
    });
  });

  it("suppresses auto-retry for a very recent provider retry marker", () => {
    mockSearchParams = new URLSearchParams(
      `error=oidc_provider_untrusted&next=/&provider_retry_at=${Date.now()}`,
    );
    render(<LoginPage />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("retries again once the provider retry marker is old enough", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "http://localhost:3002");
    mockSearchParams = new URLSearchParams(
      `error=oidc_provider_untrusted&next=/&provider_retry_at=${Date.now() - 20_000}`,
    );
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "", origin: "http://127.0.0.1:3002" },
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ healthy: true }),
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(window.location.href).toContain(
        "http://localhost:3002/auth/login?next=%2F",
      );
    });
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

  it("prefers NEXT_PUBLIC_APP_ORIGIN when the current tab uses a loopback alias", async () => {
    const user = userEvent.setup();
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "http://localhost:3002");
    mockSearchParams = new URLSearchParams("next=/");
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "", origin: "http://127.0.0.1:3002" },
    });

    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    );

    expect(window.location.href).toBe(
      "http://localhost:3002/auth/login?next=%2F",
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
