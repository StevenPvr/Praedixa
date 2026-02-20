import { SkeletonCard, SkeletonTable } from "@praedixa/ui";

export default function LoadingPrevisionsModeles() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="h-24" />
      <SkeletonTable rows={8} columns={7} />
    </div>
  );
}
