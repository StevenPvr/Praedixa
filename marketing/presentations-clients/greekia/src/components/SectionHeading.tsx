import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  highlighted?: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
}

export function SectionHeading({
  eyebrow,
  title,
  highlighted,
  description,
  align = "left",
  tone = "light",
}: SectionHeadingProps) {
  return (
    <div
      className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}
    >
      <p
        className={cn(
          "mb-5 font-mono text-[11px] uppercase tracking-[0.22em]",
          tone === "light" ? "text-oxide" : "text-oxide-soft",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "text-balance font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl",
          tone === "light" ? "text-ink" : "text-white",
        )}
      >
        {title}
        {highlighted ? (
          <span
            className={cn(
              "block",
              tone === "light" ? "text-oxide" : "text-oxide-soft",
            )}
          >
            {highlighted}
          </span>
        ) : null}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 max-w-[65ch] text-base leading-relaxed sm:text-lg",
            tone === "light" ? "text-muted-foreground" : "text-limestone/74",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
