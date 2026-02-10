import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("DevenirPilotePage", () => {
  let DevenirPilotePage: React.ComponentType;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../page");
    DevenirPilotePage = mod.default;
  });

  // ── Step 1: Company ─────────────────────────────────────────────────

  describe("Step 1 — Company name", () => {
    it("should render the initial form with company name input", () => {
      render(<DevenirPilotePage />);
      expect(
        screen.getByText("Rejoignez le programme pilote"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Ex: Logistique Express"),
      ).toBeInTheDocument();
    });

    it("should render the pilot benefits cards", () => {
      render(<DevenirPilotePage />);
      expect(
        screen.getByText("Partenariat de co-construction"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Premiers résultats en jours"),
      ).toBeInTheDocument();
    });

    it("should display the Continuer button disabled when company name is empty", () => {
      render(<DevenirPilotePage />);
      const btn = screen.getByRole("button", { name: /continuer/i });
      expect(btn).toBeDisabled();
    });

    it("should enable the Continuer button when company name is filled", () => {
      render(<DevenirPilotePage />);
      const input = screen.getByPlaceholderText("Ex: Logistique Express");
      fireEvent.change(input, { target: { value: "ACME" } });
      const btn = screen.getByRole("button", { name: /continuer/i });
      expect(btn).not.toBeDisabled();
    });

    it("should advance to step 2 when form is submitted", () => {
      render(<DevenirPilotePage />);
      const input = screen.getByPlaceholderText("Ex: Logistique Express");
      fireEvent.change(input, { target: { value: "ACME" } });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      expect(screen.getByText("Comment vous contacter ?")).toBeInTheDocument();
    });
  });

  // ── Step 2: Contact ─────────────────────────────────────────────────

  describe("Step 2 — Contact info", () => {
    function goToStep2() {
      render(<DevenirPilotePage />);
      fireEvent.change(screen.getByPlaceholderText("Ex: Logistique Express"), {
        target: { value: "ACME" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
    }

    it("should render email and phone inputs", () => {
      goToStep2();
      expect(
        screen.getByPlaceholderText("vous@entreprise.com"),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("06 12 34 56 78")).toBeInTheDocument();
    });

    it("should have a back button that returns to step 1", () => {
      goToStep2();
      fireEvent.click(screen.getByText("Retour"));
      expect(
        screen.getByPlaceholderText("Ex: Logistique Express"),
      ).toBeInTheDocument();
    });

    it("should advance to step 3 when email is provided", () => {
      goToStep2();
      fireEvent.change(screen.getByPlaceholderText("vous@entreprise.com"), {
        target: { value: "jean@acme.fr" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      expect(screen.getByText(/Combien de salariés/)).toBeInTheDocument();
    });

    it("should update honeypot website field value on change", () => {
      goToStep2();
      // The honeypot is aria-hidden, so we find it by the input name attribute
      const honeypot = document.querySelector(
        'input[name="website"]',
      ) as HTMLInputElement;
      expect(honeypot).not.toBeNull();
      // fireEvent.change triggers React onChange on controlled inputs
      fireEvent.change(honeypot, { target: { value: "bot-value" } });
      // After onChange, React re-renders with the new state value
      const updated = document.querySelector(
        'input[name="website"]',
      ) as HTMLInputElement;
      expect(updated.value).toBe("bot-value");
    });
  });

  // ── Step 3: Employees ───────────────────────────────────────────────

  describe("Step 3 — Employee range", () => {
    function goToStep3() {
      render(<DevenirPilotePage />);
      fireEvent.change(screen.getByPlaceholderText("Ex: Logistique Express"), {
        target: { value: "ACME" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      fireEvent.change(screen.getByPlaceholderText("vous@entreprise.com"), {
        target: { value: "jean@acme.fr" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
    }

    it("should display all employee range options", () => {
      goToStep3();
      expect(screen.getByText("50-100")).toBeInTheDocument();
      expect(screen.getByText("100-250")).toBeInTheDocument();
      expect(screen.getByText("250-500")).toBeInTheDocument();
      expect(screen.getByText("500-1 000")).toBeInTheDocument();
      expect(screen.getByText("1 000+")).toBeInTheDocument();
    });

    it("should display the company name in the heading", () => {
      goToStep3();
      expect(screen.getByText("ACME")).toBeInTheDocument();
    });

    it("should advance to step 4 when a range is selected", () => {
      goToStep3();
      fireEvent.click(screen.getByText("100-250"));
      expect(
        screen.getByText("Dans quel secteur opérez-vous ?"),
      ).toBeInTheDocument();
    });

    it("should go back to contact step when clicking Retour", () => {
      goToStep3();
      fireEvent.click(screen.getByText("Retour"));
      expect(
        screen.getByPlaceholderText("vous@entreprise.com"),
      ).toBeInTheDocument();
    });
  });

  // ── Step 4: Sector ──────────────────────────────────────────────────

  describe("Step 4 — Sector", () => {
    function goToStep4() {
      render(<DevenirPilotePage />);
      fireEvent.change(screen.getByPlaceholderText("Ex: Logistique Express"), {
        target: { value: "ACME" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      fireEvent.change(screen.getByPlaceholderText("vous@entreprise.com"), {
        target: { value: "jean@acme.fr" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      fireEvent.click(screen.getByText("100-250"));
    }

    it("should display all sector options", () => {
      goToStep4();
      expect(screen.getByText("Logistique")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
      expect(screen.getByText("Santé")).toBeInTheDocument();
      expect(screen.getByText("Industrie")).toBeInTheDocument();
      expect(screen.getByText("Distribution")).toBeInTheDocument();
      expect(screen.getByText("Agroalimentaire")).toBeInTheDocument();
      expect(screen.getByText("BTP")).toBeInTheDocument();
      expect(screen.getByText("Autre")).toBeInTheDocument();
    });

    it("should advance to confirmation step when a sector is selected", () => {
      goToStep4();
      fireEvent.click(screen.getByText("Logistique"));
      expect(screen.getByText("Vérifiez vos informations")).toBeInTheDocument();
    });

    it("should go back to employees step when clicking Retour", () => {
      goToStep4();
      fireEvent.click(screen.getByText("Retour"));
      expect(screen.getByText(/Combien de salariés/)).toBeInTheDocument();
    });
  });

  // ── Step 5: Confirmation ────────────────────────────────────────────

  describe("Step 5 — Confirmation", () => {
    function goToConfirmation() {
      render(<DevenirPilotePage />);
      fireEvent.change(screen.getByPlaceholderText("Ex: Logistique Express"), {
        target: { value: "ACME" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      fireEvent.change(screen.getByPlaceholderText("vous@entreprise.com"), {
        target: { value: "jean@acme.fr" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      fireEvent.click(screen.getByText("100-250"));
      fireEvent.click(screen.getByText("Logistique"));
    }

    it("should display a summary with all entered data", () => {
      goToConfirmation();
      expect(screen.getByText("ACME")).toBeInTheDocument();
      expect(screen.getByText("jean@acme.fr")).toBeInTheDocument();
      expect(screen.getByText("Logistique")).toBeInTheDocument();
    });

    it("should display phone number in summary when provided", () => {
      render(<DevenirPilotePage />);
      // Step 1
      fireEvent.change(screen.getByPlaceholderText("Ex: Logistique Express"), {
        target: { value: "ACME" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      // Step 2 — fill email AND phone
      fireEvent.change(screen.getByPlaceholderText("vous@entreprise.com"), {
        target: { value: "jean@acme.fr" },
      });
      fireEvent.change(screen.getByPlaceholderText("06 12 34 56 78"), {
        target: { value: "06 98 76 54 32" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      // Step 3 — select employee range
      fireEvent.click(screen.getByText("100-250"));
      // Step 4 — select sector
      fireEvent.click(screen.getByText("Logistique"));
      // Confirmation — should see the phone
      expect(screen.getByText("Téléphone")).toBeInTheDocument();
      expect(screen.getByText("06 98 76 54 32")).toBeInTheDocument();
    });

    it("should go back to sector step when clicking Retour", () => {
      goToConfirmation();
      fireEvent.click(screen.getByText("Retour"));
      expect(
        screen.getByText("Dans quel secteur opérez-vous ?"),
      ).toBeInTheDocument();
    });

    it("should disable the submit button until consent is checked", () => {
      goToConfirmation();
      const submitBtn = screen.getByRole("button", {
        name: /envoyer ma candidature/i,
      });
      expect(submitBtn).toBeDisabled();
    });

    it("should enable the submit button when consent is checked", () => {
      goToConfirmation();
      // The checkbox is sr-only, find it by role
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      const submitBtn = screen.getByRole("button", {
        name: /envoyer ma candidature/i,
      });
      expect(submitBtn).not.toBeDisabled();
    });

    it("should show success step after successful submission", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }),
      ) as unknown as typeof fetch;

      goToConfirmation();
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(
        screen.getByRole("button", { name: /envoyer ma candidature/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Candidature envoyée !")).toBeInTheDocument();
      });
    });

    it("should show error message when submission fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "server error" }),
        }),
      ) as unknown as typeof fetch;

      goToConfirmation();
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(
        screen.getByRole("button", { name: /envoyer ma candidature/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Une erreur est survenue. Veuillez réessayer."),
        ).toBeInTheDocument();
      });
    });

    it("should show error when fetch throws (network error)", async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error("Network error")),
      ) as unknown as typeof fetch;

      goToConfirmation();
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(
        screen.getByRole("button", { name: /envoyer ma candidature/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Une erreur est survenue. Veuillez réessayer."),
        ).toBeInTheDocument();
      });
    });
  });

  // ── Navigation ──────────────────────────────────────────────────────

  describe("navigation", () => {
    it("should have a link back to the homepage in the nav", () => {
      render(<DevenirPilotePage />);
      const homeLink = screen.getByText("Retour au site");
      expect(homeLink.closest("a")).toHaveAttribute("href", "/");
    });

    it("should render the Praedixa logo", () => {
      render(<DevenirPilotePage />);
      expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
    });
  });

  // ── Progress indicator ──────────────────────────────────────────────

  describe("progress indicator", () => {
    it("should display 5 step indicators on initial render", () => {
      render(<DevenirPilotePage />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });
  });
});
