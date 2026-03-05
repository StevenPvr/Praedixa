import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../sidebar";

vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

vi.mock("../praedixa-logo", () => ({
  PraedixaLogo: (props: Record<string, unknown>) => (
    <svg data-testid="praedixa-logo" {...props} />
  ),
}));

const LABELS: Record<string, string> = {
  "sidebar.items.dashboard": "Accueil",
  "sidebar.items.previsions": "Previsions",
  "sidebar.items.actions": "Actions",
  "sidebar.items.messages": "Support",
  "sidebar.items.parametres": "Reglages",
  "appShell.closeMenu": "Fermer la navigation",
};

vi.mock("@/lib/i18n/provider", () => ({
  useI18n: () => ({
    t: (key: string) => LABELS[key] ?? key,
  }),
}));

describe("Sidebar", () => {
  it("renders branding", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" />);
    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
  });

  it("renders the current navigation items", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" />);

    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previsions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Support" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reglages" })).toBeInTheDocument();
  });

  it("marks current route as active", () => {
    render(<Sidebar currentPath="/actions" userRole="manager" />);
    const active = screen.getByRole("link", { name: "Actions" });
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("calls toggle callback", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <Sidebar
        currentPath="/dashboard"
        userRole="admin"
        onToggleCollapse={onToggle}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Fermer la navigation/i }),
    );
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
