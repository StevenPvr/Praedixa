import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

vi.mock("../../../components/logo/PraedixaLogo", () => ({
  PraedixaLogo: () => <svg data-testid="praedixa-logo" />,
}));

describe("DevenirPilotePage", () => {
  let DevenirPilotePage: React.ComponentType;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../page");
    DevenirPilotePage = mod.default;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the premium pilot application form", () => {
    render(<DevenirPilotePage />);

    expect(screen.getByText("Candidature pilote premium")).toBeInTheDocument();
    expect(screen.getByLabelText(/Entreprise/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email professionnel/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de sites/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Envoyer ma candidature/i }),
    ).toBeDisabled();
  });

  it("enables submission once all required fields and consent are provided", () => {
    render(<DevenirPilotePage />);

    fillRequiredFields();
    const submitButton = screen.getByRole("button", {
      name: /Envoyer ma candidature/i,
    });

    expect(submitButton).not.toBeDisabled();
  });

  it("submits form and shows success state", async () => {
    render(<DevenirPilotePage />);

    fillRequiredFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Envoyer ma candidature/i }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/pilot-application",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Candidature transmise")).toBeInTheDocument();
    });
  });

  it("shows API error message when submission fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Erreur API" }),
      }),
    );

    render(<DevenirPilotePage />);
    fillRequiredFields();

    fireEvent.click(
      screen.getByRole("button", { name: /Envoyer ma candidature/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Erreur API")).toBeInTheDocument();
    });
  });

  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText(/Entreprise/), {
      target: { value: "Groupe Atlas" },
    });
    fireEvent.change(screen.getByLabelText(/^Secteur/), {
      target: { value: "Logistique" },
    });
    fireEvent.change(screen.getByLabelText(/Effectif/), {
      target: { value: "250-500" },
    });
    fireEvent.change(screen.getByLabelText(/Nombre de sites/), {
      target: { value: "4-10" },
    });

    fireEvent.change(screen.getByLabelText(/Prénom/), {
      target: { value: "Camille" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Nom/ }), {
      target: { value: "Durand" },
    });
    fireEvent.change(screen.getByLabelText(/Fonction/), {
      target: { value: "COO / Direction des opérations" },
    });
    fireEvent.change(screen.getByLabelText(/Email professionnel/), {
      target: { value: "camille@atlas.fr" },
    });

    fireEvent.change(screen.getByLabelText(/Horizon projet/), {
      target: { value: "0-3 mois" },
    });
    fireEvent.change(
      screen.getByLabelText(/Quel est votre principal enjeu de couverture/),
      {
        target: {
          value:
            "Nous subissons des pics de charge non anticipés sur plusieurs sites.",
        },
      },
    );

    fireEvent.click(screen.getByRole("checkbox"));
  }
});
