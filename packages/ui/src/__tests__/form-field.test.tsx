import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { FormField } from "../components/form-field";

describe("FormField", () => {
  it("renders label", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders children (input)", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" data-testid="input" />
      </FormField>,
    );
    expect(screen.getByTestId("input")).toBeInTheDocument();
  });

  it("associates label with htmlFor", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", "email");
  });

  it("shows asterisk for required fields", () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not show asterisk when not required", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("shows error message", () => {
    render(
      <FormField label="Email" htmlFor="email" error="Champ obligatoire">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("Champ obligatoire")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not render error when not provided", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows hint text", () => {
    render(
      <FormField label="Email" htmlFor="email" hint="Adresse professionnelle">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("Adresse professionnelle")).toBeInTheDocument();
  });

  it("has proper error id for accessibility", () => {
    render(
      <FormField label="Email" htmlFor="email" error="Erreur">
        <input id="email" />
      </FormField>,
    );
    const errorEl = screen.getByRole("alert");
    expect(errorEl).toHaveAttribute("id", "email-error");
  });

  it("has proper hint id for accessibility", () => {
    render(
      <FormField label="Email" htmlFor="email" hint="Mon hint">
        <input id="email" />
      </FormField>,
    );
    const hintEl = screen.getByText("Mon hint");
    expect(hintEl).toHaveAttribute("id", "email-hint");
  });

  it("sets aria-describedby with error and hint", () => {
    render(
      <FormField label="Email" htmlFor="email" error="Erreur" hint="Mon hint">
        <input id="email" />
      </FormField>,
    );
    // The div wrapping children should have aria-describedby
    const wrapper = screen
      .getByRole("alert")
      .parentElement?.querySelector("[aria-describedby]");
    expect(wrapper).toHaveAttribute(
      "aria-describedby",
      "email-error email-hint",
    );
  });

  it("merges custom className", () => {
    render(
      <FormField
        label="Email"
        htmlFor="email"
        className="my-custom"
        data-testid="field"
      >
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByTestId("field")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FormField ref={ref} label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies error text styling", () => {
    render(
      <FormField label="Email" htmlFor="email" error="Erreur">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByRole("alert")).toHaveClass("text-red-500");
  });

  it("marks asterisk as aria-hidden", () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <input id="email" />
      </FormField>,
    );
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });
});
