import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../../test-utils/mocks/framer-motion");
  return createFramerMotionMock();
});

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { FaqSection } from "../FaqSection";
import { landingFaq, faqCategories } from "../../../lib/content/landing-faq";
import * as faqContent from "../../../lib/content/landing-faq";

describe("FaqSection", () => {
  it("should render without errors", () => {
    const { container } = render(<FaqSection />);
    expect(container.querySelector("#faq")).toBeInTheDocument();
  });

  it("should have id=faq for anchor navigation", () => {
    const { container } = render(<FaqSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "faq");
  });

  it("should render the FAQ kicker text", () => {
    render(<FaqSection />);
    // The kicker is "FAQ" as inline text
    const kickers = screen.getAllByText("FAQ");
    expect(kickers.length).toBeGreaterThanOrEqual(1);
  });

  it("should render the section heading", () => {
    render(<FaqSection />);
    expect(
      screen.getByText("Questions frequentes sur Praedixa"),
    ).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<FaqSection />);
    expect(
      screen.getByText(/Dir. d'exploitation, responsable Ops ou DAF/),
    ).toBeInTheDocument();
  });

  it("should render all FAQ category headings", () => {
    render(<FaqSection />);
    for (const category of faqCategories) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
  });

  it("should render all FAQ questions", () => {
    render(<FaqSection />);
    for (const item of landingFaq) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it("should render FAQ answers (inside details elements)", () => {
    render(<FaqSection />);
    // Answers are inside <p> elements within <details>
    // They should exist in the DOM even when details are closed
    for (const item of landingFaq) {
      expect(screen.getByText(item.answer)).toBeInTheDocument();
    }
  });

  it("should open a FAQ item when clicked", () => {
    const { container } = render(<FaqSection />);
    const firstQuestion = landingFaq[0];
    const detailsElements = container.querySelectorAll("details");
    expect(detailsElements.length).toBe(landingFaq.length);

    // Click the first summary to open details
    const firstSummary = screen.getByText(firstQuestion.question);
    fireEvent.click(firstSummary);

    // The details element should now have the "open" attribute
    const firstDetails = firstSummary.closest("details");
    expect(firstDetails).toHaveAttribute("open");
  });

  it("should render the bottom CTA text", () => {
    render(<FaqSection />);
    expect(
      screen.getByText(/Une question qui n'est pas ici/),
    ).toBeInTheDocument();
  });

  it("should render the bottom CTA link pointing to /devenir-pilote", () => {
    render(<FaqSection />);
    const ctaLink = screen.getByText("Demander un diagnostic 48h").closest("a");
    expect(ctaLink).toHaveAttribute("href", "/devenir-pilote");
  });

  it("should accept a custom className", () => {
    const { container } = render(<FaqSection className="faq-test" />);
    expect(container.querySelector("section")).toHaveClass("faq-test");
  });

  it("should skip categories with no matching FAQ items", () => {
    // Temporarily add a category that has no items
    const originalCategories = [...faqCategories];
    const categoriesWithEmpty = [
      ...originalCategories,
      "Empty Category",
    ] as unknown as typeof faqCategories;
    // @ts-expect-error -- override readonly for test
    vi.spyOn(faqContent, "faqCategories", "get").mockReturnValue(
      categoriesWithEmpty,
    );

    render(<FaqSection />);
    // The "Empty Category" heading should NOT be rendered because items.length === 0
    expect(screen.queryByText("Empty Category")).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
