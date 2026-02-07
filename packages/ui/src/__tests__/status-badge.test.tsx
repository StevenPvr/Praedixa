import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { StatusBadge, statusBadgeVariants } from "../components/status-badge";

describe("StatusBadge", () => {
  it("renders label text", () => {
    render(<StatusBadge label="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<StatusBadge data-testid="badge" label="Active" />);
    expect(screen.getByTestId("badge").tagName).toBe("SPAN");
  });

  it("renders colored dot with aria-hidden", () => {
    render(
      <StatusBadge data-testid="badge" label="Active" variant="success" />,
    );
    const dot = screen.getByTestId("badge").querySelector("span[aria-hidden]");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  describe("variant styles", () => {
    it("applies success variant", () => {
      render(<StatusBadge data-testid="badge" label="OK" variant="success" />);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-success-50", "text-success-700");
      const dot = badge.querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("bg-success-500");
    });

    it("applies warning variant", () => {
      render(
        <StatusBadge data-testid="badge" label="Warn" variant="warning" />,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-warning-50", "text-warning-700");
      const dot = badge.querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("bg-warning-500");
    });

    it("applies danger variant", () => {
      render(
        <StatusBadge data-testid="badge" label="Error" variant="danger" />,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-danger-50", "text-danger-700");
      const dot = badge.querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("bg-danger-500");
    });

    it("applies info variant", () => {
      render(<StatusBadge data-testid="badge" label="Info" variant="info" />);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-blue-50", "text-blue-700");
      const dot = badge.querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("bg-blue-500");
    });

    it("applies neutral variant (default)", () => {
      render(<StatusBadge data-testid="badge" label="Unknown" />);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-gray-100", "text-gray-600");
      const dot = badge.querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("bg-gray-400");
    });

    it("defaults to neutral when variant is not specified", () => {
      render(<StatusBadge data-testid="badge" label="Default" />);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-gray-100");
    });
  });

  describe("size variants", () => {
    it("applies medium size by default", () => {
      render(<StatusBadge data-testid="badge" label="M" />);
      expect(screen.getByTestId("badge")).toHaveClass("text-sm");
    });

    it("applies small size", () => {
      render(<StatusBadge data-testid="badge" label="S" size="sm" />);
      expect(screen.getByTestId("badge")).toHaveClass("text-xs");
    });

    it("applies small dot for sm size", () => {
      render(<StatusBadge data-testid="badge" label="S" size="sm" />);
      const dot = screen
        .getByTestId("badge")
        .querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("h-1.5", "w-1.5");
    });

    it("applies larger dot for md size (default)", () => {
      render(<StatusBadge data-testid="badge" label="M" size="md" />);
      const dot = screen
        .getByTestId("badge")
        .querySelector("span[aria-hidden]");
      expect(dot).toHaveClass("h-2", "w-2");
    });
  });

  it("merges custom className", () => {
    render(
      <StatusBadge data-testid="badge" label="Custom" className="my-class" />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("my-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<StatusBadge ref={ref} label="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it("passes through additional props", () => {
    render(<StatusBadge data-testid="badge" label="Props" id="sb-1" />);
    expect(screen.getByTestId("badge")).toHaveAttribute("id", "sb-1");
  });

  it("applies base classes", () => {
    render(<StatusBadge data-testid="badge" label="Base" />);
    expect(screen.getByTestId("badge")).toHaveClass(
      "inline-flex",
      "items-center",
      "rounded-full",
      "font-medium",
    );
  });
});

describe("statusBadgeVariants", () => {
  it("is a callable function (CVA output)", () => {
    expect(typeof statusBadgeVariants).toBe("function");
  });

  it("returns classes for success variant", () => {
    const classes = statusBadgeVariants({ variant: "success" });
    expect(classes).toContain("bg-success-50");
  });
});
