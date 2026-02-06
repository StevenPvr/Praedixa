import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Alert, AlertTitle, AlertDescription } from "../components/alert";

describe("Alert", () => {
  it("renders children", () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByText("Alert content")).toBeInTheDocument();
  });

  it("has role=alert", () => {
    render(<Alert>Content</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Alert>Default</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-background", "text-foreground");
  });

  it("applies destructive variant classes", () => {
    render(<Alert variant="destructive">Error</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("text-destructive");
  });

  it("applies success variant classes", () => {
    render(<Alert variant="success">OK</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-green-50", "text-green-900");
  });

  it("applies warning variant classes", () => {
    render(<Alert variant="warning">Warn</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-yellow-50", "text-yellow-900");
  });

  it("applies info variant classes", () => {
    render(<Alert variant="info">Info</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-blue-50", "text-blue-900");
  });

  it("merges custom className", () => {
    render(<Alert className="extra">Content</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("extra");
    expect(alert).toHaveClass("rounded-lg");
  });

  it("applies base classes to all variants", () => {
    render(<Alert>Content</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass(
      "relative",
      "w-full",
      "rounded-lg",
      "border",
      "p-4",
    );
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Content</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional props", () => {
    render(
      <Alert id="my-alert" data-testid="alert">
        Content
      </Alert>,
    );
    expect(screen.getByTestId("alert")).toHaveAttribute("id", "my-alert");
  });
});

describe("AlertTitle", () => {
  it("renders as h5 element", () => {
    render(<AlertTitle data-testid="title">Title</AlertTitle>);
    expect(screen.getByTestId("title").tagName).toBe("H5");
  });

  it("renders children", () => {
    render(<AlertTitle>Warning Title</AlertTitle>);
    expect(screen.getByText("Warning Title")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<AlertTitle data-testid="title">Title</AlertTitle>);
    expect(screen.getByTestId("title")).toHaveClass(
      "mb-1",
      "font-medium",
      "leading-none",
      "tracking-tight",
    );
  });

  it("merges custom className", () => {
    render(
      <AlertTitle data-testid="title" className="extra">
        Title
      </AlertTitle>,
    );
    expect(screen.getByTestId("title")).toHaveClass("extra");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<AlertTitle ref={ref}>Title</AlertTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe("AlertDescription", () => {
  it("renders as div element", () => {
    render(<AlertDescription data-testid="desc">Description</AlertDescription>);
    expect(screen.getByTestId("desc").tagName).toBe("DIV");
  });

  it("renders children", () => {
    render(<AlertDescription>Some description</AlertDescription>);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<AlertDescription data-testid="desc">Description</AlertDescription>);
    expect(screen.getByTestId("desc")).toHaveClass("text-sm");
  });

  it("merges custom className", () => {
    render(
      <AlertDescription data-testid="desc" className="extra">
        Desc
      </AlertDescription>,
    );
    expect(screen.getByTestId("desc")).toHaveClass("extra");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<AlertDescription ref={ref}>Desc</AlertDescription>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Alert composition", () => {
  it("renders a full alert with title and description", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>,
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("text-destructive");
  });
});
