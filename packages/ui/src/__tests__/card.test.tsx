import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("rounded-2xl", "border", "shadow-soft");
  });

  it("merges custom className", () => {
    render(
      <Card data-testid="card" className="my-custom">
        Content
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("my-custom");
    expect(card).toHaveClass("rounded-2xl");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Content</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional props", () => {
    render(
      <Card data-testid="card" id="my-card">
        Content
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveAttribute("id", "my-card");
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    expect(screen.getByTestId("header")).toHaveClass("flex", "flex-col", "p-6");
  });

  it("merges custom className", () => {
    render(
      <CardHeader data-testid="header" className="my-class">
        Header
      </CardHeader>,
    );
    expect(screen.getByTestId("header")).toHaveClass("my-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardTitle", () => {
  it("renders as h3 element", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText("Title").tagName).toBe("H3");
  });

  it("applies default classes", () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    expect(screen.getByTestId("title")).toHaveClass("text-xl", "font-semibold");
  });

  it("merges custom className", () => {
    render(
      <CardTitle data-testid="title" className="extra">
        Title
      </CardTitle>,
    );
    expect(screen.getByTestId("title")).toHaveClass("extra");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe("CardDescription", () => {
  it("renders as p element", () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText("Description").tagName).toBe("P");
  });

  it("applies default classes", () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    expect(screen.getByTestId("desc")).toHaveClass("text-sm");
  });

  it("merges custom className", () => {
    render(
      <CardDescription data-testid="desc" className="extra">
        Description
      </CardDescription>,
    );
    expect(screen.getByTestId("desc")).toHaveClass("extra");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<CardDescription ref={ref}>Desc</CardDescription>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent>Content area</CardContent>);
    expect(screen.getByText("Content area")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    expect(screen.getByTestId("content")).toHaveClass("p-6", "pt-0");
  });

  it("merges custom className", () => {
    render(
      <CardContent data-testid="content" className="extra">
        Content
      </CardContent>,
    );
    expect(screen.getByTestId("content")).toHaveClass("extra");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardFooter", () => {
  it("renders children", () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    expect(screen.getByTestId("footer")).toHaveClass(
      "flex",
      "items-center",
      "p-6",
      "pt-0",
    );
  });

  it("merges custom className", () => {
    render(
      <CardFooter data-testid="footer" className="extra">
        Footer
      </CardFooter>,
    );
    expect(screen.getByTestId("footer")).toHaveClass("extra");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Card composition", () => {
  it("renders a full card with all sub-components", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>My Title</CardTitle>
          <CardDescription>My Description</CardDescription>
        </CardHeader>
        <CardContent>Body text</CardContent>
        <CardFooter>Footer text</CardFooter>
      </Card>,
    );

    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("My Description")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
    expect(screen.getByText("Footer text")).toBeInTheDocument();
  });
});
