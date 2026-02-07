import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "../components/avatar";

describe("Avatar", () => {
  it("renders as a div element", () => {
    render(<Avatar data-testid="avatar">Content</Avatar>);
    expect(screen.getByTestId("avatar").tagName).toBe("DIV");
  });

  it("renders children", () => {
    render(<Avatar>AB</Avatar>);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<Avatar data-testid="avatar">A</Avatar>);
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveClass(
      "relative",
      "flex",
      "h-10",
      "w-10",
      "shrink-0",
      "overflow-hidden",
      "rounded-full",
    );
  });

  it("merges custom className", () => {
    render(
      <Avatar data-testid="avatar" className="h-16 w-16">
        A
      </Avatar>,
    );
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveClass("h-16", "w-16");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Avatar ref={ref}>A</Avatar>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional props", () => {
    render(
      <Avatar data-testid="avatar" id="my-avatar">
        A
      </Avatar>,
    );
    expect(screen.getByTestId("avatar")).toHaveAttribute("id", "my-avatar");
  });
});

describe("AvatarImage", () => {
  it("renders as an img element", () => {
    render(<AvatarImage data-testid="img" alt="User" src="/photo.jpg" />);
    expect(screen.getByTestId("img").tagName).toBe("IMG");
  });

  it("passes alt attribute", () => {
    render(<AvatarImage alt="User avatar" src="/photo.jpg" />);
    expect(screen.getByAltText("User avatar")).toBeInTheDocument();
  });

  it("passes src attribute", () => {
    render(<AvatarImage data-testid="img" alt="User" src="/photo.jpg" />);
    expect(screen.getByTestId("img")).toHaveAttribute("src", "/photo.jpg");
  });

  it("applies default classes", () => {
    render(<AvatarImage data-testid="img" alt="User" src="/photo.jpg" />);
    expect(screen.getByTestId("img")).toHaveClass(
      "aspect-square",
      "h-full",
      "w-full",
      "object-cover",
    );
  });

  it("merges custom className", () => {
    render(
      <AvatarImage
        data-testid="img"
        alt="User"
        src="/photo.jpg"
        className="opacity-50"
      />,
    );
    expect(screen.getByTestId("img")).toHaveClass("opacity-50");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLImageElement>();
    render(<AvatarImage ref={ref} alt="User" src="/photo.jpg" />);
    expect(ref.current).toBeInstanceOf(HTMLImageElement);
  });
});

describe("AvatarFallback", () => {
  it("renders as a div element", () => {
    render(<AvatarFallback data-testid="fallback">JD</AvatarFallback>);
    expect(screen.getByTestId("fallback").tagName).toBe("DIV");
  });

  it("renders children (initials)", () => {
    render(<AvatarFallback>JD</AvatarFallback>);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<AvatarFallback data-testid="fallback">JD</AvatarFallback>);
    const fb = screen.getByTestId("fallback");
    expect(fb).toHaveClass(
      "flex",
      "h-full",
      "w-full",
      "items-center",
      "justify-center",
      "rounded-full",
    );
  });

  it("merges custom className", () => {
    render(
      <AvatarFallback data-testid="fallback" className="bg-red-500">
        JD
      </AvatarFallback>,
    );
    expect(screen.getByTestId("fallback")).toHaveClass("bg-red-500");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AvatarFallback ref={ref}>JD</AvatarFallback>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Avatar composition", () => {
  it("renders Avatar with fallback when no image", () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("renders Avatar with image", () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarImage alt="Test User" src="/test.jpg" />
      </Avatar>,
    );
    expect(screen.getByAltText("Test User")).toBeInTheDocument();
  });
});
