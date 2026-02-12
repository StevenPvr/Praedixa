import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

export default function CoverageHarnessPage() {
  const endpointCount = Object.keys(ADMIN_ENDPOINTS).length;

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-bold text-neutral-900">
        Coverage Harness Admin
      </h1>
      <p className="text-sm text-gray-500">
        Internal test-only page for E2E coverage hooks.
      </p>
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-soft">
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
