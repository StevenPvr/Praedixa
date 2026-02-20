import type { DemoSettingsPayload } from "@/lib/demo/types";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoSettingsViewProps {
  copy: Dictionary["demo"];
  payload: DemoSettingsPayload;
}

export function DemoSettingsView({ copy, payload }: DemoSettingsViewProps) {
  return (
    <section
      aria-labelledby="demo-governance-title"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
    >
      <h2
        id="demo-governance-title"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
      >
        {copy.sections.governance}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {payload.governance.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-white/10 bg-black/20 p-4"
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-blue-100/75">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
