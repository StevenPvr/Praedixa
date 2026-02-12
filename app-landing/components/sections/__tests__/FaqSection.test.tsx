import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
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

describe("FaqSection", () => {
  it("renders section and category headings", () => {
    const { container } = render(<FaqSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "faq");

    for (const category of faqCategories) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
  });

  it("renders all questions and answers", () => {
    render(<FaqSection />);

    for (const item of landingFaq) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
      expect(screen.getByText(item.answer)).toBeInTheDocument();
    }
  });

  it("opens a FAQ item when summary is clicked", () => {
    render(<FaqSection />);

    const firstQuestion = screen.getByText(landingFaq[0].question);
    fireEvent.click(firstQuestion);

    expect(firstQuestion.closest("details")).toHaveAttribute("open");
  });

  it("renders CTA to pilot page", () => {
    render(<FaqSection />);
    const cta = screen.getByText("Rejoindre la cohorte pilote").closest("a");
    expect(cta).toHaveAttribute("href", "/devenir-pilote");
  });
});
