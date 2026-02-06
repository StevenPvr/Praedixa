import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../test-utils/mocks/framer-motion");
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

// Mock all section components to isolate the page test
vi.mock("../../components", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
  Footer: () => <footer data-testid="footer">Footer</footer>,
  HeroSection: () => <section data-testid="hero-section">Hero</section>,
  TrustBand: () => <section data-testid="trust-band">TrustBand</section>,
  ProblemSection: () => (
    <section data-testid="problem-section">Problem</section>
  ),
  SolutionSection: () => (
    <section data-testid="solution-section">Solution</section>
  ),
  PipelineSection: () => (
    <section data-testid="pipeline-section">Pipeline</section>
  ),
  DeliverablesSection: () => (
    <section data-testid="deliverables-section">Deliverables</section>
  ),
  PilotSection: () => <section data-testid="pilot-section">Pilot</section>,
  FaqSection: () => <section data-testid="faq-section">FAQ</section>,
  ContactSection: () => (
    <section data-testid="contact-section">Contact</section>
  ),
}));

vi.mock("../../components/sections/SolutionSection", () => ({
  SolutionSection: () => (
    <section data-testid="solution-section">Solution</section>
  ),
}));

vi.mock("../../components/sections/FaqSection", () => ({
  FaqSection: () => <section data-testid="faq-section">FAQ</section>,
}));

vi.mock("../../components/sections/ContactSection", () => ({
  ContactSection: () => (
    <section data-testid="contact-section">Contact</section>
  ),
}));

vi.mock("../../components/sections/PilotSection", () => ({
  PilotSection: () => <section data-testid="pilot-section">Pilot</section>,
}));

vi.mock("../../components/sections/ProblemSection", () => ({
  ProblemSection: () => (
    <section data-testid="problem-section">Problem</section>
  ),
}));

vi.mock("../../components/sections/PipelineSection", () => ({
  PipelineSection: () => (
    <section data-testid="pipeline-section">Pipeline</section>
  ),
}));

vi.mock("../../components/sections/DeliverablesSection", () => ({
  DeliverablesSection: () => (
    <section data-testid="deliverables-section">Deliverables</section>
  ),
}));

vi.mock("../../components/layout/StickyMobileCTA", () => ({
  StickyMobileCTA: () => <div data-testid="sticky-cta">StickyCTA</div>,
}));

import LandingPage from "../page";

describe("LandingPage (app/page.tsx)", () => {
  it("should render without errors", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("should render the Navbar", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("should render the HeroSection", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
  });

  it("should render the TrustBand", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("trust-band")).toBeInTheDocument();
  });

  it("should render the SolutionSection", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("solution-section")).toBeInTheDocument();
  });

  it("should render the FaqSection", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("faq-section")).toBeInTheDocument();
  });

  it("should render the ContactSection", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("contact-section")).toBeInTheDocument();
  });

  it("should render the PilotSection", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("pilot-section")).toBeInTheDocument();
  });

  it("should render the Footer", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("should render the StickyMobileCTA", () => {
    render(<LandingPage />);
    expect(screen.getByTestId("sticky-cta")).toBeInTheDocument();
  });

  it("should render sections inside a main element", () => {
    const { container } = render(<LandingPage />);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(
      main?.querySelector('[data-testid="hero-section"]'),
    ).toBeInTheDocument();
  });
});
