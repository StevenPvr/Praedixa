import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const originalLocation = window.location;
const fetchMock = vi.fn();
const assignMock = vi.fn();

import LoginPage from "../page";
import AuthLayout from "../../layout";

async function renderLoginPage(searchParams?: Record<string, string>) {
  render(
    await LoginPage({ searchParams: Promise.resolve(searchParams ?? {}) }),
  );
}

describe("Admin LoginPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    assignMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn(),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        origin: "https://admin.praedixa.com",
        assign: assignMock,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders admin login header", async () => {
    render(
      <AuthLayout>
        {await LoginPage({ searchParams: Promise.resolve({}) })}
      </AuthLayout>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Connexion securisee")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuer vers la connexion" }),
    ).toBeInTheDocument();
  });

  it("renders reauth banner when reauth=1", async () => {
    await renderLoginPage({ reauth: "1" });

    expect(
      screen.getByText(/Session expiree ou droits insuffisants/),
    ).toBeInTheDocument();
  });

  it("renders auth error banner", async () => {
    await renderLoginPage({ error: "auth_callback_failed" });

    expect(screen.getByText(/La connexion a echoue/)).toBeInTheDocument();
  });

  it("renders explicit MFA-required banner", async () => {
    await renderLoginPage({ error: "admin_mfa_required" });

    expect(screen.getByText(/authentification MFA valide/)).toBeInTheDocument();
  });

  it("renders explicit missing OIDC config banner", async () => {
    await renderLoginPage({ error: "oidc_config_missing" });

    expect(
      screen.getByText(/Configuration OIDC manquante en local/),
    ).toBeInTheDocument();
  });

  it("renders explicit untrusted OIDC provider banner", async () => {
    await renderLoginPage({
      error: "oidc_provider_untrusted",
      provider_retry_at: String(Date.now()),
    });

    expect(
      screen.getByText(/Le fournisseur OIDC est non fiable ou mal configure/),
    ).toBeInTheDocument();
  });

  it("auto-retries login once when the stale OIDC provider error is already recovered", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ healthy: true }),
    });

    await renderLoginPage({
      error: "oidc_provider_untrusted",
      next: "/",
    });

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
      const redirected = new URL(assignMock.mock.calls.at(-1)?.[0] ?? "");
      expect(redirected.pathname).toBe("/auth/login");
      expect(redirected.searchParams.get("next")).toBe("/");
    });
  });

  it("suppresses auto-retry for a very recent provider retry marker", async () => {
    await renderLoginPage({
      error: "oidc_provider_untrusted",
      next: "/",
      provider_retry_at: String(Date.now()),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("retries again once the provider retry marker is old enough", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ healthy: true }),
    });

    await renderLoginPage({
      error: "oidc_provider_untrusted",
      next: "/",
      provider_retry_at: String(Date.now() - 20_000),
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(assignMock.mock.calls.at(-1)?.[0]).toContain(
        "/auth/login?next=%2F",
      );
    });
  });

  it("posts to /auth/login with safe next path", async () => {
    await renderLoginPage({ next: "/clients" });

    const form = screen
      .getByRole("button", { name: "Continuer vers la connexion" })
      .closest("form");

    expect(form).toHaveAttribute("action", "/auth/login");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByDisplayValue("/clients")).toHaveAttribute(
      "name",
      "next",
    );
  });

  it("sanitizes unsafe next path and forwards prompt=login when reauth", async () => {
    await renderLoginPage({ next: "//evil.com", reauth: "1" });

    expect(screen.getByDisplayValue("/")).toHaveAttribute("name", "next");
    expect(screen.getByDisplayValue("login")).toHaveAttribute("name", "prompt");
  });
});
