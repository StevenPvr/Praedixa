import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../sidebar";

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

vi.mock("../praedixa-logo", () => ({
  PraedixaLogo: (props: Record<string, unknown>) => (
    <svg data-testid="praedixa-logo" {...props} />
  ),
}));

describe("Sidebar", () => {
  it("renders branding", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" />);
    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
  });

  it("renders grouped headings and labels", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" />);
    expect(screen.getByText("Pilotage")).toBeInTheDocument();
    expect(screen.getByText("Donnees")).toBeInTheDocument();
    expect(screen.getAllByText("Anticipation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Traitement").length).toBeGreaterThan(0);
    expect(screen.getByText("Support & gouvernance")).toBeInTheDocument();

    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("Donnees operationnelles")).toBeInTheDocument();
    expect(screen.getAllByText("Traitement").length).toBeGreaterThan(0);
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("hides admin-only settings for non-admin roles", () => {
    render(<Sidebar currentPath="/dashboard" userRole="viewer" />);
    expect(screen.queryByText("Reglages")).not.toBeInTheDocument();
  });

  it("marks current route as active", () => {
    render(<Sidebar currentPath="/actions" userRole="manager" />);
    const active = screen.getByRole("link", { name: "Traitement" });
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("renders unread badge on support entry", () => {
    render(
      <Sidebar currentPath="/dashboard" userRole="admin" unreadCount={4} />,
    );
    expect(screen.getByLabelText("4 notifications")).toBeInTheDocument();
  });

  it("renders priority badge on actions entry", () => {
    render(
      <Sidebar currentPath="/dashboard" userRole="admin" priorityCount={7} />,
    );
    expect(screen.getByLabelText("7 notifications")).toBeInTheDocument();
  });

  it("collapses labels in collapsed mode", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" collapsed />);
    expect(screen.queryByText("Pilotage")).not.toBeInTheDocument();
    expect(screen.queryByText("Tableau de bord")).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: /Reduire le menu/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
