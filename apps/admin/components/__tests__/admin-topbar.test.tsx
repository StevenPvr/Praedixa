import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminTopbar } from "../admin-topbar";

vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Menu: () => <span data-testid="icon-menu" />,
  X: () => <span data-testid="icon-x" />,
}));

describe("AdminTopbar", () => {
  it("renders the Admin breadcrumb prefix", () => {
    render(<AdminTopbar mobileOpen={false} onToggleMobile={vi.fn()} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders page title when provided", () => {
    render(
      <AdminTopbar
        mobileOpen={false}
        onToggleMobile={vi.fn()}
        title="Dashboard"
      />,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("does not render title or separator when title is undefined", () => {
    const { container } = render(
      <AdminTopbar mobileOpen={false} onToggleMobile={vi.fn()} />,
    );
    // No "/" separator should appear
    expect(container.textContent).not.toContain("/");
  });

  it("shows menu icon when mobile is closed", () => {
    render(<AdminTopbar mobileOpen={false} onToggleMobile={vi.fn()} />);
    expect(screen.getByTestId("icon-menu")).toBeInTheDocument();
    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("shows X icon when mobile is open", () => {
    render(<AdminTopbar mobileOpen={true} onToggleMobile={vi.fn()} />);
    expect(screen.getByTestId("icon-x")).toBeInTheDocument();
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();
  });

  it("calls onToggleMobile when hamburger is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<AdminTopbar mobileOpen={false} onToggleMobile={onToggle} />);

    await user.click(screen.getByLabelText("Ouvrir le menu"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders admin avatar placeholder", () => {
    render(<AdminTopbar mobileOpen={false} onToggleMobile={vi.fn()} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders as a header element", () => {
    render(<AdminTopbar mobileOpen={false} onToggleMobile={vi.fn()} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
