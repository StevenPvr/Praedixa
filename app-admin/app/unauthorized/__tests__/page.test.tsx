import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/praedixa-logo", () => ({
  PraedixaLogo: () => <div data-testid="praedixa-logo" />,
}));

import UnauthorizedPage from "../page";

describe("UnauthorizedPage", () => {
  it("renders message and reconnect link", () => {
    render(<UnauthorizedPage />);

    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
    expect(screen.getByText("Acces non autorise")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Se reconnecter" }),
    ).toHaveAttribute("href", "/login?reauth=1");
  });
});
