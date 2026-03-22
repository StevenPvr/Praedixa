import Image from "next/image";
import type { Locale } from "../../lib/i18n/config";

interface TrustBarSectionProps {
  locale: Locale;
}

const COPY = {
  fr: {
    heading: "Ils nous font confiance",
  },
  en: {
    heading: "They trust us",
  },
} as const;

interface TrustItem {
  type: "logo";
  name: string;
  logo: string;
}

function getTrustItems(): TrustItem[] {
  return [
    {
      type: "logo",
      name: "EuraTechnologies",
      logo: "/partners/euratechnologies-logo-black.svg",
    },
  ];
}

function TrustItemCard({ item }: { item: TrustItem }) {
  return (
    <div className="flex h-16 w-52 shrink-0 items-center justify-center rounded-xl border border-v2-border-100 bg-surface-0 px-6">
      <Image
        src={item.logo}
        alt={item.name}
        width={160}
        height={40}
        className="h-8 w-auto object-contain"
      />
    </div>
  );
}

function MarqueeTrack({ items }: { items: TrustItem[] }) {
  return (
    <div className="trust-marquee-track flex gap-6">
      {items.map((item, i) => (
        <TrustItemCard key={`a-${i}`} item={item} />
      ))}
      {/* Duplicate for seamless loop */}
      {items.map((item, i) => (
        <TrustItemCard key={`b-${i}`} item={item} />
      ))}
    </div>
  );
}

export function TrustBarSection({ locale }: TrustBarSectionProps) {
  const t = COPY[locale];
  const items = getTrustItems();

  return (
    <section className="overflow-hidden border-b border-v2-border-100 bg-surface-50 py-10">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">
        {t.heading}
      </p>
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-surface-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-surface-50 to-transparent" />
        <MarqueeTrack items={items} />
      </div>
    </section>
  );
}
