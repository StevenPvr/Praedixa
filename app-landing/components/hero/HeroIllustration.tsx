import Image from "next/image";
import { heroContent } from "../../lib/content/hero-content";

export function HeroIllustration() {
  return (
    <div className="mx-auto w-full">
      <Image
        src="/images/hero-dashboard.svg"
        alt={heroContent.illustrationAlt}
        width={680}
        height={460}
        className="h-auto w-full drop-shadow-2xl"
        priority
      />
    </div>
  );
}
