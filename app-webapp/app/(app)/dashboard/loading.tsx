import { SkeletonMetricRow, SkeletonChart, SkeletonCard } from "@praedixa/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-12 pb-12">
      <div className="space-y-2">
        <div className="h-5 w-32 animate-shimmer-pearl rounded-md" />
        <div className="h-8 w-72 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-96 animate-shimmer rounded-md" />
      </div>
      <SkeletonMetricRow />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <SkeletonChart />
          <SkeletonCard className="h-64" />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    </div>
  );
}
