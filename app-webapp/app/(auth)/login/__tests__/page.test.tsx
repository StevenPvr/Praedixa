import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import LoginPage from "../page";

async function renderLoginPage(searchParams?: Record<string, string>) {
  render(
    await LoginPage({ searchParams: Promise.resolve(searchParams ?? {}) }),
  );
}

describe("LoginPage", () => {
  it("renders OIDC login content", async () => {
    await renderLoginPage();

    expect(screen.getByText("Client access")).toBeInTheDocument();
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

  it("renders API reauth context and support reference", async () => {
    await renderLoginPage({
      reauth: "1",
      reason: "api_unauthorized",
      error_code: "UNAUTHORIZED",
      request_id: "req-1234",
    });

    expect(
      screen.getByText(/l'API a refuse ce token\. Veuillez vous reconnecter\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/code UNAUTHORIZED · incident req-1234/),
    ).toBeInTheDocument();
  });

  it("renders auth error banner", async () => {
    await renderLoginPage({ error: "wrong_role" });

    expect(
      screen.getByText(/Ce compte super admin doit utiliser la console admin/),
    ).toBeInTheDocument();
  });

  it("renders explicit invalid claims banner", async () => {
    await renderLoginPage({
      error: "auth_claims_invalid",
      token_reason: "missing_role",
    });

    expect(
      screen.getByText(
        /token d'acces ne porte pas encore le contrat canonique/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/`role`/)).toBeInTheDocument();
    expect(screen.getByText(/missing_role/)).toBeInTheDocument();
  });

  it("renders explicit missing OIDC config banner", async () => {
    await renderLoginPage({ error: "oidc_config_missing" });

    expect(
      screen.getByText(/Configuration OIDC invalide\./),
    ).toBeInTheDocument();
  });

  it("renders explicit untrusted OIDC provider banner", async () => {
    await renderLoginPage({ error: "oidc_provider_untrusted" });

    expect(
      screen.getByText(/Le fournisseur OIDC est non fiable ou mal configure/),
    ).toBeInTheDocument();
  });

  it("renders explicit insecure OIDC session secret banner", async () => {
    await renderLoginPage({ error: "oidc_config_insecure" });

    expect(
      screen.getByText(/Le secret de session OIDC est trop faible/),
    ).toBeInTheDocument();
  });

  it("posts to /auth/login with explicit safe next path", async () => {
    await renderLoginPage({ next: "/previsions" });

    const form = screen
      .getByRole("button", { name: "Continuer vers la connexion" })
      .closest("form");

    expect(form).toHaveAttribute("action", "/auth/login");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByDisplayValue("/previsions")).toHaveAttribute(
      "name",
      "next",
    );
  });

  it("sanitizes unsafe next path and appends prompt=login when reauth", async () => {
    await renderLoginPage({ next: "//evil.com", reauth: "1" });

    expect(screen.getByDisplayValue("/dashboard")).toHaveAttribute(
      "name",
      "next",
    );
    expect(screen.getByDisplayValue("login")).toHaveAttribute("name", "prompt");
  });
});
