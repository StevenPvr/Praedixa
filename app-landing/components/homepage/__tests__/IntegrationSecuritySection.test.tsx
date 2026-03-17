import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntegrationSecuritySection } from "../IntegrationSecuritySection";

describe("IntegrationSecuritySection", () => {
  it("renders with id='integration' and dark bg-[#121925] variant", () => {
    const { container } = render(<IntegrationSecuritySection locale="fr" />);

    const section = container.querySelector("#integration");
    expect(section).toBeInTheDocument();
    expect(section).toHaveClass("bg-[#121925]");
  });

  it("renders the section heading", () => {
    render(<IntegrationSecuritySection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Branché au-dessus de l.existant, pas à la place/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the kicker text", () => {
    render(<IntegrationSecuritySection locale="fr" />);

    expect(screen.getByText("Intégration & sécurité")).toBeInTheDocument();
  });

  it("renders 6 control cards each with 'Contrôle actif' badge", () => {
    render(<IntegrationSecuritySection locale="fr" />);

    const badges = screen.getAllByText("Contrôle actif");
    expect(badges).toHaveLength(6);
  });

  it("renders all 6 control card titles", () => {
    render(<IntegrationSecuritySection locale="fr" />);

    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
    expect(screen.getByText("Données agrégées")).toBeInTheDocument();
    expect(screen.getByText("Hébergement France")).toBeInTheDocument();
    expect(screen.getByText("NDA dès J1")).toBeInTheDocument();
    expect(screen.getByText("Audit trail complet")).toBeInTheDocument();
    expect(screen.getByText("Connecteurs standards")).toBeInTheDocument();
  });

  it("renders all stack chips in the ribbon", () => {
    render(<IntegrationSecuritySection locale="fr" />);

    const stackItems = [
      "Planning",
      "ERP",
      "CRM",
      "BI",
      "Excel",
      "CSV",
      "API REST",
    ];
    for (const item of stackItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
});
