import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DevenirPiloteLayout, { metadata } from "../layout";

describe("DevenirPiloteLayout", () => {
  it("renders children directly (passthrough layout)", () => {
    render(
      <DevenirPiloteLayout>
        <div data-testid="form-content">Pilot form</div>
      </DevenirPiloteLayout>,
    );
    expect(screen.getByTestId("form-content")).toBeInTheDocument();
  });

  it("exports correct metadata title", () => {
    expect(metadata.title).toContain("Cohorte");
    expect(metadata.title).toContain("pilote");
  });

  it("exports metadata description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it("has canonical URL for devenir-pilote", () => {
    expect(metadata.alternates?.canonical).toBe("/devenir-pilote");
  });

  it("has openGraph metadata", () => {
    expect(metadata.openGraph).toBeDefined();
  });
});
