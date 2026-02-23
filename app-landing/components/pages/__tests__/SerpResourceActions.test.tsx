import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { trackEventMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../../../lib/analytics/events", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/analytics/events")
  >("../../../lib/analytics/events");

  return {
    ...actual,
    trackEvent: trackEventMock,
  };
});

import { SerpResourceActions } from "../SerpResourceActions";

describe("SerpResourceActions", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
  });

  const props = {
    locale: "fr" as const,
    slug: "cout-sous-couverture",
    query: "cout de la sous-couverture",
    intent: "Decision" as const,
    asset: {
      type: "calculateur" as const,
      title: "Calculateur du cout de l'inaction",
      description: "Modele multi-sites pour comparer cout d'attente et action.",
    },
    assetHref: "/fr/ressources/cout-sous-couverture/asset",
    pilotHref:
      "/fr/devenir-pilote?source=seo_resource&seo_slug=cout-sous-couverture&seo_query=cout",
    ctaLabel: "Calculer le cout de l'inaction",
  };

  it("renders pilot and asset links", () => {
    render(<SerpResourceActions {...props} />);

    const pilotLink = screen.getByText(props.ctaLabel).closest("a");
    const assetLink = screen.getByText(/Telecharger asset/i).closest("a");

    expect(pilotLink).toHaveAttribute("href", props.pilotHref);
    expect(assetLink).toHaveAttribute("href", props.assetHref);
  });

  it("tracks click on pilot CTA", () => {
    render(<SerpResourceActions {...props} />);

    fireEvent.click(screen.getByText(props.ctaLabel));

    expect(trackEventMock).toHaveBeenCalledWith(
      "seo_resource_pilot_cta_click",
      expect.objectContaining({
        source: "seo_resource",
        locale: "fr",
        seo_slug: props.slug,
      }),
    );
  });

  it("tracks click on asset download", () => {
    render(<SerpResourceActions {...props} />);

    fireEvent.click(screen.getByText(/Telecharger asset/i));

    expect(trackEventMock).toHaveBeenCalledWith(
      "seo_resource_asset_download",
      expect.objectContaining({
        source: "seo_resource",
        locale: "fr",
        asset_type: "calculateur",
      }),
    );
  });
});
