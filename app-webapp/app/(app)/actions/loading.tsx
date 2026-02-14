import { SkeletonCard } from "@praedixa/ui";

export default function ActionsLoading() {
  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-80 animate-shimmer rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} pearl className="h-20" />
          ))}
        </div>
        <div className="lg:col-span-7">
          <SkeletonCard pearl className="h-96" />
        </div>
      </div>
    </div>
  );
}
