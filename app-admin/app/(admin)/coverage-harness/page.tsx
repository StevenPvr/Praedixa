import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

export default function CoverageHarnessPage() {
  const endpointCount = Object.keys(ADMIN_ENDPOINTS).length;

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-bold text-ink">
        Coverage Harness Admin
      </h1>
      <p className="text-sm text-ink-tertiary">
        Internal test-only page for E2E coverage hooks.
      </p>
      <div className="rounded-lg border border-border-subtle bg-card p-4 shadow-soft">
        <p className="text-sm text-charcoal">
          Endpoints count: <span id="endpoints-count">{endpointCount}</span>
        </p>
        <p className="text-sm text-charcoal">
          Sample endpoint:{" "}
          <span id="endpoint-sample">{ADMIN_ENDPOINTS.platformKPIs}</span>
        </p>
      </div>
    </div>
  );
}
