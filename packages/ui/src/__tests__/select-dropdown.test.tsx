import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { SelectDropdown } from "../components/select-dropdown";
import type { SelectOption } from "../components/select-dropdown";

const options: SelectOption[] = [
  { value: "fr", label: "France" },
  { value: "be", label: "Belgique" },
  { value: "ch", label: "Suisse", disabled: true },
];

describe("SelectDropdown", () => {
  it("renders a select element", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders all options", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("Belgique")).toBeInTheDocument();
    expect(screen.getByText("Suisse")).toBeInTheDocument();
  });

  it("has correct selected value", () => {
    render(<SelectDropdown options={options} value="be" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("be");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<SelectDropdown options={options} value="fr" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "be" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("be");
  });

  it("renders placeholder option when provided", () => {
    render(
      <SelectDropdown
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Choisir un pays"
      />,
    );
    expect(screen.getByText("Choisir un pays")).toBeInTheDocument();
  });

  it("placeholder option is disabled", () => {
    render(
      <SelectDropdown
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Choisir un pays"
      />,
    );
    const placeholder = screen.getByText(
      "Choisir un pays",
    ) as HTMLOptionElement;
    expect(placeholder.disabled).toBe(true);
  });

  it("does not render placeholder when not provided", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    const allOptions = screen.getAllByRole("option");
    expect(allOptions).toHaveLength(3);
  });

  it("renders label when provided", () => {
    render(
      <SelectDropdown
        options={options}
        value="fr"
        onChange={() => {}}
        label="Pays"
      />,
    );
    expect(screen.getByText("Pays")).toBeInTheDocument();
  });

  it("does not render label when not provided", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    expect(screen.queryByText("Pays")).not.toBeInTheDocument();
  });

  it("disables select when disabled prop is true", () => {
    render(
      <SelectDropdown
        options={options}
        value="fr"
        onChange={() => {}}
        disabled
      />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("is not disabled by default", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("disables individual options", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    const suisse = screen.getByText("Suisse") as HTMLOptionElement;
    expect(suisse.disabled).toBe(true);
  });

  it("merges custom className", () => {
    render(
      <SelectDropdown
        options={options}
        value="fr"
        onChange={() => {}}
        className="my-custom"
        data-testid="wrapper"
      />,
    );
    expect(screen.getByTestId("wrapper")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SelectDropdown
        ref={ref}
        options={options}
        value="fr"
        onChange={() => {}}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders chevron icon", () => {
    render(<SelectDropdown options={options} value="fr" onChange={() => {}} />);
    // SVG with aria-hidden for the chevron
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
  });
});
