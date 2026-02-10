import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../components/praedixa-logo", () => ({
  PraedixaLogo: (props: Record<string, unknown>) => (
    <svg data-testid="praedixa-logo" {...props} />
  ),
}));

import AuthLayout from "../layout";

describe("AuthLayout", () => {
  it("renders children", () => {
    render(
      <AuthLayout>
        <div data-testid="child">Login form</div>
      </AuthLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("shows the Praedixa brand heading", () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>,
    );
    expect(
      screen.getByRole("heading", { name: "Praedixa" }),
    ).toBeInTheDocument();
  });

  it("renders the PraedixaLogo SVG", () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>,
    );
    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
  });

  it("has centered layout with card container", () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>,
    );
    // Check centering classes on root div
    const root = container.firstElementChild;
    expect(root?.className).toContain("flex");
    expect(root?.className).toContain("min-h-screen");
    expect(root?.className).toContain("items-center");
    expect(root?.className).toContain("justify-center");
  });
});
