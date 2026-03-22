import Image from "next/image";
import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";

interface HeroPulsorLogoRailProps {
  locale: Locale;
}

interface LogoItem {
  type: "logo";
  name: string;
  logo: string;
}

function getLogoItems(): LogoItem[] {
  return [
    {
      type: "logo",
      name: "EuraTechnologies",
      logo: "/partners/euratechnologies-logo-black.svg",
    },
  ];
}

function LogoItemCard({ item }: { item: LogoItem }) {
  return (
    <div className="flex h-[38px] items-center justify-center px-4">
      <Image
        src={item.logo}
        alt={item.name}
        width={120}
        height={34}
        className="h-[30px] w-auto object-contain opacity-60"
      />
    </div>
  );
}

export function HeroPulsorLogoRail({ locale }: HeroPulsorLogoRailProps) {
  const vp = getValuePropContent(locale);
  const caption =
    vp.heroLogoCaption ??
    (locale === "fr" ? "Ils nous font confiance" : "They trust us");
  const items = getLogoItems();

  return (
    <div className="w-full">
      {/* Divider */}
      <div
        className="mx-auto h-px max-w-[1320px]"
        style={{ background: "var(--hero-divider)" }}
        aria-hidden="true"
      />

      {/* Caption */}
      <p
        className="mt-8 text-center text-[16px] font-normal"
        style={{ color: "rgba(15,17,21,0.50)" }}
      >
        {caption}
      </p>

      {/* Logo row */}
      <div className="mx-auto mt-6 flex max-w-[1252px] flex-wrap items-center justify-center gap-x-14 gap-y-4 px-4 pb-6 sm:gap-x-16 lg:gap-x-[74px]">
        {items.map((item, i) => (
          <LogoItemCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
