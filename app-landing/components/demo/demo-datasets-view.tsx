import type { DemoDatasetsPayload, DemoStatus } from "@/lib/demo/types";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoDatasetsViewProps {
  copy: Dictionary["demo"];
  payload: DemoDatasetsPayload;
}

function statusClassName(status: DemoStatus) {
  if (status === "healthy") return "text-emerald-200";
  if (status === "degraded") return "text-amber-200";
  return "text-red-200";
}

export function DemoDatasetsView({ copy, payload }: DemoDatasetsViewProps) {
  return (
    <section
      aria-labelledby="demo-datasets-title"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
    >
      <h2
        id="demo-datasets-title"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
      >
        {copy.sections.datasetsHealth}
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-blue-100/65">
              <th className="px-3 py-2.5">Dataset</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Freshness</th>
              <th className="px-3 py-2.5">Records</th>
              <th className="px-3 py-2.5">Last sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {payload.datasets.map((dataset) => (
              <tr key={dataset.id} className="text-blue-50/92">
                <td className="px-3 py-2.5">{dataset.name}</td>
                <td
                  className={`px-3 py-2.5 font-semibold capitalize ${statusClassName(dataset.status)}`}
                >
                  {dataset.status}
                </td>
                <td className="px-3 py-2.5">{dataset.freshnessMinutes} min</td>
                <td className="px-3 py-2.5">
                  {dataset.records.toLocaleString()}
                </td>
                <td className="px-3 py-2.5">{dataset.lastSync}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
