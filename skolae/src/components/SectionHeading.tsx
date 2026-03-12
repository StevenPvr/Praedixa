import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  highlighted?: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  highlighted,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-oxide">
        {eyebrow}
      </p>
      <h2 className="text-balance font-display text-4xl tracking-tight text-ink sm:text-5xl lg:text-6xl">
        {title}
        {highlighted ? <span className="block text-oxide">{highlighted}</span> : null}
      </h2>
      {description ? (
        <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

