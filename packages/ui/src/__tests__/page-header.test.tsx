import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { PageHeader } from "../components/page-header";

describe("PageHeader", () => {
  it("renders the title as h1", () => {
    render(<PageHeader title="Dashboard" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Dashboard");
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="Dashboard" subtitle="Overview of metrics" />);
    expect(screen.getByText("Overview of metrics")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    // No <p> for subtitle
    expect(container.querySelector("p.mt-1")).not.toBeInTheDocument();
  });

  it("renders actions slot when provided", () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={<button data-testid="action-btn">Export</button>}
      />,
    );
    expect(screen.getByTestId("action-btn")).toBeInTheDocument();
  });

  it("does not render actions container when not provided", () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelector(".shrink-0")).not.toBeInTheDocument();
  });

  describe("breadcrumbs", () => {
    it("renders breadcrumb nav when breadcrumbs are provided", () => {
      render(
        <PageHeader
          title="Users"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Users" }]}
        />,
      );
      expect(screen.getByLabelText("Fil d'Ariane")).toBeInTheDocument();
    });

    it("does not render breadcrumbs when not provided", () => {
      render(<PageHeader title="Dashboard" />);
      expect(screen.queryByLabelText("Fil d'Ariane")).not.toBeInTheDocument();
    });

    it("does not render breadcrumbs when array is empty", () => {
      render(<PageHeader title="Dashboard" breadcrumbs={[]} />);
      expect(screen.queryByLabelText("Fil d'Ariane")).not.toBeInTheDocument();
    });

    it("renders breadcrumb links for non-last items with href", () => {
      render(
        <PageHeader
          title="Edit User"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Users", href: "/users" },
            { label: "Edit User" },
          ]}
        />,
      );
      const homeLink = screen.getByRole("link", { name: "Home" });
      expect(homeLink).toHaveAttribute("href", "/");
      const usersLink = screen.getByRole("link", { name: "Users" });
      expect(usersLink).toHaveAttribute("href", "/users");
    });

    it("renders last breadcrumb as span (not a link) with aria-current", () => {
      render(
        <PageHeader
          title="User List"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Users" }]}
        />,
      );
      const lastCrumb = screen.getByText("Users");
      expect(lastCrumb.tagName).toBe("SPAN");
      expect(lastCrumb).toHaveAttribute("aria-current", "page");
    });

    it("renders separators between breadcrumb items (not before first)", () => {
      const { container } = render(
        <PageHeader
          title="Page"
          breadcrumbs={[
            { label: "A", href: "/" },
            { label: "B", href: "/b" },
            { label: "C" },
          ]}
        />,
      );
      // Separators are SVGs within li elements
      const separators = container.querySelectorAll("nav li svg");
      // First item has no separator, items 2 and 3 have separators
      expect(separators).toHaveLength(2);
    });

    it("renders breadcrumb without href as span (non-last)", () => {
      render(
        <PageHeader
          title="Page"
          breadcrumbs={[{ label: "No Link" }, { label: "Current" }]}
        />,
      );
      // "No Link" is not a link (no href) and not last, so it's a span without aria-current
      const noLink = screen.getByText("No Link");
      expect(noLink.tagName).toBe("SPAN");
      expect(noLink).not.toHaveAttribute("aria-current");
    });

    it("last item with href is still rendered as span (not a link)", () => {
      render(
        <PageHeader
          title="Page"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Current", href: "/current" },
          ]}
        />,
      );
      // Last item should be a span with aria-current=page, even if href is provided
      const current = screen.getByText("Current");
      expect(current.tagName).toBe("SPAN");
      expect(current).toHaveAttribute("aria-current", "page");
    });

    it("single breadcrumb renders without separator", () => {
      const { container } = render(
        <PageHeader title="Page" breadcrumbs={[{ label: "Home" }]} />,
      );
      const separators = container.querySelectorAll("nav li svg");
      expect(separators).toHaveLength(0);
    });
  });

  it("applies default mb-8 class", () => {
    render(<PageHeader data-testid="header" title="Page" />);
    expect(screen.getByTestId("header")).toHaveClass("mb-8");
  });

  it("merges custom className", () => {
    render(
      <PageHeader data-testid="header" title="Page" className="my-custom" />,
    );
    const header = screen.getByTestId("header");
    expect(header).toHaveClass("my-custom");
    expect(header).toHaveClass("mb-8");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PageHeader ref={ref} title="Page" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional props", () => {
    render(<PageHeader data-testid="header" title="Page" id="ph-1" />);
    expect(screen.getByTestId("header")).toHaveAttribute("id", "ph-1");
  });
});
