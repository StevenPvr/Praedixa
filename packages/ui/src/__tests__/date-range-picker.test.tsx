import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { DateRangePicker } from "../components/date-range-picker";
import type { DateRange } from "../components/date-range-picker";

const defaultValue: DateRange = { from: "2025-01-01", to: "2025-01-31" };

describe("DateRangePicker", () => {
  it("renders two date inputs", () => {
    render(<DateRangePicker value={defaultValue} onChange={() => {}} />);
    const inputs = screen.getAllByDisplayValue(/2025/);
    expect(inputs).toHaveLength(2);
  });

  it("renders Du and Au labels", () => {
    render(<DateRangePicker value={defaultValue} onChange={() => {}} />);
    expect(screen.getByText("Du")).toBeInTheDocument();
    expect(screen.getByText("Au")).toBeInTheDocument();
  });

  it("displays current from value", () => {
    render(<DateRangePicker value={defaultValue} onChange={() => {}} />);
    expect(screen.getByDisplayValue("2025-01-01")).toBeInTheDocument();
  });

  it("displays current to value", () => {
    render(<DateRangePicker value={defaultValue} onChange={() => {}} />);
    expect(screen.getByDisplayValue("2025-01-31")).toBeInTheDocument();
  });

  it("calls onChange when from date changes", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={defaultValue} onChange={onChange} />);
    const fromInput = screen.getByDisplayValue("2025-01-01");
    fireEvent.change(fromInput, { target: { value: "2025-01-15" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      from: "2025-01-15",
      to: "2025-01-31",
    });
  });

  it("calls onChange when to date changes", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={defaultValue} onChange={onChange} />);
    const toInput = screen.getByDisplayValue("2025-01-31");
    fireEvent.change(toInput, { target: { value: "2025-02-15" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      from: "2025-01-01",
      to: "2025-02-15",
    });
  });

  it("adjusts to when from exceeds to", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={defaultValue} onChange={onChange} />);
    const fromInput = screen.getByDisplayValue("2025-01-01");
    fireEvent.change(fromInput, { target: { value: "2025-02-15" } });
    expect(onChange).toHaveBeenCalledWith({
      from: "2025-02-15",
      to: "2025-02-15",
    });
  });

  it("adjusts from when to is before from", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={defaultValue} onChange={onChange} />);
    const toInput = screen.getByDisplayValue("2025-01-31");
    fireEvent.change(toInput, { target: { value: "2024-12-01" } });
    expect(onChange).toHaveBeenCalledWith({
      from: "2024-12-01",
      to: "2024-12-01",
    });
  });

  it("applies minDate to both inputs", () => {
    render(
      <DateRangePicker
        value={defaultValue}
        onChange={() => {}}
        minDate="2024-01-01"
      />,
    );
    const inputs = screen.getAllByDisplayValue(/2025/);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute("min", "2024-01-01");
    });
  });

  it("applies maxDate to both inputs", () => {
    render(
      <DateRangePicker
        value={defaultValue}
        onChange={() => {}}
        maxDate="2026-12-31"
      />,
    );
    const inputs = screen.getAllByDisplayValue(/2025/);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute("max", "2026-12-31");
    });
  });

  it("merges custom className", () => {
    render(
      <DateRangePicker
        value={defaultValue}
        onChange={() => {}}
        className="my-custom"
        data-testid="picker"
      />,
    );
    expect(screen.getByTestId("picker")).toHaveClass("my-custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DateRangePicker ref={ref} value={defaultValue} onChange={() => {}} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders date inputs with type=date", () => {
    render(<DateRangePicker value={defaultValue} onChange={() => {}} />);
    const fromInput = screen.getByDisplayValue("2025-01-01");
    const toInput = screen.getByDisplayValue("2025-01-31");
    expect(fromInput).toHaveAttribute("type", "date");
    expect(toInput).toHaveAttribute("type", "date");
  });

  it("has proper labels with htmlFor", () => {
    render(<DateRangePicker value={defaultValue} onChange={() => {}} />);
    const duLabel = screen.getByText("Du");
    const auLabel = screen.getByText("Au");
    expect(duLabel).toHaveAttribute("for", "date-range-from");
    expect(auLabel).toHaveAttribute("for", "date-range-to");
  });
});
