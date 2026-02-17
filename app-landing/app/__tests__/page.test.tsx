import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import RootLanguageSelectorPage, { metadata } from "../page";

describe("root language selector page", () => {
  it("renders both language entry points", () => {
    render(<RootLanguageSelectorPage />);

    expect(
      screen.getByText("Continuer en français").closest("a"),
    ).toHaveAttribute("href", "/fr");
    expect(
      screen.getByText("Continue in English").closest("a"),
    ).toHaveAttribute("href", "/en");
  });

  it("exposes alternates with x-default", () => {
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.alternates?.languages?.["fr-FR"]).toBe("/fr");
    expect(metadata.alternates?.languages?.en).toBe("/en");
    expect(metadata.alternates?.languages?.["x-default"]).toBe("/");
  });
});
