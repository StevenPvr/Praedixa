import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { CheckBadgeIcon, CloseBadgeIcon } from "../shared/icons/MarketingIcons";

function QualificationCard({
  title,
  items,
  dark = false,
}: {
  title: string;
  items: string[];
  dark?: boolean;
}) {
  const titleClassName = dark ? "text-amber-100" : "text-brass-700";
  const itemClassName = dark ? "text-neutral-200" : "text-neutral-700";
  const iconClassName = dark ? "text-neutral-200" : "text-amber-600";
  const Icon = dark ? CloseBadgeIcon : CheckBadgeIcon;

  return (
    <section
      className={`rounded-[1.7rem] border border-neutral-200/80 p-6 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.22)] ${
        dark ? "bg-neutral-950" : "bg-white/90"
      }`}
    >
      <h3
        className={`text-sm font-semibold uppercase tracking-[0.09em] ${titleClassName}`}
      >
        {title}
      </h3>
      <ul className="mt-4 list-none space-y-3 p-0">
        {items.map((item) => (
          <li
            key={item}
            className={`m-0 flex items-start gap-2.5 text-sm leading-relaxed ${itemClassName}`}
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${iconClassName}`} />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QualificationSection({ locale }: { locale: Locale }) {
  const valueProp = getValuePropContent(locale);

  return (
    <SectionShell
      id="qualification"
      className="bg-[linear-gradient(180deg,var(--warm-bg-panel)_0%,var(--warm-bg-muted)_100%)]"
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.02fr_0.98fr] md:gap-12">
        <div>
          <Kicker>{valueProp.qualificationTitle}</Kicker>
          <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
            {valueProp.promise}
          </h2>
          <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {valueProp.qualificationBody}
          </p>
          <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-neutral-600">
            {valueProp.mechanism}
          </p>
        </div>

        <div className="grid gap-4">
          <QualificationCard
            title={valueProp.fitTitle}
            items={valueProp.fitItems}
          />
          <QualificationCard
            title={valueProp.notFitTitle}
            items={valueProp.notFitItems}
            dark
          />
        </div>
      </div>
    </SectionShell>
  );
}
