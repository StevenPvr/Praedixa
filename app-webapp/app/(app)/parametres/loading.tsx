import { SkeletonCard } from "@praedixa/ui";

export default function ParametresLoading() {
  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-shimmer-pearl rounded-md" />
        <div className="h-4 w-72 animate-shimmer rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} pearl className="h-32" />
        ))}
      </div>
    </div>
  );
}
