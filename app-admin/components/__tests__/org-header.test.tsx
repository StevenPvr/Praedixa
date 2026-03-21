import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrgHeader } from "../org-header";

vi.mock("@praedixa/ui", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/plan-badge", () => ({
  PlanBadge: ({ plan }: { plan: string }) => (
    <span data-testid="plan-badge">{plan}</span>
  ),
}));

vi.mock("@/components/org-status-badge", () => ({
  OrgStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

describe("OrgHeader", () => {
  it("renders org name", () => {
    render(<OrgHeader name="Acme Corp" />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders plan and status badges when provided", () => {
    render(<OrgHeader name="Acme Corp" plan="professional" status="active" />);
    expect(screen.getByTestId("plan-badge")).toHaveTextContent("professional");
    expect(screen.getByTestId("status-badge")).toHaveTextContent("active");
  });

  it("renders the test client badge when requested", () => {
    render(<OrgHeader name="Acme Corp" isTest />);
    expect(screen.getByText("Client test")).toBeInTheDocument();
  });

  it("shows suspend button for active orgs", () => {
    render(<OrgHeader name="Acme Corp" status="active" onSuspend={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Suspendre" }),
    ).toBeInTheDocument();
  });

  it("shows reactivate button for suspended orgs", () => {
    render(
      <OrgHeader name="Acme Corp" status="suspended" onReactivate={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Reactiver" }),
    ).toBeInTheDocument();
  });

  it("calls onSuspend when clicking suspend", async () => {
    const user = userEvent.setup();
    const onSuspend = vi.fn();
    render(
      <OrgHeader name="Acme Corp" status="active" onSuspend={onSuspend} />,
    );
    await user.click(screen.getByRole("button", { name: "Suspendre" }));
    expect(onSuspend).toHaveBeenCalledTimes(1);
  });

  it("shows change plan button when handler provided", () => {
    render(<OrgHeader name="Acme Corp" onChangePlan={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Changer plan" }),
    ).toBeInTheDocument();
  });
});
