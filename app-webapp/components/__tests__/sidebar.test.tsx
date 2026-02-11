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
  it("renders branding and default site label", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" />);
    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
    expect(screen.getByText("Tous les sites")).toBeInTheDocument();
  });

  it("renders grouped IA headings and labels", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" />);
    expect(screen.getByText("Pilotage")).toBeInTheDocument();
    expect(screen.getByText("Decider")).toBeInTheDocument();
    expect(screen.getByText("Collaborer")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument();
    expect(screen.getByText("Analyse")).toBeInTheDocument();
    expect(screen.getByText("File de decision")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("shows priority card linked to actions", () => {
    render(
      <Sidebar currentPath="/dashboard" userRole="admin" priorityCount={7} />,
    );
    const link = screen.getByRole("link", {
      name: /Ouvrir la file de decision/i,
    });
    expect(link).toHaveAttribute("href", "/actions");
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("hides admin-only settings for non-admin roles", () => {
    render(<Sidebar currentPath="/dashboard" userRole="viewer" />);
    expect(screen.queryByText("Parametres")).not.toBeInTheDocument();
  });

  it("marks current route as active", () => {
    render(<Sidebar currentPath="/actions" userRole="manager" />);
    const active = screen.getByText("File de decision").closest("a");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("renders unread badge on support entry", () => {
    render(
      <Sidebar currentPath="/dashboard" userRole="admin" unreadCount={4} />,
    );
    expect(screen.getByLabelText("4 messages non lus")).toBeInTheDocument();
  });

  it("collapses labels and priority card in collapsed mode", () => {
    render(<Sidebar currentPath="/dashboard" userRole="admin" collapsed />);
    expect(screen.queryByText("Pilotage")).not.toBeInTheDocument();
    expect(screen.queryByText("Priorite du jour")).not.toBeInTheDocument();
    expect(screen.queryByText("Vue d'ensemble")).not.toBeInTheDocument();
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
