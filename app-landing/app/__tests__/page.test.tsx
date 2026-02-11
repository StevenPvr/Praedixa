import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../testing/utils/mocks/framer-motion");
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

// Mock all section and layout components to isolate the page test
vi.mock("../../components/layout/Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("../../components/layout/Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("../../components/layout/StickyMobileCTA", () => ({
  StickyMobileCTA: () => <div data-testid="sticky-cta">StickyCTA</div>,
}));

vi.mock("../../components/sections/HeroSection", () => ({
  HeroSection: () => <section data-testid="hero-section">Hero</section>,
}));

vi.mock("../../components/sections/TrustBand", () => ({
  TrustBand: () => <section data-testid="trust-band">TrustBand</section>,
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

import LandingPage from "../page";

describe("LandingPage (app/page.tsx)", () => {
  it("should render without errors", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("should render the Navbar", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("should render the HeroSection", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
  });

  it("should render the TrustBand", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("trust-band")).toBeInTheDocument();
  });

  it("should render the SolutionSection", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("solution-section")).toBeInTheDocument();
  });

  it("should render the FaqSection", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("faq-section")).toBeInTheDocument();
  });

  it("should render the ContactSection", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("contact-section")).toBeInTheDocument();
  });

  it("should render the PilotSection", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("pilot-section")).toBeInTheDocument();
  });

  it("should render the Footer", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("should render the StickyMobileCTA", async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByTestId("sticky-cta")).toBeInTheDocument();
  });

  it("should render sections inside a main element", async () => {
    let container: HTMLElement;
    await act(async () => {
      ({ container } = render(<LandingPage />));
    });
    const main = container!.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(
      main?.querySelector('[data-testid="hero-section"]'),
    ).toBeInTheDocument();
  });
});
