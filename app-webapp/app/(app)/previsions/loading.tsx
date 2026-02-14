import { SkeletonChart, SkeletonTable } from "@praedixa/ui";

export default function PrevisionsLoading() {
  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-80 animate-shimmer rounded-md" />
      </div>
      <SkeletonChart />
      <SkeletonTable rows={6} columns={5} />
    </div>
  );
}
