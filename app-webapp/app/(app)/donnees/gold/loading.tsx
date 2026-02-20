import { SkeletonCard, SkeletonTable } from "@praedixa/ui";

export default function LoadingGoldExplorer() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-20" />
      <SkeletonTable rows={8} columns={8} />
    </div>
  );
}
