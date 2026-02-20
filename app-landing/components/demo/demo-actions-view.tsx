import type { DemoActionsPayload } from "@/lib/demo/types";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoActionsViewProps {
  copy: Dictionary["demo"];
  payload: DemoActionsPayload;
}

function statusClassName(status: "planned" | "in_progress" | "completed") {
  if (status === "completed") {
    return "border-emerald-300/45 bg-emerald-500/15 text-emerald-100";
  }
  if (status === "in_progress") {
    return "border-blue-300/45 bg-blue-500/15 text-blue-100";
  }
  return "border-amber-300/45 bg-amber-500/15 text-amber-100";
}

export function DemoActionsView({ copy, payload }: DemoActionsViewProps) {
  return (
    <section
      aria-labelledby="demo-actions-title"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
    >
      <h2
        id="demo-actions-title"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
      >
        {copy.sections.decisions}
      </h2>
      <div className="mt-4 divide-y divide-white/10">
        {payload.actions.map((item) => (
          <article
            key={item.id}
            className="grid gap-3 py-3 lg:grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr] lg:items-center"
          >
            <div>
              <p className="text-sm font-medium text-white">{item.action}</p>
              <p className="mt-1 text-xs text-blue-100/65">
                {item.owner} · {item.site}
              </p>
            </div>
            <p className="text-xs text-blue-100/70">T-{item.dueInHours}h</p>
            <span
              className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClassName(item.status)}`}
            >
              {item.status}
            </span>
            <button
              type="button"
              className="inline-flex w-fit items-center rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/85 transition hover:border-blue-300/40 hover:text-white"
            >
              {copy.openAction}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
