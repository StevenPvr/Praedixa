import type { Locale } from "../../lib/i18n/config";

interface GeoSummaryPanelProps {
  locale: Locale;
  summary: string;
  takeaways: readonly string[];
  eyebrow?: string;
  title?: string;
}

function normalizeTakeaways(takeaways: readonly string[]): string[] {
  const seen = new Set<string>();

  return takeaways
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0)
    .filter((item) => {
      const normalized = item.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .slice(0, 3);
}

export function GeoSummaryPanel({
  locale,
  summary,
  takeaways,
  eyebrow,
  title,
}: GeoSummaryPanelProps) {
  const visibleTakeaways = normalizeTakeaways(takeaways);

  return (
    <section className="mt-6 rounded-[1.65rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,246,236,0.92)_100%)] p-5 shadow-[0_20px_50px_-40px_rgba(120,87,18,0.3)] md:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700">
        {eyebrow ??
          (locale === "fr" ? "Résumé canonique" : "Canonical summary")}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
        {title ?? (locale === "fr" ? "En bref" : "At a glance")}
      </h2>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-neutral-700 md:text-[0.95rem]">
        {summary}
      </p>
      {visibleTakeaways.length ? (
        <ul className="mt-4 list-none space-y-2 p-0">
          {visibleTakeaways.map((item) => (
            <li
              key={item}
              className="m-0 flex items-start gap-2.5 text-sm leading-relaxed text-neutral-700"
            >
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
