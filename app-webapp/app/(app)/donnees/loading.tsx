import { SkeletonTable } from "@praedixa/ui";

export default function DonneesLoading() {
  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-80 animate-shimmer rounded-md" />
      </div>
      <SkeletonTable rows={10} columns={6} />
    </div>
  );
}
