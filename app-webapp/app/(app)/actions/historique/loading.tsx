import { SkeletonMetricRow, SkeletonTable, SkeletonCard } from "@praedixa/ui";

export default function ActionsHistoriqueLoading() {
  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <div className="h-5 w-32 animate-shimmer-pearl rounded-md" />
        <div className="h-8 w-64 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-96 animate-shimmer rounded-md" />
      </div>
      <SkeletonMetricRow />
      <SkeletonCard className="h-20" />
      <SkeletonTable rows={12} columns={7} />
    </div>
  );
}
